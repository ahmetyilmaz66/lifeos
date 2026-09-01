import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });

  const admin = createAdminClient();

  const { data: files, error: listError } = await admin.storage.from("lifeos-documents").list(userId, { limit: 1000 });
  if (listError) {
    console.error("Account deletion: storage list failed", { code: listError.name, message: listError.message });
    return NextResponse.json({ error: "Hesap silinemedi. Lütfen tekrar dene." }, { status: 500 });
  }
  if (files?.length) {
    const paths = files.map((file) => `${userId}/${file.name}`);
    const { error: removeError } = await admin.storage.from("lifeos-documents").remove(paths);
    if (removeError) {
      console.error("Account deletion: storage cleanup failed", { code: removeError.name, message: removeError.message });
      return NextResponse.json({ error: "Hesap silinemedi. Lütfen tekrar dene." }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("Account deletion failed", { message: deleteError.message });
    return NextResponse.json({ error: "Hesap silinemedi. Lütfen tekrar dene." }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
