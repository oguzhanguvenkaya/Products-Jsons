/**
 * POST /search/rank-by-spec — Universal numeric / rating ranker.
 *
 * Sıralanabilir 11 sortKey (objective specs + projected ratings)
 * üzerinden top-N. Backend tarafı `product_meta` EAV scalar key'lerini
 * okur — Phase 1.1'de specs.ratings.{durability,beading,self_cleaning}
 * de scalar key olarak projection ediliyor (project-specs-to-meta.ts),
 * bu sayede rating sıralaması da tek API yolundan akıyor.
 *
 * Phase 1.1 davranış kuralları:
 * - SQL iki branch (asc/desc) — dinamik direction interpolation YOK.
 * - `consumption_per_car_ml + direction='desc'` zod schema seviyesinde
 *   reddedilir (RankBySpecInputSchema.superRefine).
 * - `totalCandidates` ve `coverageTotal` AYRI count query'leriyle —
 *   sıfır sonuçta da doğru rakam gelir (`COUNT(*) OVER ()` boş row'da
 *   hiç dönmediği için kullanılmaz).
 * - Selective coverageNote: yalnızca düşük/değişken kapsamlı key'lerde
 *   uyarı döner (rating_*, durability_km, cut_level,
 *   consumption_per_car_ml, capacity_usable_ml). volume_ml /
 *   durability_months / weight_g / capacity_ml gibi yüksek kapsamlılarda
 *   `coverageNote: null` (gürültü yapma).
 * - Marka adı hardcode YOK; cümlede yalnızca dinamik sayı geçer.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sql } from '../lib/db.ts';
import {
  RankBySpecInputSchema,
  RankBySpecResultSchema,
  type RankedProduct,
} from '../types.ts';
import { formatPriceTL, hasRenderableUrl } from '../lib/formatters.ts';

type AppVariables = { requestId: string };

export const rankBySpecRoutes = new Hono<{ Variables: AppVariables }>();

/**
 * Birim eki — kullanıcı metnindeki "48 ay", "1000 ml", "5/10" gibi
 * sunum için sortKey'e göre sabit. Bot tarafı doğrudan kullanır.
 */
function getUnitLabel(sortKey: string): string {
  if (sortKey.includes('months')) return ' ay';
  if (sortKey.includes('km')) return ' km';
  if (sortKey === 'weight_g') return ' g';
  if (sortKey.includes('ml')) return ' ml';
  if (sortKey === 'cut_level') return '/10';
  if (sortKey.startsWith('rating_')) return ' puan';
  return '';
}

/**
 * coverageNote — sadece kapsamı sınırlı / dinamik değişebilen key'ler
 * için cümle döner. Yüksek kapsamlı key'ler `null` ile dönüp gürültü
 * yaratmaz. Marka adı ezberlenmez; rakamlar her sorguda tazedir.
 */
function buildCoverageNote(
  sortKey: string,
  totalCandidates: number,
  coverageTotal: number,
): string | null {
  if (sortKey.startsWith('rating_')) {
    const subKey = sortKey.slice('rating_'.length);
    return `Not: ${subKey} puanı sadece ${coverageTotal} üründe mevcut. Filtre kapsamında ${totalCandidates} aday bulundu.`;
  }
  if (
    sortKey === 'durability_km' ||
    sortKey === 'cut_level' ||
    sortKey === 'consumption_per_car_ml' ||
    sortKey === 'capacity_usable_ml'
  ) {
    return `Not: Bu metrik katalogdaki ${coverageTotal} üründe girilmiştir. Filtre kapsamında ${totalCandidates} ürün listelendi.`;
  }
  // durability_months, volume_ml, weight_g, capacity_ml → coverage yüksek, not yok
  return null;
}

interface RankRow {
  sku: string;
  name: string;
  brand: string | null;
  price: string | number | null;
  url: string | null;
  image_url: string | null;
  rank_value: string | number | null;
}

function toNumberOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

