import { z } from 'zod';

// Bun .env boş satırları "" olarak okur; zod'un .optional() sadece undefined
// bekler. Bu preprocess, boş string'i undefined'a çevirerek optional() doğru
// çalışmasını sağlar.
const emptyToUndef = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const EnvSchema = z.object({
  SUPABASE_DB_URL: z.string().url(),
  SUPABASE_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndef, z.string().optional()),
  GEMINI_API_KEY: z.string().min(10),
  RETRIEVAL_SHARED_SECRET: z.preprocess(
    emptyToUndef,
    z.string().min(16).optional(),
  ),
  PORT: z.coerce.number().int().default(8787),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
