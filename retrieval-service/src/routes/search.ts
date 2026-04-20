/**
 * POST /search — semantic product search.
 *
 * Phase 2 handler is thin: validate input, delegate to the
 * pure-vector core, return the mirrored bot contract. Phase 3
 * will keep the same route but upgrade the core to hybrid RRF.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SearchInputSchema } from '../types.ts';
import { searchPureVector } from '../lib/searchCore.ts';

type AppVariables = { requestId: string };

export const searchRoutes = new Hono<{ Variables: AppVariables }>();

searchRoutes.post(
  '/search',
  zValidator('json', SearchInputSchema),
  async (c) => {
    const input = c.req.valid('json');
    const result = await searchPureVector(input);
    return c.json(result);
  },
);
