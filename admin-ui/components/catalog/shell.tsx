"use client";

import { useState } from "react";
import { CatalogTree } from "./tree";
import { NodeDetail } from "./node-detail";
import type { TemplateGroup } from "@/lib/data/taxonomy";

type Props = {
  taxonomy: TemplateGroup[];
  initialGroup?: string | null;
};

export function CatalogShell({ taxonomy, initialGroup = "ceramic_coating" }: Props) {
  const [group, setGroup] = useState<string | null>(initialGroup);
  const [sub, setSub] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0">
      <aside className="w-72 shrink-0 border-r border-border bg-cream-50/50">
        <CatalogTree
          taxonomy={taxonomy}
          selectedGroup={group}
          selectedSub={sub}
          onSelect={(g, s) => {
            setGroup(g);
            setSub(s);
          }}
        />
      </aside>

      <div className="flex-1 overflow-y-auto">
        <NodeDetail taxonomy={taxonomy} group={group} sub={sub} />
      </div>
    </div>
  );
}
