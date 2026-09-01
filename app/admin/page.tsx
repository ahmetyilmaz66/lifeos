import { redirect } from "next/navigation";
import { FileText, ScanSearch, ShieldCheck, Users, WalletCards } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminCategoryForm from "@/components/admin-category-form";

// Rough, clearly-labeled estimate only — Gemini calls aren't metered per-request yet.
const estimatedCostPerAnalysisUsd = 0.01;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ count: userCount }, { count: documentCount }, { count: analysisCount }, { count: lifeItemCount }, { count: remindersSentCount }, { data: categories }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("documents").select("id", { count: "exact", head: true }),
    admin.from("document_analyses").select("id", { count: "exact", head: true }),
    admin.from("life_items").select("id", { count: "exact", head: true }),
    admin.from("reminders").select("id", { count: "exact", head: true }).eq("status", "sent"),
    admin.from("categories").select("id, slug, name_tr, created_at").order("name_tr"),
  ]);

  const estimatedCostUsd = (analysisCount ?? 0) * estimatedCostPerAnalysisUsd;
  const stats = [
    ["Toplam kullanıcı", userCount ?? 0, Users],
    ["Toplam belge", documentCount ?? 0, FileText],
    ["AI analizi", analysisCount ?? 0, ScanSearch],
    ["Life Item kaydı", lifeItemCount ?? 0, WalletCards],
    ["Gönderilen hatırlatma", remindersSentCount ?? 0, ShieldCheck],
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-10 lg:px-10">
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">LifeOS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-muted-foreground">Ödeme sistemi henüz kurulmadığı için ücretli/free kullanıcı ve abonelik metrikleri bu sürümde yok — yalnızca gerçekten var olan veriler gösteriliyor.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon size={17} className="text-muted-foreground" />
            </div>
            <p className="mt-5 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Tahmini AI maliyeti</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Analiz başına ~${estimatedCostPerAnalysisUsd.toFixed(2)} kaba tahminle: toplam ~${estimatedCostUsd.toFixed(2)}. Bu, gerçek Gemini kullanım faturasından farklı olabilir — tam maliyet takibi ileride eklenecek.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Kategoriler</h2>
          <p className="mt-1 text-sm text-muted-foreground">Yeni sağlayıcı/tür kategorisi ekle.</p>
        </div>
        <AdminCategoryForm />
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
          {categories?.length ? categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{category.name_tr}</p>
                <p className="text-sm text-muted-foreground">{category.slug}</p>
              </div>
            </div>
          )) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">Henüz kategori yok.</p>}
        </div>
      </section>
    </div>
  );
}
