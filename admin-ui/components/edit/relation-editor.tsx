"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Share2, Check, X } from "lucide-react";
import { useStagingStore } from "@/lib/stores/staging";
import type { Relation } from "@/lib/data/sample-products";
import { cn } from "@/lib/utils";

type Props = {
  sku: string;
  relations: Relation[];
};

const RELATION_TYPES: Relation["relation_type"][] = [
  "use_with",
  "use_before",
  "use_after",
  "accessories",
  "alternatives",
];

const LABEL: Record<Relation["relation_type"], string> = {
  use_with: "Birlikte kullan",
  use_before: "Öncesinde",
  use_after: "Sonrasında",
  accessories: "Aksesuar",
  alternatives: "Alternatif",
};

const TONE: Record<Relation["relation_type"], string> = {
  use_with: "text-terracotta-600 border-terracotta-500/30 bg-terracotta-500/5",
  use_before: "text-sage-600 border-sage-500/30 bg-sage-500/5",
  use_after: "text-amber-600 border-amber-500/30 bg-amber-500/5",
  accessories: "text-stone-600 border-border bg-cream-100",
  alternatives: "text-clay-red-500 border-clay-red-500/30 bg-clay-red-500/5",
};

function makeKey(r: Pick<Relation, "target_sku" | "relation_type">) {
  return `${r.relation_type}:${r.target_sku}`;
}

export function RelationEditor({ sku, relations }: Props) {
  const allChanges = useStagingStore((s) => s.changes);
  const pending = useMemo(
    () => allChanges.filter((c) => c.sku === sku && c.scope === "relation"),
    [allChanges, sku],
  );
  const stageChange = useStagingStore((s) => s.stageChange);
  const revertChange = useStagingStore((s) => s.revertChange);

  const view = mergeRelationViews(relations, pending);

  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<Relation["relation_type"]>("use_with");
  const [newTarget, setNewTarget] = useState("");
  const [newName, setNewName] = useState("");

  function stageDelete(r: Relation) {
    stageChange({
      sku,
      scope: "relation",
      field: makeKey(r),
      before: r,
      after: null,
      label: `${LABEL[r.relation_type]} → ${r.target_sku}`,
    });
  }

  function addRelation() {
    const target = newTarget.trim();
    if (!target) return;
    const rel: Relation = {
      target_sku: target,
      target_name: newName.trim() || target,
      relation_type: newType,
    };
    stageChange({
      sku,
      scope: "relation",
      field: makeKey(rel),
      before: null,
      after: rel,
      label: `${LABEL[newType]} → ${target}`,
    });
    setShowForm(false);
    setNewTarget("");
    setNewName("");
  }

  const byType = view.reduce<Record<string, typeof view>>((acc, item) => {
    (acc[item.relation.relation_type] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="size-4 text-terracotta-500" aria-hidden />
          <h3 className="font-display text-lg text-stone-700">
            {view.length} ilişki · {Object.keys(byType).length} tip
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md bg-sage-500/10 px-2.5 py-1 text-xs text-sage-700 hover:bg-sage-500/20"
        >
          <Plus className="size-3.5" aria-hidden /> Yeni ilişki
        </button>
      </div>

      {showForm && (
        <div className="rounded-md border border-sage-500/40 bg-sage-500/5 p-3">
          <div className="grid gap-2 md:grid-cols-[140px,1fr,1fr,auto]">
            <select
              value={newType}
              onChange={(e) =>
                setNewType(e.target.value as Relation["relation_type"])
              }
              className="rounded border border-border bg-surface px-2 py-1 text-sm"
              aria-label="İlişki tipi"
            >
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LABEL[t]} ({t})
                </option>
              ))}
            </select>
            <input
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="Hedef SKU"
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-sm"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Görünen ad (opsiyonel)"
              className="rounded border border-border bg-surface px-2 py-1 text-sm"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={addRelation}
                className="inline-flex items-center gap-1 rounded-md bg-sage-500 px-2 py-1 text-xs text-cream-50 hover:bg-sage-600"
              >
                <Check className="size-3" /> Stage
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-cream-200"
              >
                <X className="size-3" /> İptal
              </button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-foreground-muted">
            Target SKU doğrulaması commit sırasında yapılır.
          </p>
        </div>
      )}

      {Object.entries(byType).length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Henüz ilişki yok. "Yeni ilişki" butonu ile staging'e ekle.
        </p>
      ) : (
        Object.entries(byType).map(([type, items]) => (
          <section key={type}>
            <h4 className="mb-2 text-[11px] uppercase tracking-wide text-foreground-muted">
              {LABEL[type as Relation["relation_type"]]} ·{" "}
              <code className="font-mono">{type}</code>
            </h4>
            <ul className="space-y-2">
              {items.map(({ relation: r, state, changeId }) => (
                <li
                  key={`${r.relation_type}:${r.target_sku}:${state}`}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-3 text-sm transition-opacity",
                    TONE[r.relation_type],
                    state === "new" && "ring-1 ring-sage-500",
                    state === "delete" && "opacity-60",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-stone-700 truncate">
                        {r.target_name}
                      </span>
                      {state !== "stable" && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                            state === "new" && "bg-sage-500 text-cream-50",
                            state === "delete" && "bg-clay-red-500 text-cream-50",
                          )}
                        >
                          {state}
                        </span>
                      )}
                    </div>
                    <code className="font-mono text-[11px] text-foreground-muted">
                      {r.target_sku}
                    </code>
                    {r.note && (
                      <p className="mt-1 text-xs text-foreground-muted">{r.note}</p>
                    )}
                  </div>
                  {state !== "stable" && changeId ? (
                    <button
                      type="button"
                      onClick={() => revertChange(changeId)}
                      className="shrink-0 rounded px-2 py-0.5 text-[10px] text-foreground-muted hover:bg-cream-200"
                    >
                      geri al
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => stageDelete(r)}
                      aria-label="İlişkiyi sil"
                      className="shrink-0 inline-flex size-6 items-center justify-center rounded text-foreground-muted hover:bg-clay-red-500/10 hover:text-clay-red-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

/* ----------------------------------------------------------- */

type RelView = {
  relation: Relation;
  state: "stable" | "new" | "delete";
  changeId?: string;
};

function mergeRelationViews(
  relations: Relation[],
  pending: ReturnType<typeof useStagingStore.getState>["changes"],
): RelView[] {
  const byKey = new Map<string, RelView>();
  for (const r of relations) byKey.set(makeKey(r), { relation: r, state: "stable" });

  for (const c of pending) {
    const relAfter = (c.after as Relation | null) ?? null;
    const relBefore = (c.before as Relation | null) ?? null;
    if (c.before === null && relAfter) {
      byKey.set(makeKey(relAfter), {
        relation: relAfter,
        state: "new",
        changeId: c.id,
      });
    } else if (c.after === null && relBefore) {
      const existing = byKey.get(makeKey(relBefore));
      byKey.set(makeKey(relBefore), {
        relation: existing?.relation ?? relBefore,
        state: "delete",
        changeId: c.id,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const order = { new: 0, stable: 1, delete: 2 } as const;
    return order[a.state] - order[b.state];
  });
}
