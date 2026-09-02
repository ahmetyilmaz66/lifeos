import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  CreditCard,
  FileText,
  GitCommitVertical,
  Inbox,
  Package,
  PiggyBank,
  Settings,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

const sections: { label: string; href: string; icon: LucideIcon; color: string }[] = [
  { label: "Zaman Akışı", href: "/dashboard/timeline", icon: GitCommitVertical, color: "bg-[#2a78d6]" },
  { label: "ParaKaçağı", href: "/dashboard/savings", icon: PiggyBank, color: "bg-[#1baf7a]" },
  { label: "Gelen Kutusu", href: "/dashboard/inbox", icon: Inbox, color: "bg-[#eda100]" },
  { label: "Abonelikler", href: "/dashboard/subscriptions", icon: CreditCard, color: "bg-[#4a3aa7]" },
  { label: "Faturalar", href: "/dashboard/bills", icon: WalletCards, color: "bg-[#eb6834]" },
  { label: "Araçlar", href: "/dashboard/vehicles", icon: Archive, color: "bg-[#e87ba4]" },
  { label: "Ürün & Garanti", href: "/dashboard/products", icon: Package, color: "bg-[#008300]" },
  { label: "Belgeler", href: "/dashboard/documents", icon: FileText, color: "bg-[#e34948]" },
  { label: "Ayarlar", href: "/dashboard/settings", icon: Settings, color: "bg-muted-foreground" },
];

export default async function MorePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  const items = profile?.is_admin
    ? [...sections, { label: "Admin", href: "/admin", icon: ShieldCheck, color: "bg-[#e34948]" }]
    : sections;

  return (
    <div className="space-y-6 pb-6">
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">LifeOS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Daha Fazla</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:bg-accent"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${color}`}>
              <Icon size={18} />
            </span>
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
