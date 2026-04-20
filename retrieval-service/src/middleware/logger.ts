import type { MiddlewareHandler } from 'hono';

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? randomId();
  const start = performance.now();
  c.set('requestId', requestId);

  try {
    await next();
  } finally {
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    const logLine = {
      t: new Date().toISOString(),
      request_id: requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      latency_ms: latencyMs,
    };
    console.log(JSON.stringify(logLine));
  }
};
