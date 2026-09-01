import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeReminderDays, reconcileRemindersForItem } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const requestSchema = z.object({
  reminderEnabled: z.boolean(),
  reminderDays: z.array(z.unknown()),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Life Item bulunamadı." }, { status: 404 });

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });

  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz hatırlatma ayarları." }, { status: 400 });
  const normalized = normalizeReminderDays(body.data.reminderDays);
  if (!normalized.valid) return NextResponse.json({ error: "Geçersiz hatırlatma günleri." }, { status: 400 });

  const { data: item, error: itemError } = await supabase.from("life_items").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (itemError || !item) return NextResponse.json({ error: "Life Item bulunamadı." }, { status: 404 });

  const { error: updateError } = await supabase.from("life_items").update({ reminder_enabled: body.data.reminderEnabled, reminder_days: normalized.days }).eq("id", id).eq("user_id", userId);
  if (updateError) {
    console.error("Reminder settings update failed", { code: updateError.code, type: updateError.name });
    return NextResponse.json({ error: "Hatırlatma ayarları kaydedilemedi." }, { status: 500 });
  }

  const reconciliation = await reconcileRemindersForItem(supabase, userId, id);
  if (reconciliation.error) {
    console.error("Reminder reconciliation failed", { type: reconciliation.error.name });
    return NextResponse.json({ error: "Hatırlatma ayarları kaydedilemedi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: reconciliation.deleted, createdAttempted: reconciliation.createdAttempted });
}
