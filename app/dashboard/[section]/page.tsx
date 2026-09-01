import Link from "next/link";
import { redirect } from "next/navigation";

import LifeItemList from "@/components/life-item-list";
import ReminderList from "@/components/reminder-list";
import { createClient } from "@/lib/supabase/server";
import { addDays, isClosed, todayInIstanbul, type LifeItem } from "@/lib/lifeos";

const pageTitles: Record<string, string> = {
  today: "Bugün",
  inbox: "Gelen Kutusu",
  subscriptions: "Abonelikler",
  bills: "Faturalar",
  vehicles: "Araçlar",
  products: "Ürün & Garanti",
  documents: "Belgeler",
};

export default async function DashboardSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = pageTitles[section] ?? "LifeOS";
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  if (section === "inbox") {
    const { data: documents } = await supabase.from("documents").select("id, file_name, created_at").eq("user_id", userId).eq("processing_status", "needs_review").order("created_at", { ascending: false });
    return <div className="space-y-8"><div><p className="mb-3 text-sm font-medium text-muted-foreground">LifeOS</p><h1 className="text-3xl font-semibold tracking-tight">Gelen Kutusu</h1></div><div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">{documents?.length ? documents.map((document) => <Link key={document.id} href={`/dashboard/documents#${document.id}`} className="block p-5 hover:bg-accent"><p className="font-medium">{document.file_name}</p><p className="mt-1 text-sm text-muted-foreground">İnceleme gerekiyor · {new Date(document.created_at).toLocaleDateString("tr-TR")}</p></Link>) : <div className="px-6 py-14 text-center text-sm text-muted-foreground">İncelenecek belge yok.</div>}</div></div>;
  }
  if (section === "today") {
    const today = todayInIstanbul();
    const sevenDays = addDays(today, 7);
    const [{ data: reminders, error: reminderError }, { data: rawItems }] = await Promise.all([
      supabase.from("reminders").select("id, life_item_id, remind_at, status, channel, created_at").eq("user_id", userId).eq("status", "pending").order("remind_at", { ascending: true }),
      supabase.from("life_items").select("*").eq("user_id", userId).order("next_due_date"),
    ]);
    const items = (rawItems ?? []) as LifeItem[];
    const todayReminderCount = (reminders ?? []).filter((reminder) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(reminder.remind_at)) === today).length;
    const lifeItemIds = [...new Set((reminders ?? []).map((reminder) => reminder.life_item_id))];
    const { data: relatedItems, error: relatedItemsError } = lifeItemIds.length
      ? await supabase.from("life_items").select("id, title, category, provider, amount, currency, next_due_date").eq("user_id", userId).in("id", lifeItemIds)
      : { data: [], error: null };
    const reminderItems = new Map((relatedItems ?? []).map((item) => [item.id, item]));
    const reminderView = (reminders ?? []).map((reminder) => {
      const item = reminderItems.get(reminder.life_item_id);
      return { reminderId: reminder.id, lifeItemId: reminder.life_item_id, title: item?.title || "Life Item", provider: item?.provider ?? null, category: item?.category ?? null, amount: item?.amount ?? null, currency: item?.currency ?? null, remindAt: reminder.remind_at, status: reminder.status };
    });
    const nextSeven = items.filter((item) => item.next_due_date && item.next_due_date > today && item.next_due_date <= sevenDays && !isClosed(item));
    const overdue = items.filter((item) => item.next_due_date && item.next_due_date < today && !isClosed(item));
    return <div className="space-y-10"><div><p className="mb-3 text-sm font-medium text-muted-foreground">Planın</p><h1 className="text-3xl font-semibold tracking-tight">Bugün</h1></div><section className="space-y-4"><h2 className="text-xl font-semibold">Bugün</h2>{reminderError || relatedItemsError ? <p className="text-sm text-destructive">Hatırlatmalar şu anda alınamadı.</p> : <p className="text-sm text-muted-foreground">{todayReminderCount} hatırlatma</p>}</section><section className="space-y-4"><h2 className="text-xl font-semibold">Yaklaşan Hatırlatmalar</h2>{reminderError || relatedItemsError ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center text-sm text-destructive">Hatırlatmalar şu anda alınamadı.</div> : <ReminderList reminders={reminderView} />}</section><section className="space-y-4"><h2 className="text-xl font-semibold">Sonraki 7 gün</h2><LifeItemList items={nextSeven} /></section><section className="space-y-4"><h2 className="text-xl font-semibold">Gecikmiş</h2><LifeItemList items={overdue} emptyMessage="Gecikmiş kayıt yok." /></section></div>;
  }
  const category = section === "products" ? ["product", "warranty"] : [section === "subscriptions" ? "digital_subscription" : section === "bills" ? "bill" : section === "vehicles" ? "vehicle" : section];
  const { data: rawItems } = await supabase.from("life_items").select("*").eq("user_id", userId).in("category", category).order("next_due_date", { ascending: true });
  return (
    <div className="space-y-8">
      <div><p className="mb-3 text-sm font-medium text-muted-foreground">LifeOS</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1></div>
      <LifeItemList items={(rawItems ?? []) as LifeItem[]} />
    </div>
  );
}