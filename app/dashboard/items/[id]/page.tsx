import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { categoryLabel, formatMoney, formatDueDate, maskSensitiveText, type LifeItem } from "@/lib/lifeos";
import { categoryReminderDefaults } from "@/lib/reminders";
import ReminderSettingsForm from "@/components/reminder-settings-form";

export default async function LifeItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: rawItem } = await supabase.from("life_items").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!rawItem) notFound();
  const item = rawItem as LifeItem;
  const defaultDays = categoryReminderDefaults[item.category ?? "other"] ?? categoryReminderDefaults.other;
  const initialDays = item.reminder_days ?? defaultDays;
  return <div className="max-w-3xl space-y-8"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Genel bakışa dön</Link><div><p className="mb-3 text-sm font-medium text-muted-foreground">{categoryLabel(item.category)}</p><h1 className="text-3xl font-semibold tracking-tight">{item.title || "Başlıksız kayıt"}</h1>{item.provider && <p className="mt-2 text-muted-foreground">{item.provider}</p>}</div><div className="grid gap-4 sm:grid-cols-2">{[["Kategori", categoryLabel(item.category)], ["Tutar", formatMoney(item.amount, item.currency) ?? "Belirtilmemiş"], ["Başlangıç", item.start_date ?? "Belirtilmemiş"], ["Bitiş", item.end_date ?? "Belirtilmemiş"], ["Sonraki tarih", item.next_due_date ? `${item.next_due_date} · ${formatDueDate(item.next_due_date)}` : "Belirtilmemiş"], ["Tekrarlama", item.recurrence ?? "Belirtilmemiş"]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-medium">{value}</p></div>)}</div><ReminderSettingsForm lifeItemId={item.id} initialEnabled={item.reminder_enabled !== false} initialDays={initialDays} defaultDays={defaultDays} />{item.description && <div className="rounded-xl border border-border bg-card p-6"><h2 className="font-semibold">Açıklama</h2><p className="mt-3 leading-relaxed text-muted-foreground">{maskSensitiveText(item.description)}</p></div>}{item.source_document_id && <Link href={`/dashboard/documents#${item.source_document_id}`} className="inline-flex items-center gap-2 text-sm font-medium hover:underline"><FileText size={16} /> Kaynak belgeyi görüntüle</Link>}</div>;
}