import { GoogleGenAI } from '@google/genai';
import { env } from './env.ts';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = 'gemini-embedding-001';
export const EMBEDDING_VERSION = 'gemini-embedding-001-v1';
export const EMBEDDING_DIM = 768;

export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('embedText: empty input');
  }
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIM) {
    throw new Error(`embedText: unexpected dim ${values?.length}`);
  }
  return values;
}

export async function embedBatch(
  texts: string[],
  concurrency = 8,
): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= texts.length) return;
      let attempts = 0;
      while (true) {
        try {
          results[idx] = await embedText(texts[idx]!);
          break;
        } catch (err) {
          attempts++;
          if (attempts >= 3) throw err;
          await new Promise((r) => setTimeout(r, 1000 * attempts));
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

export function vectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
