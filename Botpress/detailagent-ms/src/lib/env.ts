/**
 * env.ts — Runtime environment validation for the retrieval HTTP client.
 *
 * Botpress runtime secrets typed-proxy üzerinden okunur (Phase 1.1.14B.9):
 * `import { secrets } from '@botpress/runtime'`. Local `adk dev` .env'den,
 * cloud deploy `adk secret:set` değerlerinden doldurur (process.env DEĞİL).
 *
 * Eksik/kısa RETRIEVAL_SHARED_SECRET fails fast — bot anonymous request
 * göndermez.
 */

import { secrets, z } from '@botpress/runtime';

const EnvSchema = z.object({
  RETRIEVAL_SERVICE_URL: z.string().url(),
  RETRIEVAL_SHARED_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = EnvSchema.parse({
      RETRIEVAL_SERVICE_URL: secrets.RETRIEVAL_SERVICE_URL,
      RETRIEVAL_SHARED_SECRET: secrets.RETRIEVAL_SHARED_SECRET,
    });
  }
  return cached;
}
