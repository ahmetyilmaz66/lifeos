import { Settings } from "lucide-react";
import { redirect } from "next/navigation";

import SettingsForm from "@/components/settings-form";
import AccountDangerZone from "@/components/account-danger-zone";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name, timezone, locale").eq("id", userId).maybeSingle();

  return (
    <div className="max-w-2xl space-y-8">
      <div><p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Settings size={16} /> Hesap</p><h1 className="text-3xl font-semibold tracking-tight">Ayarlar</h1><p className="mt-3 text-muted-foreground">Profil bilgilerini ve tercihlerini yönet.</p></div>
      <SettingsForm profile={{ full_name: profile?.full_name ?? "", timezone: profile?.timezone ?? "", locale: profile?.locale ?? "" }} userId={userId} />
      <AccountDangerZone />
    </div>
  );
}