"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  CalendarDays,
  CreditCard,
  FileText,
  GitCommitVertical,
  Grid2x2,
  Inbox,
  LayoutDashboard,
  Package,
  PiggyBank,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

// Server Components can't pass component/function references as props to
// Client Components (fails RSC serialization). So the nav data crossing that
// boundary carries icon *names*, and this client-only file maps them back to
// the actual Lucide components.
const icons: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  GitCommitVertical,
  Search,
  PiggyBank,
  Inbox,
  CreditCard,
  WalletCards,
  Archive,
  Package,
  FileText,
  Settings,
  ShieldCheck,
  Grid2x2,
};

type NavItem = { label: string; href: string; icon: string };

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-3 py-5" aria-label="LifeOS menüsü">
      {items.map(({ label, href, icon }) => {
        const Icon = icons[icon] ?? LayoutDashboard;
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "flex items-center gap-3 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm shadow-violet-900/20"
                : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            }
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Fixed to the viewport bottom (not inline page content) so it's always
// reachable without scrolling. 2 tabs + a raised center action + 2 tabs;
// "Daha Fazla" is the escape hatch to every section that doesn't fit here.
export function MobileNav({ items, ctaHref }: { items: NavItem[]; ctaHref: string }) {
  const pathname = usePathname();
  const left = items.slice(0, 2);
  const right = items.slice(2);

  function tabClass(active: boolean) {
    return active
      ? "flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-center text-[10px] font-medium text-violet-400"
      : "flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-center text-[10px] text-muted-foreground";
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Mobil LifeOS menüsü"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-1.5">
        {left.map(({ label, href, icon }) => {
          const Icon = icons[icon] ?? LayoutDashboard;
          return (
            <Link key={href} href={href} className={tabClass(isActive(pathname, href))}>
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
        <div className="flex justify-center">
          <Link
            href={ctaHref}
            aria-label="Hayatıma Ekle"
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-900/40 ring-4 ring-background"
          >
            <Plus size={26} />
          </Link>
        </div>
        {right.map(({ label, href, icon }) => {
          const Icon = icons[icon] ?? LayoutDashboard;
          return (
            <Link key={href} href={href} className={tabClass(isActive(pathname, href))}>
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
