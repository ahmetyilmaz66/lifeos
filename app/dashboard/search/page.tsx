import { redirect } from "next/navigation";
import { Search } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import SearchAssistant from "@/components/search-assistant";

export default async function SearchPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Search size={16} /> LifeOS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Ara</h1>
        <p className="mt-2 text-muted-foreground">Hayatındaki kayıtlar hakkında doğal dille soru sor.</p>
      </div>
      <SearchAssistant />
    </div>
  );
}
