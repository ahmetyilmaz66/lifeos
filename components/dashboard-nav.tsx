"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-3 py-5" aria-label="LifeOS menüsü">
      {items.map(({ label, href, icon: Icon }) => {
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

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="mx-5 mb-5 grid grid-cols-5 gap-1 rounded-xl border border-border bg-card p-2 lg:hidden" aria-label="Mobil LifeOS menüsü">
      {items.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "flex flex-col items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 p-2 text-center text-[10px] font-medium text-white"
                : "flex flex-col items-center gap-1 rounded-lg p-2 text-center text-[10px] text-muted-foreground hover:bg-accent"
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
