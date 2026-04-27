import { z } from 'zod';

// Bun .env boş satırları "" olarak okur; zod'un .optional() sadece undefined
// bekler. Bu preprocess, boş string'i undefined'a çevirerek optional() doğru
// çalışmasını sağlar.
const emptyToUndef = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

// String env'i boolean'a çevir. z.coerce.boolean() KULLANMA — JS'te
// Boolean("false") === true olduğu için "false" string'i true olarak parse
// olur. Enum ile sınırla, transform sonrası boolean. Default 'false' string
// olmalı (boolean default inner enum'a giremez).
const boolFromEnv = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const normalized = v.trim().toLowerCase();
    return normalized === '' ? undefined : normalized;
  },
  z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
);

const EnvSchema = z.object({
  SUPABASE_DB_URL: z.string().url(),
  SUPABASE_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndef, z.string().optional()),
  GEMINI_API_KEY: z.string().min(10),
  RETRIEVAL_SHARED_SECRET: z.string().min(16),
  // Distinct from RETRIEVAL_SHARED_SECRET; required for /admin/* read-only
  // endpoints that power the Catalog Atelier UI. Keeping it separate means
  // rotating UI access never disturbs the Botpress bots.
  RETRIEVAL_ADMIN_SECRET: z.preprocess(emptyToUndef, z.string().min(16).optional()),
  PORT: z.coerce.number().int().default(8787),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Phase 1.1: business boost (rating × stock × featured) defaults to OFF.
  // Re-enable only when stock_status / is_featured / products.rating reflect
  // real signals — otherwise it constant-multiplies RRF and breaks ranking
  // explainability silently.
  BUSINESS_BOOST_ENABLED: boolFromEnv,
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
