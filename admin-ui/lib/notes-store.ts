/**
 * File-system note store.
 *
 * One JSON per note in <admin-ui>/.notes/<id>.json. .notes/ is gitignored.
 * Used only by the Next.js server (API routes) — never imported in the
 * client bundle.
 */

import { mkdir, readdir, readFile, stat, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const ROOT =
  process.env.NOTES_ROOT ?? resolve(process.cwd(), ".notes");

async function ensureDir() {
  if (!existsSync(ROOT)) await mkdir(ROOT, { recursive: true });
}

function pathFor(id: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("invalid_note_id");
  return join(ROOT, `${id}.json`);
}

function newId() {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function listNotes(): Promise<Note[]> {
  await ensureDir();
  const entries = await readdir(ROOT);
  const files = entries.filter((e) => e.endsWith(".json"));
  const notes = await Promise.all(
    files.map(async (f) => {
      try {
        const raw = await readFile(join(ROOT, f), "utf8");
        return JSON.parse(raw) as Note;
      } catch {
        return null;
      }
    }),
  );
  return notes
    .filter((n): n is Note => n !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readNote(id: string): Promise<Note | null> {
  await ensureDir();
  try {
    const raw = await readFile(pathFor(id), "utf8");
    return JSON.parse(raw) as Note;
  } catch {
    return null;
  }
}

export async function createNote(title?: string): Promise<Note> {
  await ensureDir();
  const now = new Date().toISOString();
  const note: Note = {
    id: newId(),
    title: title?.trim() || "İsimsiz not",
    content: "",
    createdAt: now,
    updatedAt: now,
  };
  await writeFile(pathFor(note.id), JSON.stringify(note, null, 2), "utf8");
  return note;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, "title" | "content">>,
): Promise<Note | null> {
  const existing = await readNote(id);
  if (!existing) return null;
  const next: Note = {
    ...existing,
    title:
      patch.title !== undefined ? patch.title.trim() || "İsimsiz not" : existing.title,
    content: patch.content !== undefined ? patch.content : existing.content,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(pathFor(id), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    await stat(pathFor(id));
    await unlink(pathFor(id));
    return true;
  } catch {
    return false;
  }
}

export const NOTES_ROOT_PATH = ROOT;
