"use client";

import { useState } from "react";
import { CatalogTree } from "@/components/catalog/tree";
import { NodeDetail } from "@/components/catalog/node-detail";

export default function CatalogPage() {
  const [group, setGroup] = useState<string | null>("ceramic_coating");
  const [sub, setSub] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0">
      <aside className="w-72 shrink-0 border-r border-border bg-cream-50/50">
        <CatalogTree
          selectedGroup={group}
          selectedSub={sub}
          onSelect={(g, s) => {
            setGroup(g);
            setSub(s);
          }}
        />
      </aside>

      <div className="flex-1 overflow-y-auto">
        <NodeDetail group={group} sub={sub} />
      </div>
    </div>
  );
}
