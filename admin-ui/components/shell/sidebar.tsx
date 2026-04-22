"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
import { NAV_ITEMS, GROUP_LABELS, type NavItem } from "@/lib/nav";
import { useUiStore } from "@/lib/stores/ui";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function groupItems(items: NavItem[]) {
  const map = new Map<NavItem["group"], NavItem[]>();
  for (const it of items) {
    if (!map.has(it.group)) map.set(it.group, []);
    map.get(it.group)!.push(it);
  }
  return map;
}

export function Sidebar() {
  const pathname = usePathname();
  const groups = groupItems(NAV_ITEMS);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const notesOpen = useUiStore((s) => s.notesOpen);
  const openNotes = useUiStore((s) => s.openNotes);
  const closeNotes = useUiStore((s) => s.closeNotes);

  return (
    <aside
      aria-label="Ana navigasyon"
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-border bg-cream-50/60 backdrop-blur-sm transition-[width] duration-200",
        collapsed ? "md:w-14" : "md:w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b border-border",
          collapsed ? "px-2 py-3" : "px-4 py-5",
        )}
      >
        {!collapsed && (
          <Link href="/" className="block flex-1 min-w-0">
            <div className="font-display text-lg text-terracotta-600 leading-tight truncate">
              Catalog Atelier
            </div>
            <div className="mt-0.5 text-[11px] text-foreground-muted font-mono">
              MTS Kimya · Admin
            </div>
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Sidebar'ı genişlet" : "Sidebar'ı daralt"}
          aria-expanded={!collapsed}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded text-foreground-muted hover:bg-cream-200 hover:text-stone-700"
          title={collapsed ? "Genişlet (⌘\\)" : "Daralt"}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" aria-hidden />
          ) : (
            <ChevronLeft className="size-3.5" aria-hidden />
          )}
        </button>
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto py-3",
          collapsed ? "px-1.5 space-y-3" : "px-3 space-y-4",
        )}
      >
        {Array.from(groups.entries()).map(([group, items]) => (
          <div key={group}>
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground-muted font-medium">
                {GROUP_LABELS[group]}
              </div>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md text-sm transition-colors",
                        collapsed ? "size-9 justify-center" : "px-3 py-2",
                        active
                          ? "bg-terracotta-500 text-cream-50 shadow-sm"
                          : "text-foreground hover:bg-cream-200 hover:text-terracotta-700",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] text-white">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Notes — separate from nav routes; toggles a side panel */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground-muted font-medium">
              Workspace
            </div>
          )}
          <button
            type="button"
            onClick={() => (notesOpen ? closeNotes() : openNotes())}
            aria-pressed={notesOpen}
            title={collapsed ? "Notlar" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md text-sm transition-colors w-full",
              collapsed ? "size-9 justify-center" : "px-3 py-2",
              notesOpen
                ? "bg-amber-500 text-stone-700 shadow-sm"
                : "text-foreground hover:bg-cream-200 hover:text-amber-600",
            )}
          >
            <StickyNote className="size-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">Notlar</span>}
          </button>
        </div>
      </nav>

      {!collapsed && (
        <div className="border-t border-border px-4 py-3 text-[11px] text-foreground-muted font-mono">
          <div>retrieval-service</div>
          <div className="text-sage-600">● iad · hybrid</div>
        </div>
      )}
    </aside>
  );
}
