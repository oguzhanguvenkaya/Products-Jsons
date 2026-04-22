/**
 * GET /admin/tools
 *   Lists every Botpress tool the bots expose, returning the raw source
 *   plus a parsed summary (jsdoc + description string) so the Prompt Lab
 *   tool registry can render rich cards without re-parsing TS in the
 *   browser.
 *
 * GET /admin/tools/:name
 *   Single tool source — used by the deep-link drawer.
 *
 * Read-only. Files are loaded from
 *   Botpress/<bot>/src/tools/<file>.ts
 * and never written. The bot whitelist mirrors agents.ts.
 */

import { Hono } from 'hono';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type AppVariables = { requestId: string };

export const adminToolsRoutes = new Hono<{ Variables: AppVariables }>();

const KNOWN_BOTS = ['detailagent-ms', 'detailagent'] as const;
type BotName = (typeof KNOWN_BOTS)[number];

function findBotpressRoot(): string {
  const override = process.env.RETRIEVAL_AGENTS_ROOT;
  if (override) return resolve(override);
  const here = dirname(fileURLToPath(import.meta.url));
  let cur = here;
  for (let i = 0; i < 6; i++) {
    const candidate = join(cur, 'Botpress');
    if (existsSync(candidate)) return candidate;
    cur = dirname(cur);
  }
  throw new Error('Botpress root not found');
}

function toolsDir(bot: BotName): string {
  return join(findBotpressRoot(), bot, 'src', 'tools');
}

/** Parse the leading /** ... */ /// block immediately above the export. */
function extractJsdoc(source: string): string | null {
  const m = source.match(/\/\*\*([\s\S]*?)\*\/\s*export const/);
  if (!m) return null;
  return m[1]!
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trimEnd())
    .join('\n')
    .trim();
}

/** Extract the description: '...' value from the Tool config. Handles
 *  both single-quoted and template-string concatenations. */
function extractDescription(source: string): string | null {
  // First try single-quoted concatenation: description: 'a' + 'b' + 'c'
  const concatMatch = source.match(
    /description:\s*((?:["'][\s\S]*?["']\s*\+?\s*)+),?\n/,
  );
  if (concatMatch) {
    const raw = concatMatch[1]!;
    // Strip quotes and + operators
    return raw
      .replace(/['"]\s*\+\s*['"]/g, '')
      .replace(/^['"]|['"]$/g, '')
      .replace(/\\n/g, '\n')
      .trim();
  }
  return null;
}

/** Pulls the input schema raw block. */
function extractBlock(source: string, key: 'input' | 'output'): string | null {
  const startIdx = source.indexOf(`${key}: z.`);
  if (startIdx < 0) return null;
  // Walk balanced parens from the first '('
  let i = source.indexOf('(', startIdx);
  if (i < 0) return null;
  let depth = 0;
  let started = false;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(') {
      depth++;
      started = true;
    } else if (ch === ')') {
      depth--;
      if (started && depth === 0) {
        return source.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

type ToolMeta = {
  bot: BotName;
  name: string;
  filename: string;
  bytes: number;
  lastModified: string | null;
  jsdoc: string | null;
  description: string | null;
  inputSchema: string | null;
  outputSchema: string | null;
};

async function readToolFile(bot: BotName, filename: string): Promise<ToolMeta | null> {
  const path = join(toolsDir(bot), filename);
  try {
    const [src, info] = await Promise.all([
      readFile(path, 'utf8'),
      stat(path),
    ]);
    // Extract tool name from `export const <name> = new Autonomous.Tool({ name: '<name>'`
    const nameMatch = src.match(
      /export const (\w+) = new Autonomous\.Tool\(\{\s*name:\s*['"]([^'"]+)['"]/,
    );
    const exportedName = nameMatch?.[1] ?? filename.replace(/\.ts$/, '');
    const declaredName = nameMatch?.[2] ?? exportedName;
    return {
      bot,
      name: declaredName,
      filename,
      bytes: src.length,
      lastModified: info.mtime.toISOString(),
      jsdoc: extractJsdoc(src),
      description: extractDescription(src),
      inputSchema: extractBlock(src, 'input'),
      outputSchema: extractBlock(src, 'output'),
    };
  } catch {
    return null;
  }
}

async function listTools(bot: BotName): Promise<ToolMeta[]> {
  const dir = toolsDir(bot);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const files = entries.filter(
    (f) => f.endsWith('.ts') && !f.startsWith('index'),
  );
  const results = await Promise.all(files.map((f) => readToolFile(bot, f)));
  return results
    .filter((r): r is ToolMeta => r !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

adminToolsRoutes.get('/tools', async (c) => {
  const url = new URL(c.req.url);
  const botParam = url.searchParams.get('bot');
  const bots: BotName[] =
    botParam && KNOWN_BOTS.includes(botParam as BotName)
      ? [botParam as BotName]
      : ['detailagent-ms'];

  const sets = await Promise.all(bots.map((b) => listTools(b)));
  const flat = sets.flat();

  return c.json({
    bots,
    total: flat.length,
    tools: flat.map((t) => ({
      bot: t.bot,
      name: t.name,
      filename: t.filename,
      bytes: t.bytes,
      lastModified: t.lastModified,
      jsdoc: t.jsdoc,
      description: t.description,
      hasInputSchema: !!t.inputSchema,
      hasOutputSchema: !!t.outputSchema,
    })),
  });
});

adminToolsRoutes.get('/tools/:name', async (c) => {
  const name = c.req.param('name');
  const url = new URL(c.req.url);
  const bot = (url.searchParams.get('bot') as BotName) ?? 'detailagent-ms';

  if (!KNOWN_BOTS.includes(bot)) {
    return c.json(
      { error: 'unknown_bot', available: KNOWN_BOTS as unknown as string[] },
      404,
    );
  }

  const list = await listTools(bot);
  const tool = list.find((t) => t.name === name);
  if (!tool) {
    return c.json(
      { error: 'tool_not_found', name, available: list.map((t) => t.name) },
      404,
    );
  }

  // Re-read source for the full payload
  const fullPath = join(toolsDir(bot), tool.filename);
  const source = await readFile(fullPath, 'utf8');

  return c.json({
    bot,
    name: tool.name,
    filename: tool.filename,
    path: fullPath,
    bytes: tool.bytes,
    lastModified: tool.lastModified,
    jsdoc: tool.jsdoc,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    source,
  });
});
