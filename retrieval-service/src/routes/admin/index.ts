import { Hono } from 'hono';
import { adminAuthMiddleware } from '../../middleware/admin-auth.ts';
import { adminTaxonomyRoutes } from './taxonomy.ts';
import { adminCoverageRoutes } from './coverage.ts';
import { adminProductsRoutes } from './products.ts';
import { adminAgentsRoutes } from './agents.ts';
import { adminStagingRoutes } from './staging.ts';

type AppVariables = { requestId: string };

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.use('*', adminAuthMiddleware);

adminRoutes.get('/', (c) =>
  c.json({
    service: 'retrieval-admin',
    endpoints: [
      'GET /admin/taxonomy',
      'GET /admin/coverage?group=&limit=',
      'GET /admin/products?group=&sub=&brand=&q=&limit=&offset=',
      'GET /admin/products/:sku',
      'GET /admin/agents',
      'GET /admin/agents/:name',
      'POST /admin/staging/preview',
      'POST /admin/staging/commit',
    ],
  }),
);

adminRoutes.route('/', adminTaxonomyRoutes);
adminRoutes.route('/', adminCoverageRoutes);
adminRoutes.route('/', adminProductsRoutes);
adminRoutes.route('/', adminAgentsRoutes);
adminRoutes.route('/', adminStagingRoutes);
