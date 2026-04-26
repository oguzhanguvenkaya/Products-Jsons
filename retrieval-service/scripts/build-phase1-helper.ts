// Phase 1 helper — paylaşılan "key VARSA drop" pattern'i
import type { sql as SqlT } from '../src/lib/db.ts';

export type Change = {
  id: string;
  scope: 'product.specs';
  sku: string;
  field: string;
  before: unknown;
  after: unknown;
  label: string;
};

export function makeDropChange(family: string, sku: string, key: string, before: unknown, label: string): Change {
  return {
    id: `phase1${family}-${sku}-${key}-drop`,
    scope: 'product.specs',
    sku,
    field: `specs.${key}`,
    before,
    after: null,
    label,
  };
}

export function makeSetChange(family: string, sku: string, key: string, before: unknown, after: unknown, label: string): Change {
  return {
    id: `phase1${family}-${sku}-${key}-set`,
    scope: 'product.specs',
    sku,
    field: `specs.${key}`,
    before,
    after,
    label,
  };
}
