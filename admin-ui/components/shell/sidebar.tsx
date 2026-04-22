"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, GROUP_LABELS, type NavItem } from "@/lib/nav";
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

  return (
    <aside
      aria-label="Ana navigasyon"
      className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-cream-50/60 backdrop-blur-sm"
    >
      <div className="px-6 py-6 border-b border-border">
        <Link href="/" className="block">
          <div className="font-display text-xl text-terracotta-600 leading-none">
            Catalog Atelier
          </div>
          <div className="mt-1 text-xs text-foreground-muted font-mono">
            MTS Kimya · Admin
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {Array.from(groups.entries()).map(([group, items]) => (
          <div key={group}>
            <div className="px-3 pb-1.5 text-[11px] uppercase tracking-wider text-foreground-muted font-medium">
              {GROUP_LABELS[group]}
            </div>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-terracotta-500 text-cream-50 shadow-sm"
                          : "text-foreground hover:bg-cream-200 hover:text-terracotta-700",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-foreground-muted font-mono">
        <div>retrieval-service</div>
        <div className="text-sage-600">● iad · hybrid</div>
      </div>
    </aside>
  );
}
