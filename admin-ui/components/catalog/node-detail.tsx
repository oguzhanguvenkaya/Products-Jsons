import type { TemplateGroup } from "@/lib/data/taxonomy";
import { NULL_HOTSPOTS, TOP_GROUPS } from "@/lib/data/snapshot";
import { ProductList } from "./product-list";

type Props = {
  taxonomy: TemplateGroup[];
  group: string | null;
  sub: string | null;
};

const FRAGMENTATION_BY_GROUP = Object.fromEntries(
  TOP_GROUPS.map((g) => [g.group, g]),
);

export function NodeDetail({ taxonomy, group, sub }: Props) {
  if (!group) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="text-sm text-foreground-muted">
          Soldan bir <span className="font-mono">template_group</span> seç.
        </div>
        <div className="mt-2 text-xs text-foreground-muted">
          Ağaç 26 grup · 165 sub_type · 511 ürün içerir.
        </div>
      </div>
    );
  }

  const g = taxonomy.find((x) => x.group === group);
  if (!g) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center text-sm text-clay-red-500">
        Bulunamadı: <code>{group}</code>
      </div>
    );
  }

  const frag = FRAGMENTATION_BY_GROUP[group];
  const hotspot =
    group === "ceramic_coating" ? NULL_HOTSPOTS.slice(0, 3) : [];

  if (sub) {
    const s = g.subs.find((x) => x.sub === sub);
    if (!s) {
      return (
        <div className="mx-auto max-w-xl px-6 py-16 text-center text-sm text-clay-red-500">
          sub_type bulunamadı: <code>{sub}</code>
        </div>
      );
    }
    return (
      <div className="px-6 py-8">
        <div className="mb-1 font-mono text-xs text-foreground-muted">
          {group} ›
        </div>
        <h2 className="font-display text-2xl text-stone-700">{sub}</h2>
        <div className="mt-2 text-sm text-foreground-muted">
          Bu sub_type altında <strong>{s.count}</strong> ürün bulunuyor.
        </div>

        <div className="mt-6">
          <ProductList group={group} sub={sub} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-1 font-mono text-xs text-foreground-muted">
        template_group
      </div>
      <h2 className="font-display text-2xl text-stone-700">{g.group}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Ürün
          </div>
          <div className="font-display text-xl text-stone-700">{g.total}</div>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Sub_type
          </div>
          <div className="font-display text-xl text-stone-700">
            {g.subs.length}
          </div>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Ürün / sub
          </div>
          <div className="font-display text-xl text-stone-700">
            {(g.total / g.subs.length).toFixed(1)}×
          </div>
          {frag && (
            <div
              className={`mt-0.5 text-[10px] ${
                frag.tone === "bad"
                  ? "text-clay-red-500"
                  : frag.tone === "mid"
                    ? "text-amber-600"
                    : "text-sage-600"
              }`}
            >
              {frag.note}
            </div>
          )}
        </div>
      </div>

      {hotspot.length > 0 && (
        <div className="mt-6 rounded-md border border-clay-red-500/30 bg-clay-red-500/5 p-4">
          <h3 className="text-sm font-medium text-stone-700">Null hotspot</h3>
          <ul className="mt-2 space-y-1 text-xs text-foreground-muted">
            {hotspot.map((h) => (
              <li key={h.key}>
                <span className="font-mono text-clay-red-500">{h.key}</span> — %
                {Math.round(h.coverage * 100)} dolu · {h.impact}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mt-8 text-sm font-medium text-stone-600">Sub_type dağılımı</h3>
      <table className="mt-2 w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-border py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
            >
              sub_type
            </th>
            <th
              scope="col"
              className="border-b border-border py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
            >
              ürün
            </th>
            <th
              scope="col"
              className="border-b border-border py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted"
            >
              % grup
            </th>
          </tr>
        </thead>
        <tbody>
          {g.subs.map((s) => {
            const pct = Math.round((s.count / g.total) * 100);
            return (
              <tr key={s.sub} className="hover:bg-cream-100">
                <td className="border-b border-border/50 py-1.5 font-mono text-sm text-stone-700">
                  {s.sub}
                </td>
                <td className="border-b border-border/50 py-1.5 text-right font-mono text-sm text-stone-700">
                  {s.count}
                </td>
                <td className="border-b border-border/50 py-1.5 text-right font-mono text-xs text-foreground-muted">
                  {pct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 className="mt-8 text-sm font-medium text-stone-600">
        Bu gruptaki ürünler
      </h3>
      <div className="mt-2">
        <ProductList group={g.group} />
      </div>
    </div>
  );
}
