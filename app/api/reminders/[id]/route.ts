import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const reminderIdSchema = z.string().uuid();

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!reminderIdSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) {
    return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });
  }

  const { data: reminder, error } = await supabase
    .from("reminders")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("user_id", userId)
    .in("status", ["pending", "dismissed"])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Reminder dismiss failed", { code: error.code, type: error.name });
    return NextResponse.json({ error: "Hatırlatma kapatılamadı." }, { status: 500 });
  }
  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: "dismissed" });
}
