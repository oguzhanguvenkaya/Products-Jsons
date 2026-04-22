/**
 * Thin HTTP client that talks to the retrieval-service /admin/* surface.
 *
 * - Runs on the server (RSC) and on the client. `RETRIEVAL_ADMIN_BASE_URL`
 *   and `RETRIEVAL_ADMIN_SECRET` live in `.env.local`; the client build
 *   never inlines the secret because these are read through a Next API
 *   route (/api/admin/[...path]) on the client side.
 * - Typed via generics; callers narrow the shape.
 */

const DEFAULT_BASE = "http://localhost:8787";

export type AdminFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  searchParams?: Record<string, string | number | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
};

function resolveBase(): string {
  // Server-side: use full env + /admin prefix. Client-side: always go through
  // /api proxy (which strips /admin and re-adds it upstream).
  if (typeof window === "undefined") {
    const root = process.env.RETRIEVAL_ADMIN_BASE_URL ?? DEFAULT_BASE;
    return root.replace(/\/$/, "") + "/admin";
  }
  return "/api/admin";
}

function resolveSecret(): string | null {
  if (typeof window === "undefined") {
    return (
      process.env.RETRIEVAL_ADMIN_SECRET ??
      process.env.RETRIEVAL_SHARED_SECRET ??
      null
    );
  }
  return null;
}

function buildUrl(path: string, params?: AdminFetchOptions["searchParams"]) {
  const base = resolveBase();
  // Strip a leading /admin if caller included it — both prefixes are valid.
  const cleanPath = path.replace(/^\/admin\/?/, "/");
  const url = new URL(
    (base.endsWith("/") ? base.slice(0, -1) : base) + cleanPath,
    typeof window === "undefined" ? "http://local" : window.location.origin,
  );
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  // When running server-side we built against fake base http://local, strip it
  if (url.origin === "http://local") {
    return (
      (base.endsWith("/") ? base.slice(0, -1) : base) +
      url.pathname +
      url.search
    );
  }
  return url.toString();
}

export async function adminFetch<T>(
  path: string,
  options: AdminFetchOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.searchParams);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const secret = resolveSecret();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* ignore */
    }
    const err = new Error(
      `admin API ${res.status} on ${path}` +
        (detail ? `: ${JSON.stringify(detail)}` : ""),
    ) as Error & { status: number; detail: unknown };
    err.status = res.status;
    err.detail = detail;
    throw err;
  }

  return (await res.json()) as T;
}

/* ---------- Response shapes ---------- */

export type AdminTaxonomyResponse = {
  snapshot_at: string;
  total_products: number;
  total_groups: number;
  total_sub_types: number;
  groups: Array<{
    group: string;
    total: number;
    subs: Array<{ sub: string; count: number }>;
  }>;
};

export type AdminCoverageResponse = {
  snapshot_at: string;
  totalProducts: number;
  global: Array<{ key: string; productCount: number; coverage: number }>;
  groupDetail: null | {
    group: string;
    total: number;
    keys: Array<{ key: string; productCount: number; coverage: number }>;
  };
};

export type AdminProductListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: Array<{
    sku: string;
    name: string;
    baseName: string;
    brand: string | null;
    templateGroup: string | null;
    templateSubType: string | null;
    price: number | null;
    imageUrl: string | null;
    variantCount: number;
    faqCount: number;
    specsKeyCount: number;
  }>;
};

export type AdminProductDetailResponse = {
  product: {
    sku: string;
    name: string;
    baseName: string;
    brand: string | null;
    categories: {
      mainCat: string | null;
      subCat: string | null;
      subCat2: string | null;
    };
    templateGroup: string | null;
    templateSubType: string | null;
    targetSurface: string[] | null;
    price: number | null;
    rating: number | null;
    stockStatus: string | null;
    url: string | null;
    imageUrl: string | null;
    shortDescription: string | null;
    fullDescription: string | null;
    specs: Record<string, unknown> | null;
    sizes: unknown;
    variantSkus: string[];
    isFeatured: boolean;
    videoUrl: string | null;
    updatedAt: string | null;
  };
  faqs: Array<{
    id: number;
    sku: string | null;
    scope: string;
    brand: string | null;
    category: string | null;
    question: string;
    answer: string;
    createdAt: string | null;
  }>;
  relations: Array<{
    sourceSku: string;
    targetSku: string;
    relationType: string;
    confidence: number | null;
    targetName: string | null;
    targetBrand: string | null;
  }>;
  meta: Array<{
    key: string;
    valueText: string | null;
    valueNumeric: number | null;
    valueBoolean: boolean | null;
  }>;
  history: Array<{
    when: string;
    who: string;
    action: string;
    diff?: string;
  }>;
};

export type AdminAgentsResponse = {
  agents: Array<{
    name: string;
    description: string;
    deployed: boolean;
    botId: string | null;
    instructionBytes: number;
    lastModified: string | null;
    available: boolean;
  }>;
};

export type AdminAgentDetailResponse = {
  name: string;
  botId: string | null;
  lastModified: string | null;
  bytes: number;
  instructionBytes: number;
  instruction: string;
  source: string;
};
