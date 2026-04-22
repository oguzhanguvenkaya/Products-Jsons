"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStagingStore, type ChangeScope } from "@/lib/stores/staging";

type Props = {
  sku: string;
  scope: ChangeScope;
  field: string;
  value: string | number | null;
  kind?: "text" | "number";
  label?: string;
  className?: string;
  /** Serializable display-format hint (replaces function props across RSC) */
  formatAs?: "plain" | "tl";
  hint?: string;
};

function formatDisplay(v: string | number | null, as: "plain" | "tl") {
  if (v === null || v === undefined) return "—";
  if (as === "tl" && typeof v === "number") {
    return `${v.toLocaleString("tr-TR")} TL`;
  }
  return String(v);
}

export function EditableCell({
  sku,
  scope,
  field,
  value,
  kind = "text",
  label,
  className,
  formatAs = "plain",
  hint,
}: Props) {
  const pending = useStagingStore((s) =>
    s.changes.find(
      (c) => c.sku === sku && c.scope === scope && c.field === field,
    ),
  );
  const stageChange = useStagingStore((s) => s.stageChange);
  const revertChange = useStagingStore((s) => s.revertChange);

  const current = pending ? (pending.after as string | number | null) : value;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(
    current === null || current === undefined ? "" : String(current),
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(current === null || current === undefined ? "" : String(current));
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [editing, current]);

  function commit() {
    let parsed: string | number | null = draft.trim();
    if (parsed === "") {
      parsed = null;
    } else if (kind === "number") {
      const n = Number(parsed);
      if (Number.isNaN(n)) {
        setEditing(false);
        return;
      }
      parsed = n;
    }
    if (parsed !== value) {
      stageChange({
        sku,
        scope,
        field,
        before: value,
        after: parsed,
        label,
      });
    } else if (pending) {
      // Back to original → drop the pending diff
      revertChange(pending.id);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <input
          ref={inputRef}
          type={kind === "number" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="flex-1 rounded-md border border-terracotta-500 bg-surface px-2 py-0.5 font-mono text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Kaydet"
          className="inline-flex size-6 items-center justify-center rounded text-sage-600 hover:bg-sage-500/10"
        >
          <Check className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="İptal"
          className="inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-cream-200"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "group inline-flex items-baseline gap-1.5 rounded-md px-1.5 py-0.5 text-left transition-colors",
        pending
          ? "bg-amber-500/10 text-stone-700 ring-1 ring-amber-500/40 hover:ring-amber-500"
          : "hover:bg-cream-200",
        className,
      )}
      aria-label={label ? `${label} düzenle` : "Düzenle"}
      title={hint}
    >
      <span className="font-mono text-sm text-stone-700">
        {formatDisplay(current, formatAs)}
      </span>
      {pending && (
        <span className="font-mono text-[10px] text-amber-600">
          (was: {pending.before === null ? "—" : String(pending.before)})
        </span>
      )}
      <Pencil
        className="size-3 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}
