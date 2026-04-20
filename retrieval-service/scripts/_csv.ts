import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CSV_ROOT = join(
  import.meta.dir,
  '..',
  '..',
  'data',
  'csv',
);

export function readCsv<T = Record<string, string>>(filename: string): T[] {
  const path = join(CSV_ROOT, filename);
  const raw = readFileSync(path, 'utf-8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: false,
    relax_quotes: true,
    bom: true,
  }) as T[];
}

export function splitList(value: string | null | undefined, sep = ','): string[] {
  if (!value) return [];
  return value
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function tryJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function coerceNumber(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function coerceBool(v: string | null | undefined): boolean | null {
  if (v === null || v === undefined || v === '') return null;
  const s = v.trim().toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return null;
}