rankBySpecRoutes.post(
  '/search/rank-by-spec',
  zValidator('json', RankBySpecInputSchema),
  async (c) => {
    const {
      sortKey,
      direction,
      templateGroup,
      templateSubType,
      brand,
      minValue,
      maxValue,
      limit,
    } = c.req.valid('json');

    // İki SQL branch (asc/desc) — dinamik ORDER BY direction
    // interpolation kullanılmıyor. Filtreler search-price.ts pattern'iyle
    // aynı: null short-circuit ile her parametre opsiyonel.
    const rankedQuery =
      direction === 'asc'
        ? sql<RankRow[]>`
            SELECT p.sku, p.name, p.brand, p.price, p.url, p.image_url,
                   pm.value_numeric AS rank_value
            FROM products p
            JOIN product_meta pm ON pm.sku = p.sku
            WHERE pm.key = ${sortKey}
              AND pm.value_numeric IS NOT NULL
              AND p.price > 0
              AND (${templateGroup ?? null}::text IS NULL OR p.template_group = ${templateGroup ?? null})
              AND (${templateSubType ?? null}::text IS NULL OR p.template_sub_type = ${templateSubType ?? null})
              AND (${brand ?? null}::text IS NULL OR p.brand = ${brand ?? null})
              AND (${minValue ?? null}::numeric IS NULL OR pm.value_numeric >= ${minValue ?? null})
              AND (${maxValue ?? null}::numeric IS NULL OR pm.value_numeric <= ${maxValue ?? null})
            ORDER BY pm.value_numeric ASC NULLS LAST, p.sku ASC
            LIMIT ${limit}
          `
        : sql<RankRow[]>`
            SELECT p.sku, p.name, p.brand, p.price, p.url, p.image_url,
                   pm.value_numeric AS rank_value
            FROM products p
            JOIN product_meta pm ON pm.sku = p.sku
            WHERE pm.key = ${sortKey}
              AND pm.value_numeric IS NOT NULL
              AND p.price > 0
              AND (${templateGroup ?? null}::text IS NULL OR p.template_group = ${templateGroup ?? null})
              AND (${templateSubType ?? null}::text IS NULL OR p.template_sub_type = ${templateSubType ?? null})
              AND (${brand ?? null}::text IS NULL OR p.brand = ${brand ?? null})
              AND (${minValue ?? null}::numeric IS NULL OR pm.value_numeric >= ${minValue ?? null})
              AND (${maxValue ?? null}::numeric IS NULL OR pm.value_numeric <= ${maxValue ?? null})
            ORDER BY pm.value_numeric DESC NULLS LAST, p.sku ASC
            LIMIT ${limit}
          `;

    // totalCandidates: aktif filtrelerle kaç ürün listelenebilir.
    // COUNT(*) OVER () kullanmıyoruz — sıfır sonuçta hiç row dönmez,
    // count da yok. Bu yüzden ayrı filtered count.
    const totalCandidatesQuery = sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM products p
      JOIN product_meta pm ON pm.sku = p.sku
      WHERE pm.key = ${sortKey}
        AND pm.value_numeric IS NOT NULL
        AND p.price > 0
        AND (${templateGroup ?? null}::text IS NULL OR p.template_group = ${templateGroup ?? null})
        AND (${templateSubType ?? null}::text IS NULL OR p.template_sub_type = ${templateSubType ?? null})
        AND (${brand ?? null}::text IS NULL OR p.brand = ${brand ?? null})
        AND (${minValue ?? null}::numeric IS NULL OR pm.value_numeric >= ${minValue ?? null})
        AND (${maxValue ?? null}::numeric IS NULL OR pm.value_numeric <= ${maxValue ?? null})
    `;

    // coverageTotal: bu sortKey için DB genelinde kaç üründe değer var.
    // Filtre-bağımsız → coverageNote'un anlamlı olması için.
    const coverageQuery = sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM product_meta
      WHERE key = ${sortKey} AND value_numeric IS NOT NULL
    `;

    const [rows, totalRow, coverageRow] = await Promise.all([
      rankedQuery,
      totalCandidatesQuery,
      coverageQuery,
    ]);

    const totalCandidates = totalRow[0]?.count ?? 0;
    const coverageTotal = coverageRow[0]?.count ?? 0;
    const unit = getUnitLabel(sortKey);

    const rankedProducts: RankedProduct[] = rows.map((r) => {
      const price = toNumberOrNull(r.price) ?? 0;
      const rankValue = toNumberOrNull(r.rank_value) ?? 0;
      const url = (r.url ?? '').trim();
      const subtitle = `${r.brand ?? ''} • ${rankValue}${unit} • ${formatPriceTL(price)} TL`;

      return {
        sku: r.sku,
        productName: r.name,
        brand: r.brand ?? '',
        rankValue,
        price,
        url,
        imageUrl: r.image_url,
        carouselCard: {
          title: r.name,
          subtitle,
          imageUrl: r.image_url ?? undefined,
          actions: hasRenderableUrl(url)
            ? [{ action: 'url' as const, label: 'Ürün Sayfasına Git', value: url }]
            : [],
        },
      };
    });

    const coverageNote = buildCoverageNote(sortKey, totalCandidates, coverageTotal);

    const result = RankBySpecResultSchema.parse({
      sortKey,
      direction,
      unit,
      rankedProducts,
      totalCandidates,
      coverageTotal,
      coverageNote,
    });

    return c.json(result);
  },
);
