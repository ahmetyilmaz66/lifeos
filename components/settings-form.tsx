"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = { full_name: string; timezone: string; locale: string };

export default function SettingsForm({ profile, userId }: { profile: Profile; userId: string }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", userId);
    setSaving(false);
    setStatus(error ? "Profil güncellenemedi." : "Profil güncellendi.");
  }

  return (
    <form onSubmit={saveProfile} className="space-y-6 rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="space-y-2"><Label htmlFor="full_name">Ad soyad</Label><Input id="full_name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} /></div>
      <div className="grid gap-6 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="timezone">Zaman dilimi</Label><Input id="timezone" value={profile.timezone || "Belirtilmemiş"} readOnly /></div><div className="space-y-2"><Label htmlFor="locale">Dil</Label><Input id="locale" value={profile.locale || "Belirtilmemiş"} readOnly /></div></div>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-6"><p className="text-sm text-muted-foreground" aria-live="polite">{status}</p><Button type="submit" disabled={saving}><Save size={16} />{saving ? "Kaydediliyor..." : "Kaydet"}</Button></div>
    </form>
  );
}