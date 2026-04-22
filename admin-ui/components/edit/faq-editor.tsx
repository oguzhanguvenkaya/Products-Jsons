"use client";

import { useMemo, useState } from "react";
import {
  MessageCircleQuestion,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useStagingStore } from "@/lib/stores/staging";
import type { Faq } from "@/lib/data/sample-products";
import { cn } from "@/lib/utils";

type Props = {
  sku: string;
  faqs: Faq[];
};

const TONE: Record<NonNullable<Faq["confidence"]>, string> = {
  high: "text-sage-600 bg-sage-500/10",
  medium: "text-amber-600 bg-amber-500/10",
  low: "text-clay-red-500 bg-clay-red-500/10",
};

function newId() {
  return `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function FaqEditor({ sku, faqs }: Props) {
  const allChanges = useStagingStore((s) => s.changes);
  const pending = useMemo(
    () => allChanges.filter((c) => c.sku === sku && c.scope === "faq"),
    [allChanges, sku],
  );
  const stageChange = useStagingStore((s) => s.stageChange);
  const revertChange = useStagingStore((s) => s.revertChange);

  const view = mergeFaqViews(faqs, pending);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");

  function startEdit(faq: Faq) {
    setEditingId(faq.id);
    setDraftQ(faq.question);
    setDraftA(faq.answer);
  }
  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(original: Faq) {
    const q = draftQ.trim();
    const a = draftA.trim();
    if (!q || !a) return;
    if (q === original.question && a === original.answer) {
      setEditingId(null);
      return;
    }
    stageChange({
      sku,
      scope: "faq",
      field: `faq[${original.id}]`,
      before: original,
      after: { ...original, question: q, answer: a },
      label: `FAQ ${original.id}`,
    });
    setEditingId(null);
  }

  function stageDelete(faq: Faq) {
    if (!confirm(`FAQ'yi silmek istediğine emin misin?\n"${faq.question}"`)) return;
    stageChange({
      sku,
      scope: "faq",
      field: `faq[${faq.id}]`,
      before: faq,
      after: null,
      label: `FAQ ${faq.id} (delete)`,
    });
  }

  function addNew() {
    const id = newId();
    const blank: Faq = {
      id,
      question: "Yeni soru",
      answer: "Yeni cevap",
      scope: "product",
      confidence: "medium",
    };
    stageChange({
      sku,
      scope: "faq",
      field: `faq[${id}]`,
      before: null,
      after: blank,
      label: "Yeni FAQ",
    });
    startEdit(blank);
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-lg text-stone-700">
            {view.length} FAQ kaydı
          </h3>
          <p className="text-xs text-foreground-muted">
            Düzenleme/silme staging'e düşer; commit öncesi DB'ye yazılmaz.
          </p>
        </div>
        <button
          type="button"
          onClick={addNew}
          className="inline-flex items-center gap-1 rounded-md bg-sage-500/10 px-2.5 py-1 text-xs text-sage-700 hover:bg-sage-500/20"
        >
          <Plus className="size-3.5" aria-hidden /> Yeni FAQ
        </button>
      </div>

      {view.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Bu ürün için FAQ yok.
        </p>
      ) : (
        <ul className="space-y-3">
          {view.map(({ faq, state, changeId }) => {
            const editing = editingId === faq.id;
            return (
              <li
                key={faq.id}
                className={cn(
                  "rounded-md border bg-cream-50 p-4",
                  state === "new" && "border-sage-500/40 bg-sage-500/5",
                  state === "edit" && "border-amber-500/40 bg-amber-500/5",
                  state === "delete" &&
                    "border-clay-red-500/40 bg-clay-red-500/5 opacity-70",
                  state === "stable" && "border-border",
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageCircleQuestion
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      state === "delete" ? "text-clay-red-500" : "text-terracotta-500",
                    )}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px]">
                      <span className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-stone-600">
                        {faq.scope}
                      </span>
                      {faq.confidence && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono",
                            TONE[faq.confidence],
                          )}
                        >
                          {faq.confidence}
                        </span>
                      )}
                      <span className="font-mono text-foreground-muted">
                        id: {faq.id}
                      </span>
                      {state !== "stable" && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono uppercase tracking-wide",
                            state === "new" && "bg-sage-500 text-cream-50",
                            state === "edit" && "bg-amber-500 text-stone-700",
                            state === "delete" && "bg-clay-red-500 text-cream-50",
                          )}
                        >
                          {state}
                        </span>
                      )}
                    </div>

                    {editing ? (
                      <div className="space-y-2">
                        <input
                          value={draftQ}
                          onChange={(e) => setDraftQ(e.target.value)}
                          className="w-full rounded border border-terracotta-500 bg-surface px-2 py-1 text-sm focus:outline-none"
                          placeholder="Soru"
                        />
                        <textarea
                          value={draftA}
                          onChange={(e) => setDraftA(e.target.value)}
                          rows={4}
                          className="w-full rounded border border-terracotta-500 bg-surface px-2 py-1 font-normal text-sm leading-relaxed focus:outline-none"
                          placeholder="Cevap"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(faq)}
                            className="inline-flex items-center gap-1 rounded-md bg-sage-500/10 px-2 py-1 text-xs text-sage-700 hover:bg-sage-500/20"
                          >
                            <Check className="size-3" /> Staging'e ekle
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-cream-200"
                          >
                            <X className="size-3" /> İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-stone-700">
                          {faq.question}
                        </p>
                        <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
                          {faq.answer}
                        </p>
                      </>
                    )}
                  </div>

                  {!editing && state !== "delete" && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(faq)}
                        aria-label="Düzenle"
                        className="inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-cream-200 hover:text-stone-700"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stageDelete(faq)}
                        aria-label="Sil"
                        className="inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-clay-red-500/10 hover:text-clay-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                  {state !== "stable" && changeId && !editing && (
                    <button
                      type="button"
                      onClick={() => revertChange(changeId)}
                      className="self-start rounded px-2 py-0.5 text-[10px] text-foreground-muted hover:bg-cream-200"
                    >
                      geri al
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- */

type ViewItem = {
  faq: Faq;
  state: "stable" | "new" | "edit" | "delete";
  changeId?: string;
};

function mergeFaqViews(
  faqs: Faq[],
  pending: ReturnType<typeof useStagingStore.getState>["changes"],
): ViewItem[] {
  const byId = new Map<string, ViewItem>();
  for (const f of faqs) byId.set(f.id, { faq: f, state: "stable" });

  for (const c of pending) {
    const id = (c.after ?? c.before) as Faq | null;
    if (!id) continue;
    const faqFromAfter = (c.after as Faq | null) ?? null;
    const faqFromBefore = (c.before as Faq | null) ?? null;

    if (c.before === null && faqFromAfter) {
      byId.set(faqFromAfter.id, {
        faq: faqFromAfter,
        state: "new",
        changeId: c.id,
      });
    } else if (c.after === null && faqFromBefore) {
      const existing = byId.get(faqFromBefore.id);
      byId.set(faqFromBefore.id, {
        faq: existing?.faq ?? faqFromBefore,
        state: "delete",
        changeId: c.id,
      });
    } else if (faqFromAfter) {
      byId.set(faqFromAfter.id, {
        faq: faqFromAfter,
        state: "edit",
        changeId: c.id,
      });
    }
  }

  return [...byId.values()].sort((a, b) => {
    // New on top, then edits, then stable, deletes last
    const order = { new: 0, edit: 1, stable: 2, delete: 3 } as const;
    return order[a.state] - order[b.state];
  });
}
