/**
 * retrieval-client.ts — HTTP client for the detailagent-retrieval microservice.
 *
 * Thin, generic wrapper: every method POSTs/GETs to a mirror endpoint and
 * returns the raw JSON. The bot's tool handlers type each response via a
 * generic parameter; Botpress' Autonomous.Tool output zod schema then
 * validates the shape at runtime before it reaches the LLM.
 *
 * Error policy (hard cutover):
 *   - 5s timeout (Phase 1.1: 3s ERROR'a sebep oluyordu cold Gemini
 *     embedding call'larında; warm p95 ~520ms, cold ~1s, edge
 *     cold ~2-3s — 5s güvenli üst sınır)
 *   - 4xx/5xx or network error  -> throw Error
 *   - No retry, no Botpress Tables fallback
 *   - Botpress runtime converts the thrown Error into a standard
 *     "Üzgünüm bir hata oluştu" response to the user
 */

import { getEnv } from './env.ts';

const DEFAULT_TIMEOUT_MS = 5_000;

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const env = getEnv();
  const url = `${env.RETRIEVAL_SERVICE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.RETRIEVAL_SHARED_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `retrieval-service ${method} ${path} failed: HTTP ${res.status} ${detail.slice(0, 200)}`,
    );
  }

  return (await res.json()) as T;
}

export class RetrievalClient {
  async search<T = unknown>(input: Record<string, unknown>): Promise<T> {
    return request<T>('POST', '/search', input);
  }

  async faq<T = unknown>(input: Record<string, unknown>): Promise<T> {
    return request<T>('POST', '/faq', input);
  }

  async getProduct<T = unknown>(sku: string): Promise<T> {
    return request<T>('GET', `/products/${encodeURIComponent(sku)}`);
  }

  async getGuide<T = unknown>(sku: string): Promise<T> {
    return request<T>('GET', `/products/${encodeURIComponent(sku)}/guide`);
  }

  async getRelated<T = unknown>(
    sku: string,
    relationType: string,
  ): Promise<T> {
    const qs = new URLSearchParams({ relationType });
    return request<T>(
      'GET',
      `/products/${encodeURIComponent(sku)}/related?${qs.toString()}`,
    );
  }

  async searchPrice<T = unknown>(input: Record<string, unknown>): Promise<T> {
    return request<T>('POST', '/search/price', input);
  }

  // Phase 1.1: searchByRating tamamen kaldırıldı; rating sıralaması da
  // rankBySpec(rating_durability/beading/self_cleaning) üzerinden akıyor.
  async rankBySpec<T = unknown>(input: Record<string, unknown>): Promise<T> {
    return request<T>('POST', '/search/rank-by-spec', input);
  }

  async health(): Promise<{ status: string; version?: string; request_id?: string }> {
    return request('GET', '/health');
  }
}

export const retrievalClient = new RetrievalClient();
