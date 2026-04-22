/**
 * GET /admin/agents
 *   Lists the bot configurations the Prompt Lab can load. Presence is
 *   determined by the existence of a conversations/index.ts file under
 *   each Botpress/<bot>/ directory.
 *
 * GET /admin/agents/:name
 *   Returns the instruction text + basic metadata for a single bot.
 *   Read-only; Phase 4.9.9's staging write path lives elsewhere.
 *
 * Resolves paths against RETRIEVAL_AGENTS_ROOT if set; otherwise walks
 * up from this file to find a sibling Botpress/ directory. Never writes,
 * never allows path traversal (name whitelist + basename-only).
 */

import { Hono } from 'hono';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type AppVariables = { requestId: string };

export const adminAgentsRoutes = new Hono<{ Variables: AppVariables }>();

const KNOWN_AGENTS = [
  {
    name: 'detailagent-ms',
    description:
      'Active Botpress bot on microservice retrieval (Phase 4+). Canlı.',
  },
  {
    name: 'detailagent',
    description:
      'Frozen v9.2 bot on Botpress Tables. Parallel live fallback only.',
  },
] as const;

type AgentName = (typeof KNOWN_AGENTS)[number]['name'];

function isKnown(name: string): name is AgentName {
  return KNOWN_AGENTS.some((a) => a.name === name);
}

function findBotpressRoot(): string {
  const override = process.env.RETRIEVAL_AGENTS_ROOT;
  if (override) return resolve(override);
  // Walk from this source file up to repo root, then /Botpress
  const here = dirname(fileURLToPath(import.meta.url));
  let cur = here;
  for (let i = 0; i < 6; i++) {
    const candidate = join(cur, 'Botpress');
    if (existsSync(candidate)) return candidate;
    cur = dirname(cur);
  }
  throw new Error('Botpress root not found');
}

async function readInstruction(agent: AgentName) {
  const root = findBotpressRoot();
  const convPath = join(root, agent, 'src', 'conversations', 'index.ts');
  const agentJsonPath = join(root, agent, 'agent.json');

  const [conv, info] = await Promise.all([
    readFile(convPath, 'utf8').catch(() => null),
    readFile(agentJsonPath, 'utf8')
      .then((s) => JSON.parse(s))
      .catch(() => null),
    stat(convPath).catch(() => null),
  ]);

  const mtime = await stat(convPath)
    .then((s) => s.mtime.toISOString())
    .catch(() => null);

  return {
    conversationSource: conv,
    agentJson: info,
    conversationPath: convPath,
    lastModified: mtime,
  };
}

adminAgentsRoutes.get('/agents', async (c) => {
  const items = await Promise.all(
    KNOWN_AGENTS.map(async (a) => {
      try {
        const { agentJson, lastModified, conversationSource } =
          await readInstruction(a.name);
        return {
          name: a.name,
          description: a.description,
          deployed: !!agentJson?.botId,
          botId: agentJson?.botId ?? null,
          instructionBytes: conversationSource?.length ?? 0,
          lastModified,
          available: !!conversationSource,
        };
      } catch {
        return {
          name: a.name,
          description: a.description,
          deployed: false,
          botId: null,
          instructionBytes: 0,
          lastModified: null,
          available: false,
        };
      }
    }),
  );

  return c.json({ agents: items });
});

adminAgentsRoutes.get('/agents/:name', async (c) => {
  const name = c.req.param('name');
  if (!isKnown(name)) {
    return c.json(
      {
        error: 'unknown_agent',
        available: KNOWN_AGENTS.map((a) => a.name),
        request_id: c.get('requestId'),
      },
      404,
    );
  }

  const {
    conversationSource,
    agentJson,
    conversationPath,
    lastModified,
  } = await readInstruction(name);

  if (!conversationSource) {
    return c.json(
      {
        error: 'conversation_file_missing',
        sought: conversationPath,
        request_id: c.get('requestId'),
      },
      500,
    );
  }

  // Extract the Turkish/English instruction block between the BOT_NAME
  // marker and the @cardSchema / closing backtick. Fallback: full source.
  const tag = '## Rolün\n';
  const tagIdx = conversationSource.indexOf(tag);
  const closerIdx = conversationSource.indexOf('\n`,', tagIdx);
  const instruction =
    tagIdx >= 0 && closerIdx > tagIdx
      ? conversationSource.slice(tagIdx, closerIdx)
      : conversationSource;

  return c.json({
    name,
    botId: agentJson?.botId ?? null,
    lastModified,
    bytes: conversationSource.length,
    instructionBytes: instruction.length,
    instruction,
    source: conversationSource,
  });
});
