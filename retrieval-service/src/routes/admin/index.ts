import { Hono } from 'hono';
import { adminAuthMiddleware } from '../../middleware/admin-auth.ts';
import { adminTaxonomyRoutes } from './taxonomy.ts';
import { adminCoverageRoutes } from './coverage.ts';
import { adminProductsRoutes } from './products.ts';
import { adminAgentsRoutes } from './agents.ts';
import { adminStagingRoutes } from './staging.ts';
import { adminFaqsRoutes } from './faqs.ts';
import { adminRelationsRoutes } from './relations.ts';
import { adminToolsRoutes } from './tools.ts';

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
      'GET /admin/audit/recent?limit=',
      'GET /admin/audit/by-sku/:sku',
      'GET /admin/faqs?sku=&scope=&brand=&category=&q=&limit=&offset=',
      'GET /admin/faqs/:id',
      'GET /admin/relations?sku=&relatedSku=&type=&limit=&offset=',
      'GET /admin/tools?bot=',
      'GET /admin/tools/:name?bot=',
    ],
  }),
);

adminRoutes.route('/', adminTaxonomyRoutes);
adminRoutes.route('/', adminCoverageRoutes);
adminRoutes.route('/', adminProductsRoutes);
adminRoutes.route('/', adminAgentsRoutes);
adminRoutes.route('/', adminStagingRoutes);
adminRoutes.route('/', adminFaqsRoutes);
adminRoutes.route('/', adminRelationsRoutes);
adminRoutes.route('/', adminToolsRoutes);
