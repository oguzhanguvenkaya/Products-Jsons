import { Hono } from 'hono';
import { env } from './lib/env.ts';
import { loggerMiddleware } from './middleware/logger.ts';
import { authMiddleware } from './middleware/auth.ts';
import { errorHandler } from './middleware/error.ts';
import { productsRoutes } from './routes/products.ts';
import { searchPriceRoutes } from './routes/search-price.ts';
import { searchRatingRoutes } from './routes/search-rating.ts';
import { searchRoutes } from './routes/search.ts';
import { faqRoutes } from './routes/faq.ts';

type AppVariables = {
  requestId: string;
};

const app = new Hono<{ Variables: AppVariables }>();

app.use('*', loggerMiddleware);
app.use('*', authMiddleware);

app.onError(errorHandler);

app.notFound((c) =>
  c.json(
    {
      error: 'not_found',
      path: c.req.path,
      method: c.req.method,
      request_id: c.get('requestId'),
    },
    404,
  ),
);

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    version: '0.1.0',
    request_id: c.get('requestId'),
  }),
);

app.route('/', productsRoutes);
app.route('/', searchPriceRoutes);
app.route('/', searchRatingRoutes);
app.route('/', searchRoutes);
app.route('/', faqRoutes);

const port = env.PORT;
console.log(
  JSON.stringify({
    t: new Date().toISOString(),
    level: 'info',
    message: `retrieval-service listening on :${port}`,
    log_level: env.LOG_LEVEL,
  }),
);

export default {
  port,
  fetch: app.fetch,
};
