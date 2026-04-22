import type { MiddlewareHandler } from 'hono';
import { env } from '../lib/env.ts';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Protects /admin/* endpoints. Accepts the dedicated admin secret if set;
 * otherwise falls back to the shared secret so that single-operator dev
 * deployments keep working without extra config. Production must set
 * RETRIEVAL_ADMIN_SECRET separately.
 */
export const adminAuthMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    return c.json(
      { error: 'unauthorized', request_id: c.get('requestId') },
      401,
    );
  }

  const token = match[1]!;
  const adminOk =
    env.RETRIEVAL_ADMIN_SECRET !== undefined &&
    timingSafeEqual(token, env.RETRIEVAL_ADMIN_SECRET);
  const sharedOk =
    env.RETRIEVAL_ADMIN_SECRET === undefined &&
    timingSafeEqual(token, env.RETRIEVAL_SHARED_SECRET);

  if (!adminOk && !sharedOk) {
    return c.json(
      {
        error: 'unauthorized',
        hint: env.RETRIEVAL_ADMIN_SECRET
          ? 'admin endpoints require RETRIEVAL_ADMIN_SECRET'
          : 'set RETRIEVAL_ADMIN_SECRET for production admin access',
        request_id: c.get('requestId'),
      },
      401,
    );
  }

  return next();
};
