import Link from "next/link";
import { redirect } from "next/navigation";
import { GitCommitVertical } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { addDays, categoryColorClass, categoryLabel, formatMoney, isClosed, todayInIstanbul, type LifeItem } from "@/lib/lifeos";

const ranges = [30, 60, 90] as const;

function groupLabel(date: string, today: string) {
  if (date === today) return "Bugün";
  if (date === addDays(today, 1)) return "Yarın";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(new Date(`${date}T12:00:00+03:00`));
}

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range = ranges.includes(Number(rangeParam) as (typeof ranges)[number]) ? Number(rangeParam) : 30;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const today = todayInIstanbul();
  const horizon = addDays(today, range);
  const { data: rawItems, error } = await supabase
    .from("life_items")
    .select("*")
    .eq("user_id", userId)
    .gte("next_due_date", today)
    .lte("next_due_date", horizon)
    .order("next_due_date", { ascending: true });

  const items = ((rawItems ?? []) as LifeItem[]).filter((item) => !isClosed(item));
  const groups = new Map<string, LifeItem[]>();
  for (const item of items) {
    const date = item.next_due_date as string;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(item);
  }
  const orderedDates = [...groups.keys()].sort();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"><GitCommitVertical size={16} /> Planın</p>
          <h1 className="text-3xl font-semibold tracking-tight">Zaman Akışı</h1>
          <p className="mt-2 text-muted-foreground">Önümüzdeki {range} gün içinde neler var, tek bakışta gör.</p>
        </div>
        <div className="flex gap-2 rounded-lg bg-muted p-1">
          {ranges.map((option) => (
            <Link
              key={option}
              href={`/dashboard/timeline?range=${option}`}
              className={`rounded-md px-3 py-1.5 text-sm ${range === option ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
            >
              {option} gün
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center text-sm text-destructive">Zaman akışı şu anda alınamadı.</div>
      ) : orderedDates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <GitCommitVertical className="mx-auto text-muted-foreground" size={24} />
          <p className="mt-4 text-sm text-muted-foreground">Önümüzdeki {range} gün içinde planlanmış bir şey yok.</p>
        </div>
      ) : (
        <ol className="relative space-y-8 border-l border-border pl-6">
          {orderedDates.map((date) => (
            <li key={date} className="relative">
              <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500" />
              <p className="mb-3 text-sm font-semibold text-foreground">{groupLabel(date, today)}</p>
              <div className="space-y-2">
                {groups.get(date)!.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/items/${item.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition hover:bg-accent"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${categoryColorClass(item.category)}`} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title || "Başlıksız kayıt"}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{item.provider || categoryLabel(item.category)}</p>
                      </div>
                    </div>
                    {formatMoney(item.amount, item.currency) && <span className="shrink-0 text-sm font-medium">{formatMoney(item.amount, item.currency)}</span>}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
