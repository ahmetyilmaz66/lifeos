import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const reminderFields = "id, life_item_id, remind_at, status, channel, created_at";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (authError || !userId) {
    return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });
  }

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select(reminderFields)
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("remind_at", { ascending: true });

  if (error) {
    console.error("Pending reminders query failed", {
      code: error.code,
      type: error.name,
    });
    return NextResponse.json({ error: "Hatırlatmalar alınamadı." }, { status: 500 });
  }

  return NextResponse.json({ count: reminders?.length ?? 0, reminders: reminders ?? [] });
}
