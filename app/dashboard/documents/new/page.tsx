import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import QuickCapture from "@/components/quick-capture";

export default async function NewDocumentPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Sparkles size={16} /> LifeOS</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hayatıma Ekle</h1>
        <p className="mt-2 text-sm text-muted-foreground">Fotoğraf çek veya seç, LifeOS gerisini halletsin.</p>
      </div>
      <QuickCapture />
    </div>
  );
}
