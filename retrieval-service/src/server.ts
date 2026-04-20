import { Hono } from 'hono';
import { env } from './lib/env.ts';

const app = new Hono();

app.notFound((c) =>
  c.json(
    {
      error: 'not_found',
      path: c.req.path,
      method: c.req.method,
    },
    404,
  ),
);

const port = env.PORT;
console.log(`[retrieval-service] listening on :${port} (env=${env.LOG_LEVEL})`);

export default {
  port,
  fetch: app.fetch,
};
