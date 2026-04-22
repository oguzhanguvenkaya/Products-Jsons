import { NextResponse } from "next/server";
import { createNote, listNotes, NOTES_ROOT_PATH } from "@/lib/notes-store";

export async function GET() {
  const notes = await listNotes();
  return NextResponse.json({ notes, root: NOTES_ROOT_PATH });
}

export async function POST(request: Request) {
  let title: string | undefined;
  try {
    const body = (await request.json()) as { title?: string };
    title = body?.title;
  } catch {
    // No body — create with default title
  }
  const note = await createNote(title);
  return NextResponse.json(note);
}
