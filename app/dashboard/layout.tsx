import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Bell, CalendarDays, CreditCard, FileText, Inbox, LayoutDashboard, Package, Settings, Sparkles, WalletCards } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

const navigation = [
  { label: "Genel Bakış", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bugün", href: "/dashboard/today", icon: CalendarDays },
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

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-border px-6"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles size={18} /></div><span className="text-lg font-semibold tracking-tight">LifeOS</span></div>
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="LifeOS menüsü">
          {navigation.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"><Icon size={17} strokeWidth={1.8} />{label}</Link>)}
        </nav>
        <div className="border-t border-border p-3"><LogoutButton /></div>
      </aside>
      <main className="min-h-screen lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-5 backdrop-blur lg:px-10"><div className="flex items-center gap-2 text-sm font-medium lg:hidden"><Sparkles size={17} /> LifeOS</div><div className="hidden lg:block" /><div className="flex items-center gap-4 text-sm text-muted-foreground"><Bell size={17} /><span className="hidden sm:inline">{firstName ?? "Hesabım"}</span></div></header>
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">{children}</div>
        <nav className="mx-5 mb-5 grid grid-cols-5 gap-1 rounded-xl border border-border bg-card p-2 lg:hidden" aria-label="Mobil LifeOS menüsü">
          {navigation.slice(0, 4).map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="flex flex-col items-center gap-1 rounded-lg p-2 text-center text-[10px] text-muted-foreground hover:bg-accent"><Icon size={16} /><span>{label}</span></Link>)}
          <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 rounded-lg p-2 text-center text-[10px] text-muted-foreground hover:bg-accent"><Settings size={16} /><span>Ayarlar</span></Link>
        </nav>
      </main>
    </div>
  );
}