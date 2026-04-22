import {
  LayoutDashboard,
  FolderTree,
  Flame,
  Package,
  MessageCircleQuestion,
  Share2,
  ClipboardList,
  GitCommit,
  Sparkles,
  History,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "catalog" | "tools" | "lab" | "flow";
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  // Catalog
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "catalog" },
  { href: "/catalog", label: "Katalog Ağacı", icon: FolderTree, group: "catalog" },
  { href: "/heatmap", label: "Coverage Heatmap", icon: Flame, group: "catalog" },

  // Tools
  { href: "/bulk", label: "Bulk Operations", icon: ClipboardList, group: "tools" },
  { href: "/faq", label: "FAQ Manager", icon: MessageCircleQuestion, group: "tools" },
  { href: "/relations", label: "Relations", icon: Share2, group: "tools" },

  // Prompt Lab
  { href: "/prompts", label: "Prompt Lab", icon: Sparkles, group: "lab" },

  // Flow
  { href: "/staging", label: "Staging", icon: Package, group: "flow" },
  { href: "/commit", label: "Commit", icon: GitCommit, group: "flow" },
  { href: "/activity", label: "Activity", icon: History, group: "flow" },
];

export const GROUP_LABELS: Record<NavItem["group"], string> = {
  catalog: "Katalog",
  tools: "Araçlar",
  lab: "Prompt Lab",
  flow: "Staging & Commit",
};
