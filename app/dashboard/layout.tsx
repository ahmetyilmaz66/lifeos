import { redirect } from "next/navigation";
import { Archive, Bell, CalendarDays, CreditCard, FileText, GitCommitVertical, Inbox, LayoutDashboard, Package, Settings, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { SidebarNav, MobileNav } from "@/components/dashboard-nav";
import { createClient } from "@/lib/supabase/server";

const navigation = [
  { label: "Genel Bakış", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bugün", href: "/dashboard/today", icon: CalendarDays },
  { label: "Zaman Akışı", href: "/dashboard/timeline", icon: GitCommitVertical },
  { label: "Gelen Kutusu", href: "/dashboard/inbox", icon: Inbox },
  { label: "Abonelikler", href: "/dashboard/subscriptions", icon: CreditCard },
  { label: "Faturalar", href: "/dashboard/bills", icon: WalletCards },
  { label: "Araçlar", href: "/dashboard/vehicles", icon: Archive },
  { label: "Ürün & Garanti", href: "/dashboard/products", icon: Package },
  { label: "Belgeler", href: "/dashboard/documents", icon: FileText },
  { label: "Ayarlar", href: "/dashboard/settings", icon: Settings },
];

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, is_admin").eq("id", userId).maybeSingle();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const nav = profile?.is_admin ? [...navigation, { label: "Admin", href: "/admin", icon: ShieldCheck }] : navigation;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-border px-6"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm shadow-violet-900/30"><Sparkles size={18} /></div><span className="text-lg font-semibold tracking-tight">LifeOS</span></div>
        <SidebarNav items={nav} />
        <div className="border-t border-border p-3"><LogoutButton /></div>
      </aside>
      <main className="min-h-screen lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-5 backdrop-blur lg:px-10"><div className="flex items-center gap-2 text-sm font-medium lg:hidden"><Sparkles size={17} /> LifeOS</div><div className="hidden lg:block" /><div className="flex items-center gap-4 text-sm text-muted-foreground"><Bell size={17} /><span className="hidden sm:inline">{firstName ?? "Hesabım"}</span></div></header>
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">{children}</div>
        <MobileNav items={[...navigation.slice(0, 4), { label: "Ayarlar", href: "/dashboard/settings", icon: Settings }]} />
      </main>
    </div>
  );
}