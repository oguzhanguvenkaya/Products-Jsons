"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  X,
  Trash2,
  Loader2,
  Check,
  StickyNote,
  Pencil,
} from "lucide-react";
import { useUiStore } from "@/lib/stores/ui";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 600;

export function NotesPanel() {
  const open = useUiStore((s) => s.notesOpen);
  const close = useUiStore((s) => s.closeNotes);
  const activeId = useUiStore((s) => s.activeNoteId);
  const setActive = useUiStore((s) => s.setActiveNote);

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [loading, setLoading] = useState(false);

  const saveTimer = useRef<number | null>(null);

  /* ----- list load ----- */
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      const j = (await res.json()) as { notes: Note[] };
      setNotes(j.notes);
      // Auto-select first note if active is missing
      if (j.notes.length > 0 && !j.notes.find((n) => n.id === activeId)) {
        setActive(j.notes[0]!.id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeId, setActive]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  /* ----- active note load ----- */
  useEffect(() => {
    if (!activeId) {
      setActiveNote(null);
      setTitleDraft("");
      setContentDraft("");
      return;
    }
    const local = notes.find((n) => n.id === activeId);
    if (local) {
      setActiveNote(local);
      setTitleDraft(local.title);
      setContentDraft(local.content);
      setSave("idle");
      setEditingTitle(false);
    }
  }, [activeId, notes]);

  /* ----- debounced save ----- */
  const scheduleSave = useCallback(
    (title: string, content: string) => {
      if (!activeId) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSave("saving");
      saveTimer.current = window.setTimeout(async () => {
        try {
          const res = await fetch(`/api/notes/${encodeURIComponent(activeId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content }),
          });
          if (!res.ok) throw new Error(`${res.status}`);
          const next = (await res.json()) as Note;
          setNotes((prev) =>
            prev.map((n) => (n.id === next.id ? next : n)),
          );
          setSave("saved");
          window.setTimeout(
            () => setSave((s) => (s === "saved" ? "idle" : s)),
            1200,
          );
        } catch {
          setSave("error");
        }
      }, DEBOUNCE_MS);
    },
    [activeId],
  );

  function onTitleChange(v: string) {
    setTitleDraft(v);
    scheduleSave(v, contentDraft);
  }
  function onContentChange(v: string) {
    setContentDraft(v);
    scheduleSave(titleDraft, v);
  }

  async function createNew() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Yeni not" }),
    });
    const note = (await res.json()) as Note;
    setNotes((prev) => [note, ...prev]);
    setActive(note.id);
    setEditingTitle(true);
  }

  async function remove(id: string) {
    if (!confirm("Bu not silinsin mi?")) return;
    await fetch(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) setActive(null);
  }

  if (!open) return null;

  return (
    <aside
      aria-label="Notlar"
      className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-cream-50/80 backdrop-blur-sm"
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <StickyNote className="size-4 text-amber-600" aria-hidden />
          <h2 className="font-display text-sm text-stone-700">Notlar</h2>
          <span className="font-mono text-[10px] text-foreground-muted">
            {notes.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={createNew}
            aria-label="Yeni not"
            className="inline-flex size-7 items-center justify-center rounded text-sage-600 hover:bg-sage-500/10"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Notları kapat"
            className="inline-flex size-7 items-center justify-center rounded text-foreground-muted hover:bg-cream-200"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </header>

      {/* Note list */}
      <div className="max-h-44 overflow-y-auto border-b border-border">
        {loading && notes.length === 0 && (
          <div className="flex items-center gap-1 px-3 py-3 text-xs text-foreground-muted">
            <Loader2 className="size-3 animate-spin" aria-hidden /> Yükleniyor…
          </div>
        )}
        {!loading && notes.length === 0 && (
          <p className="px-3 py-4 text-xs text-foreground-muted">
            Henüz not yok. ＋ ile başla.
          </p>
        )}
        <ul>
          {notes.map((n) => {
            const isActive = n.id === activeId;
            return (
              <li key={n.id}>
                <div
                  className={cn(
                    "group flex items-center gap-2 px-3 py-1.5 text-sm",
                    isActive && "bg-terracotta-500/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActive(n.id)}
                    className="flex flex-1 flex-col items-start min-w-0 text-left"
                  >
                    <span
                      className={cn(
                        "truncate font-medium",
                        isActive ? "text-terracotta-700" : "text-stone-700",
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="font-mono text-[10px] text-foreground-muted">
                      {new Date(n.updatedAt).toLocaleString("tr-TR")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    aria-label="Sil"
                    className="opacity-0 inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-clay-red-500/10 hover:text-clay-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Editor */}
      {activeNote ? (
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            {editingTitle ? (
              <input
                value={titleDraft}
                onChange={(e) => onTitleChange(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape")
                    setEditingTitle(false);
                }}
                autoFocus
                className="flex-1 rounded border border-terracotta-500 bg-surface px-2 py-1 text-sm focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="group flex flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-cream-200"
                title="İsmi düzenle"
              >
                <span className="truncate text-sm font-medium text-stone-700">
                  {titleDraft}
                </span>
                <Pencil
                  className="size-3 text-foreground-muted opacity-0 group-hover:opacity-100"
                  aria-hidden
                />
              </button>
            )}
            <SaveIndicator state={save} />
          </div>

          <textarea
            value={contentDraft}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Bir şeyler yaz… otomatik kaydedilir."
            spellCheck={false}
            className="flex-1 resize-none border-0 bg-transparent px-3 py-3 font-mono text-[13px] leading-relaxed text-stone-700 placeholder:text-foreground-muted focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-3 text-center text-xs text-foreground-muted">
          Sol listeden bir not seç ya da ＋ ile yeni başlat.
        </div>
      )}

      <footer className="border-t border-border px-3 py-2 text-[10px] text-foreground-muted font-mono">
        admin-ui/.notes/ · gitignored · debounce {DEBOUNCE_MS}ms
      </footer>
    </aside>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle")
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-foreground-muted">
        kayıtlı
      </span>
    );
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-600">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        kaydediliyor
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-sage-600">
        <Check className="size-3" aria-hidden />
        kaydedildi
      </span>
    );
  return (
    <span className="font-mono text-[10px] text-clay-red-500">hata</span>
  );
}
