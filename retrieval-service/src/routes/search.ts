/**
 * POST /search — semantic product search.
 *
 * Input schema carries a `mode` flag (default 'hybrid'). The core
 * router picks between the Phase 2 pure-vector baseline and the
 * Phase 3 hybrid pipeline. Both modes return the same mirror
 * contract so bot cutover in Phase 4 stays a drop-in.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SearchInputSchema } from '../types.ts';
import { search } from '../lib/searchCore.ts';

type AppVariables = { requestId: string };

export const searchRoutes = new Hono<{ Variables: AppVariables }>();

searchRoutes.post(
  '/search',
  zValidator('json', SearchInputSchema),
  async (c) => {
    const input = c.req.valid('json');
    const result = await search(input);
    return c.json(result);
  },
);
