import {
  Smartphone,
  Phone,
  Headphones,
  Shield,
  Plug,
  Music,
  Wrench,
  Store,
  type LucideIcon,
} from "lucide-react";

const categoryIconMap: Record<string, LucideIcon> = {
  all: Store,
  smartphones: Smartphone,
  "feature-phones": Phone,
  accessories: Headphones,
  cases: Shield,
  chargers: Plug,
  earbuds: Music,
  repairs: Wrench,
};

export function getCategoryIcon(id: string): LucideIcon {
  return categoryIconMap[id] || Store;
}

export function CategoryIcon({ id, className = "w-4 h-4" }: { id: string; className?: string }) {
  const Icon = getCategoryIcon(id);
  return <Icon className={className} strokeWidth={2} />;
}
