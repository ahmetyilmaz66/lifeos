import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", body.data.endpoint);
  if (error) {
    console.error("Push unsubscribe failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Abonelik kaldırılamadı." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
