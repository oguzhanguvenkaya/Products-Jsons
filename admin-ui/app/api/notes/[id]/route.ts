import { NextResponse } from "next/server";
import { deleteNote, readNote, updateNote } from "@/lib/notes-store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const note = await readNote(id);
  if (!note) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }
  return NextResponse.json(note);
}

export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let patch: { title?: string; content?: string } = {};
  try {
    patch = (await request.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const note = await updateNote(id, patch);
  if (!note) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }
  return NextResponse.json(note);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await deleteNote(id);
  if (!ok) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id });
}
