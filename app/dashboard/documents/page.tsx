import { FileText, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import DocumentDeleteButton from "@/components/document-delete-button";
import DocumentAnalysisReview from "@/components/document-analysis-review";
import DocumentUpload from "@/components/document-upload";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const [{ data: documents, error }, { data: analyses }] = await Promise.all([
    supabase.from("documents").select("id, file_name, file_type, file_size, processing_status, created_at, storage_path").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("document_analyses").select("*").eq("user_id", userId),
  ]);
  const analysisByDocument = new Map((analyses ?? []).map((analysis) => [analysis.document_id, analysis]));

  return <div className="space-y-8">
    <div><p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"><FileText size={16} /> Kişisel arşiv</p><h1 className="text-3xl font-semibold tracking-tight">Belgeler</h1><p className="mt-3 text-muted-foreground">Önemli belgelerini güvenli ve düzenli bir yerde tut.</p></div>
    <DocumentUpload />
    <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Belgelerim</h2><span className="text-sm text-muted-foreground">{error ? "" : `${documents?.length ?? 0} belge`}</span></div>{error ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"><p className="text-sm text-destructive">Belgelerin yüklenemedi. Lütfen tekrar dene.</p></div> : !documents?.length ? <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center"><Plus className="mx-auto text-muted-foreground" size={24} /><p className="mt-4 text-sm text-muted-foreground">Henüz yüklenmiş bir belgen yok.</p></div> : <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="divide-y divide-border">{documents.map((document) => { const analysis = analysisByDocument.get(document.id); return <div key={document.id} className="p-4 sm:p-5"><div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><FileText size={18} className="text-muted-foreground" /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{document.file_name}</p><p className="mt-1 text-xs text-muted-foreground">{document.file_type.split("/").pop()?.toUpperCase()} · {formatBytes(document.file_size)} · {new Date(document.created_at).toLocaleDateString("tr-TR")}</p></div></div><div className="flex shrink-0 items-center gap-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{document.processing_status === "needs_review" ? "İnceleme gerekiyor" : document.processing_status === "processing" ? "Analiz ediliyor" : document.processing_status === "completed" ? "Tamamlandı" : document.processing_status === "failed" ? "Analiz başarısız" : "Yüklendi"}</span><DocumentDeleteButton documentId={document.id} storagePath={document.storage_path} /></div></div>{document.processing_status !== "completed" && <DocumentAnalysisReview documentId={document.id} initialAnalysis={analysis} />}</div>; })}</div></div>}</section>
  </div>;
}