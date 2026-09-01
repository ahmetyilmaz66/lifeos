import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { documentCategories } from "@/lib/ai/types";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(documentCategories),
});

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return profile?.is_admin ? userId : null;
}

export async function POST(request: Request) {
  const adminUserId = await requireAdmin();
  if (!adminUserId) return NextResponse.json({ error: "Bu işlem için admin yetkisi gerekiyor." }, { status: 403 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Geçersiz sağlayıcı bilgisi." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("providers").insert({ name: body.data.name, category: body.data.category }).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Bu sağlayıcı zaten kayıtlı." }, { status: 409 });
    console.error("Provider create failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Sağlayıcı oluşturulamadı." }, { status: 500 });
  }
  return NextResponse.json({ provider: data });
}
