import Link from "next/link";
import { redirect } from "next/navigation";
import { PiggyBank, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { categoryLabel, formatMoney, isClosed, type LifeItem } from "@/lib/lifeos";

const reviewThresholdDays = 180;
const priceIncreaseThresholdPercent = 10;

type StoredLifeItem = LifeItem & { created_at: string };

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function toNumber(value: number | string | null) {
  const num = typeof value === "string" ? Number(value) : value;
  return num !== null && Number.isFinite(num) ? num : null;
}

export default async function SavingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: rawItems } = await supabase.from("life_items").select("*").eq("user_id", userId).order("created_at", { ascending: true });
  const items = (rawItems ?? []) as StoredLifeItem[];

  const longRunning = items.filter(
    (item) => !isClosed(item) && (item.category === "digital_subscription" || item.category === "bill") && daysSince(item.created_at) >= reviewThresholdDays,
  );

  const byProvider = new Map<string, StoredLifeItem[]>();
  for (const item of items) {
    if (!item.provider) continue;
    const key = `${item.provider.trim().toLowerCase()}::${item.category ?? ""}`;
    if (!byProvider.has(key)) byProvider.set(key, []);
    byProvider.get(key)!.push(item);
  }
  const priceIncreases = [...byProvider.values()]
    .filter((group) => group.length >= 2)
    .map((group) => {
      const sorted = [...group].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const oldAmount = toNumber(first.amount);
      const newAmount = toNumber(last.amount);
      if (oldAmount === null || newAmount === null || oldAmount <= 0) return null;
      const percent = ((newAmount - oldAmount) / oldAmount) * 100;
      return { item: last, oldAmount, newAmount, percent };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.percent >= priceIncreaseThresholdPercent)
    .sort((a, b) => b.percent - a.percent);

  const hasFindings = longRunning.length > 0 || priceIncreases.length > 0;

  return (
    <div className="space-y-10">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"><PiggyBank size={16} /> LifeOS</p>
        <h1 className="text-3xl font-semibold tracking-tight">ParaKaçağı</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Beta sürüm — gerçek kullanım/banka verisi olmadan, elimizdeki kayıtlardan çıkarılabilecek iki sinyali gösteriyoruz: uzun süredir
          aktif abonelikler ve aynı sağlayıcıda tespit edilen fiyat artışları. Veri biriktikçe daha isabetli hale gelir.
        </p>
      </div>

      {!hasFindings && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <PiggyBank className="mx-auto text-muted-foreground" size={24} />
          <p className="mt-4 text-sm text-muted-foreground">Henüz bir bulgu yok. Abonelik/fatura geçmişin büyüdükçe burada öneriler görünecek.</p>
        </div>
      )}

      {priceIncreases.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-destructive" />
            <h2 className="text-xl font-semibold">Fiyat artışı tespit edildi</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
            {priceIncreases.map(({ item, oldAmount, newAmount, percent }) => (
              <Link key={item.id} href={`/dashboard/items/${item.id}`} className="flex items-center justify-between gap-4 p-4 transition hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.provider}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{categoryLabel(item.category)} · {formatMoney(oldAmount, item.currency)} → {formatMoney(newAmount, item.currency)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">+%{percent.toFixed(0)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {longRunning.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <PiggyBank size={18} className="text-muted-foreground" />
            <h2 className="text-xl font-semibold">Gözden geçirmeyi düşün</h2>
          </div>
          <p className="text-sm text-muted-foreground">{reviewThresholdDays} günden uzun süredir aktif — hâlâ kullanıyor musun?</p>
          <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
            {longRunning.map((item) => (
              <Link key={item.id} href={`/dashboard/items/${item.id}`} className="flex items-center justify-between gap-4 p-4 transition hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title || item.provider || "Başlıksız kayıt"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{categoryLabel(item.category)} · {daysSince(item.created_at)} gündür aktif</p>
                </div>
                {formatMoney(item.amount, item.currency) && <span className="shrink-0 text-sm font-medium">{formatMoney(item.amount, item.currency)}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
