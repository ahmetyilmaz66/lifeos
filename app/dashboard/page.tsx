import Link from "next/link";
import { ArrowRight, CalendarClock, FileText, Plus, Receipt, Repeat2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDays, categoryLabel, formatDueDate, formatMoney, isClosed, todayInIstanbul, type LifeItem } from "@/lib/lifeos";

function paymentSummary(items: LifeItem[], start: string, end: string) {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.next_due_date || item.next_due_date < start || item.next_due_date >= end || isClosed(item)) continue;
    const amount = typeof item.amount === "string" ? Number(item.amount) : item.amount;
    if (amount !== null && Number.isFinite(amount)) totals.set(item.currency || "TRY", (totals.get(item.currency || "TRY") ?? 0) + amount);
  }
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ") || "₺0,00";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const today = todayInIstanbul();
  const next30 = addDays(today, 30);
  const monthStart = `${today.slice(0, 8)}01`;
  const monthEnd = `${today.slice(0, 7)}-01`;
  const nextMonth = addDays(monthEnd, 32).slice(0, 8) + "01";
  const [{ data: profile }, { data: items }, { count: documentCount }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("life_items").select("*").eq("user_id", userId).order("next_due_date", { ascending: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const lifeItems = (items ?? []) as LifeItem[];
  const upcomingItems = lifeItems.filter((item) => item.next_due_date && item.next_due_date >= today && item.next_due_date <= next30 && !isClosed(item));
  const upcoming = upcomingItems.slice(0, 5);
  const activeSubscriptions = lifeItems.filter((item) => item.category === "digital_subscription" && !isClosed(item)).length;
  const summary = [["Yaklaşan İşlemler", upcomingItems.length, CalendarClock], ["Aktif Abonelikler", activeSubscriptions, Repeat2], ["Bu Ay Ödemeler", paymentSummary(lifeItems, monthStart, nextMonth), Receipt], ["Takip Edilen Belgeler", documentCount ?? 0, FileText]] as const;
  const name = profile?.full_name?.trim();
  return <div className="space-y-10">
    <section className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-3 text-sm font-medium text-muted-foreground">Genel Bakış</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Günaydın{name ? `, ${name}` : ""}</h1><p className="mt-3 max-w-xl text-muted-foreground">Hayatındaki önemli şeyleri tek bir yerde sakin ve düzenli tut.</p></div><Link href="/dashboard/documents" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-md shadow-violet-900/30 transition hover:opacity-90"><Plus size={18} /> Hayatıma Ekle</Link></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Özet">{summary.map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon size={17} className="text-muted-foreground" /></div><p className="mt-5 text-2xl font-semibold tabular-nums">{value}</p></div>)}</section>
    <section className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">Planın</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Yaklaşanlar</h2></div>{upcoming.length > 0 && <Link href="/dashboard/today" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">Tümünü gör <ArrowRight size={15} /></Link>}</div>{upcoming.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center"><h3 className="text-lg font-medium">Henüz yaklaşan bir işlemin yok.</h3><p className="mt-2 text-sm text-muted-foreground">Geçmiş kayıtlar gelecekteki işlemler arasında gösterilmez.</p><Link href="/dashboard/documents" className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><Plus size={16} /> Hayatıma Ekle</Link></div> : <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">{upcoming.map((item) => <Link key={item.id} href={`/dashboard/items/${item.id}`} className="flex flex-col gap-3 p-4 transition hover:bg-accent sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium">{item.title || "Başlıksız kayıt"}</p><p className="mt-1 text-sm text-muted-foreground">{item.provider || categoryLabel(item.category)} · {item.next_due_date}</p></div><div className="flex items-center gap-4 text-sm"><span className="font-medium">{formatMoney(item.amount, item.currency) ?? "Tutar belirtilmemiş"}</span><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{formatDueDate(item.next_due_date as string)}</span></div></Link>)}</div>}</section>
  </div>;
}