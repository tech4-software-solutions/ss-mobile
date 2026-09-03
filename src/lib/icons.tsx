import {
  Store,
  Smartphone,
  Phone,
  Headphones,
  Shield,
  Plug,
  Music,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  store: Store,
  smartphone: Smartphone,
  phone: Phone,
  headphones: Headphones,
  shield: Shield,
  plug: Plug,
  music: Music,
  wrench: Wrench,
};

const emojiFallback: Record<string, string> = {
  all: "store",
  smartphones: "smartphone",
  "feature-phones": "phone",
  accessories: "headphones",
  cases: "shield",
  chargers: "plug",
  earbuds: "music",
  repairs: "wrench",
};

export function CategoryIcon({ icon, className = "w-4 h-4" }: { icon: string; className?: string }) {
  const key = emojiFallback[icon] || icon;
  const Icon = iconMap[key] || Store;
  return <Icon className={className} strokeWidth={2} />;
}

export function getCategoryIconName(categoryId: string): string {
  return emojiFallback[categoryId] || "store";
}
