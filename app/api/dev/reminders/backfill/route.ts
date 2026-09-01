import { NextResponse } from "next/server";
import { z } from "zod";

import { createMissingReminders } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";
import type { LifeItem } from "@/lib/lifeos";

const requestSchema = z.object({ lifeItemId: z.string().uuid() });

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz life item." }, { status: 400 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });

  const { data: item, error: itemError } = await supabase.from("life_items").select("*").eq("id", body.data.lifeItemId).eq("user_id", userId).maybeSingle();
  if (itemError || !item) return NextResponse.json({ error: "Life item bulunamadı." }, { status: 404 });

  const generation = await createMissingReminders(supabase, item as LifeItem);
  if (generation.error) return NextResponse.json({ error: "Hatırlatmalar oluşturulamadı." }, { status: 500 });
  const { data: reminders, error: reminderError } = await supabase.from("reminders").select("id, life_item_id, remind_at, status, channel").eq("user_id", userId).eq("life_item_id", item.id).order("remind_at");
  if (reminderError) return NextResponse.json({ error: "Hatırlatmalar doğrulanamadı." }, { status: 500 });
  return NextResponse.json({ attempted: generation.attempted, reminders: reminders ?? [] });
}