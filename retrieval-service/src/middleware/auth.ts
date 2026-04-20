import type { MiddlewareHandler } from 'hono';
import { env } from '../lib/env.ts';

const OPEN_PATHS = new Set(['/health', '/metrics']);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  if (OPEN_PATHS.has(c.req.path)) {
    return next();
  }

  const header = c.req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());

  if (!match || !timingSafeEqual(match[1]!, env.RETRIEVAL_SHARED_SECRET)) {
    return c.json(
      {
        error: 'unauthorized',
        request_id: c.get('requestId'),
      },
      401,
    );
  }

  return next();
};
