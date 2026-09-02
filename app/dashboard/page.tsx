import Link from "next/link";
import { ArrowRight, CalendarClock, FileText, Plus, Repeat2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDays, categoryLabel, formatDueDate, formatMoney, isClosed, todayInIstanbul, type LifeItem } from "@/lib/lifeos";
import CategorySpendingChart from "@/components/category-spending-chart";

function paymentSummary(items: LifeItem[], start: string, end: string) {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!item.next_due_date || item.next_due_date < start || item.next_due_date >= end || isClosed(item)) continue;
    const amount = typeof item.amount === "string" ? Number(item.amount) : item.amount;
    if (amount !== null && Number.isFinite(amount)) totals.set(item.currency || "TRY", (totals.get(item.currency || "TRY") ?? 0) + amount);
  }
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(" + ") || "₺0,00";
}

const maxSpendingSegments = 7;

function categorySpendingBreakdown(items: LifeItem[]) {
  const byCurrency = new Map<string, number>();
  for (const item of items) {
    if (isClosed(item)) continue;
    const amount = typeof item.amount === "string" ? Number(item.amount) : item.amount;
    if (amount === null || !Number.isFinite(amount) || amount <= 0) continue;
    const currency = item.currency || "TRY";
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + 1);
  }
  const currency = [...byCurrency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "TRY";

  const byCategory = new Map<string, number>();
  for (const item of items) {
    if (isClosed(item) || (item.currency || "TRY") !== currency) continue;
    const amount = typeof item.amount === "string" ? Number(item.amount) : item.amount;
    if (amount === null || !Number.isFinite(amount) || amount <= 0) continue;
    const category = item.category ?? "other";
    byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
  }
  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const visible = sorted.slice(0, maxSpendingSegments);
  const overflow = sorted.slice(maxSpendingSegments);
  if (overflow.length) visible.push(["other", overflow.reduce((sum, [, amount]) => sum + amount, 0)]);
  const total = visible.reduce((sum, [, amount]) => sum + amount, 0);
  const segments = visible.map(([category, amount]) => ({ category, amount, percent: total > 0 ? (amount / total) * 100 : 0 }));
  return { segments, currency };
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
  const monthlyTotal = paymentSummary(lifeItems, monthStart, nextMonth);
  const pills = [
    [Repeat2, `${activeSubscriptions} Aktif Abonelik`, "bg-[#2a78d6]"],
    [CalendarClock, `${upcomingItems.length} Yaklaşan İşlem`, "bg-[#e87ba4]"],
    [FileText, `${documentCount ?? 0} Belge`, "bg-[#1baf7a]"],
  ] as const;
  const name = profile?.full_name?.trim();
  const spending = categorySpendingBreakdown(lifeItems);
  return <div className="space-y-8">
    <section className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Genel Bakış</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Günaydın{name ? `, ${name}` : ""}</h1></div><Link href="/dashboard/documents" className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-md shadow-violet-900/30 transition hover:opacity-90 sm:inline-flex"><Plus size={18} /> Hayatıma Ekle</Link></section>
    <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-card to-fuchsia-500/10 p-6 shadow-lg shadow-violet-950/20 sm:p-8">
      <p className="text-sm text-muted-foreground">Bu Ay Toplam Ödeme</p>
      <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{monthlyTotal}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {pills.map(([Icon, label, color]) => <span key={label} className="inline-flex items-center gap-2 rounded-full bg-background/70 py-1.5 pl-1.5 pr-3 text-xs font-medium text-foreground"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${color}`}><Icon size={12} /></span>{label}</span>)}
      </div>
    </section>
    <section className="space-y-4 rounded-xl border border-border bg-card p-6"><div><p className="text-sm font-medium text-muted-foreground">Harcama</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Kategori Bazlı Dağılım</h2></div><CategorySpendingChart segments={spending.segments} currency={spending.currency} /></section>
    <section className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">Planın</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Yaklaşanlar</h2></div>{upcoming.length > 0 && <Link href="/dashboard/today" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">Tümünü gör <ArrowRight size={15} /></Link>}</div>{upcoming.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center"><h3 className="text-lg font-medium">Henüz yaklaşan bir işlemin yok.</h3><p className="mt-2 text-sm text-muted-foreground">Geçmiş kayıtlar gelecekteki işlemler arasında gösterilmez.</p><Link href="/dashboard/documents" className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><Plus size={16} /> Hayatıma Ekle</Link></div> : <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">{upcoming.map((item) => <Link key={item.id} href={`/dashboard/items/${item.id}`} className="flex flex-col gap-3 p-4 transition hover:bg-accent sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium">{item.title || "Başlıksız kayıt"}</p><p className="mt-1 text-sm text-muted-foreground">{item.provider || categoryLabel(item.category)} · {item.next_due_date}</p></div><div className="flex items-center gap-4 text-sm"><span className="font-medium">{formatMoney(item.amount, item.currency) ?? "Tutar belirtilmemiş"}</span><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{formatDueDate(item.next_due_date as string)}</span></div></Link>)}</div>}</section>
  </div>;
}