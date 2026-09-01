import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz abonelik bilgisi." }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: body.data.endpoint, p256dh: body.data.keys.p256dh, auth: body.data.keys.auth },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("Push subscribe failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Bildirim aboneliği kaydedilemedi." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
