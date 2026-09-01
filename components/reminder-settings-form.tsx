"use client";

import { useState } from "react";
import { Bell, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

const options = [
  { days: 0, label: "Aynı gün" },
  { days: 1, label: "1 gün önce" },
  { days: 3, label: "3 gün önce" },
  { days: 7, label: "7 gün önce" },
];

type Props = {
  lifeItemId: string;
  initialEnabled: boolean;
  initialDays: number[];
  defaultDays: number[];
};

export default function ReminderSettingsForm({ lifeItemId, initialEnabled, initialDays, defaultDays }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [days, setDays] = useState(initialDays);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleDay(value: number) {
    setDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value].sort((a, b) => b - a));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/life-items/${lifeItemId}/reminder-settings`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reminderEnabled: enabled, reminderDays: days }) });
    const result = await response.json().catch(() => null);
    setMessage(response.ok ? "Hatırlatma ayarları kaydedildi." : result?.error ?? "Hatırlatma ayarları kaydedilemedi.");
    setSaving(false);
  }

  return <form onSubmit={save} className="rounded-xl border border-border bg-card p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Bell size={18} /> Hatırlatma Ayarları</h2><p className="mt-1 text-sm text-muted-foreground">Bu Life Item için hatırlatma günlerini seç.</p></div><button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((value) => !value)} className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-background transition ${enabled ? "left-6" : "left-1"}`} /></button></div><fieldset disabled={!enabled} className="mt-6 grid gap-3 sm:grid-cols-2"><legend className="mb-3 text-sm font-medium">Ne zaman?</legend>{options.map((option) => <label key={option.days} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent"><input type="checkbox" checked={days.includes(option.days)} onChange={() => toggleDay(option.days)} className="h-4 w-4 accent-primary" />{option.label}</label>)}</fieldset><p className="mt-5 text-xs text-muted-foreground">Kategori varsayılanları: {defaultDays.join(", ")} gün önce. Hatırlatmalar 09:00&apos;da gönderilir.</p><div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5"><p className="text-sm text-muted-foreground" role="status">{message}</p><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}{saving ? "Kaydediliyor..." : "Kaydet"}</Button></div></form>;
}
