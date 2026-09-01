import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9_]+$/, "Sadece küçük harf, rakam ve alt çizgi kullan."),
  nameTr: z.string().trim().min(1).max(80),
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
  if (!body.success) return NextResponse.json({ error: "Geçersiz kategori bilgisi." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("categories").insert({ slug: body.data.slug, name_tr: body.data.nameTr }).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Bu slug zaten kullanılıyor." }, { status: 409 });
    console.error("Category create failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Kategori oluşturulamadı." }, { status: 500 });
  }
  return NextResponse.json({ category: data });
}
