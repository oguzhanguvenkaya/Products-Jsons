/**
 * env.ts — Runtime environment validation for the retrieval HTTP client.
 *
 * Parsed lazily on first access so that `bun`/ADK can populate
 * process.env from .env before the check runs. A missing or short
 * RETRIEVAL_SHARED_SECRET fails fast with a zod error — the bot
 * will refuse to start rather than issue anonymous requests.
 */

import { z } from '@botpress/runtime';

const EnvSchema = z.object({
  RETRIEVAL_SERVICE_URL: z.string().url(),
  RETRIEVAL_SHARED_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = EnvSchema.parse({
      RETRIEVAL_SERVICE_URL: process.env.RETRIEVAL_SERVICE_URL,
      RETRIEVAL_SHARED_SECRET: process.env.RETRIEVAL_SHARED_SECRET,
    });
  }
  return cached;
}
