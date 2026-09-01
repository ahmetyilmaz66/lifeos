"use client";

import Link from "next/link";
import { Bell, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { dateDifferenceInDays, formatMoney } from "@/lib/lifeos";

type ReminderViewModel = {
  reminderId: string;
  lifeItemId: string;
  title: string;
  provider: string | null;
  category: string | null;
  amount: number | string | null;
  currency: string | null;
  remindAt: string;
  status: string;
};

function formatReminderDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function reminderTiming(value: string) {
  const istanbulDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
  const days = dateDifferenceInDays(istanbulDate);
  if (days === 0) return "Bugün";
  if (days > 0) return `${days} gün kaldı`;
  return `${Math.abs(days)} gün gecikti`;
}

export default function ReminderList({ reminders }: { reminders: ReminderViewModel[] }) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function dismissReminder(event: React.MouseEvent<HTMLButtonElement>, reminderId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (dismissing) return;
    setDismissing(reminderId);
    setError(null);
    const response = await fetch(`/api/reminders/${reminderId}`, { method: "PATCH" });
    if (!response.ok) setError("Hatırlatma kapatılamadı.");
    else router.refresh();
    setDismissing(null);
  }

  if (!reminders.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
        <Bell className="mx-auto text-muted-foreground" size={22} />
        <p className="mt-3 text-sm text-muted-foreground">Yaklaşan hatırlatman yok.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
      {reminders.map((reminder) => {
        const isDue = new Date(reminder.remindAt).getTime() <= Date.now();
        return <div
          key={reminder.reminderId}
          className="flex flex-col gap-3 p-4 transition hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
        >
          <Link href={`/dashboard/items/${reminder.lifeItemId}`} className="min-w-0 flex-1">
            <p className="truncate font-medium">{reminder.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {reminder.provider || reminder.category || "Life Item"}
            </p>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {formatMoney(reminder.amount, reminder.currency) && (
              <span className="font-medium">{formatMoney(reminder.amount, reminder.currency)}</span>
            )}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock size={15} />
              {formatReminderDate(reminder.remindAt)}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {reminderTiming(reminder.remindAt)}
            </span>
            {isDue && reminder.status === "pending" && <button type="button" disabled={dismissing === reminder.reminderId} onClick={(event) => dismissReminder(event, reminder.reminderId)} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-background disabled:opacity-50">{dismissing === reminder.reminderId ? "Kapatılıyor..." : "Kapat"}</button>}
          </div>
        </div>;
      })}
      {error && <p className="px-4 pb-4 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
