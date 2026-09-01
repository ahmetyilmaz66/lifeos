import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });

  const [{ data: profile }, { data: lifeItems }, { data: documents }, { data: analyses }, { data: reminders }] = await Promise.all([
    supabase.from("profiles").select("full_name, timezone, locale, created_at").eq("id", userId).maybeSingle(),
    supabase.from("life_items").select("*").eq("user_id", userId),
    supabase.from("documents").select("id, file_name, file_type, file_size, processing_status, created_at").eq("user_id", userId),
    supabase.from("document_analyses").select("*").eq("user_id", userId),
    supabase.from("reminders").select("id, life_item_id, remind_at, status, channel, sent_at, created_at").eq("user_id", userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile ?? null,
    life_items: lifeItems ?? [],
    documents: documents ?? [],
    document_analyses: analyses ?? [],
    reminders: reminders ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lifeos-veri-${userId}.json"`,
    },
  });
}
