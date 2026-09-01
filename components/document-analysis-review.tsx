"use client";

import { useState } from "react";
import { Check, Loader2, ScanSearch, X } from "lucide-react";

type Analysis = { id: string; document_id: string; document_type: string | null; category: string; title: string | null; provider: string | null; amount: number | null; currency: string | null; start_date: string | null; end_date: string | null; next_due_date: string | null; recurrence: string | null; description: string | null; confidence: number; warnings: string[] };
const categories = ["digital_subscription", "bill", "vehicle", "product", "warranty", "document", "home", "family", "other"] as const;

const fields = [
  ["title", "Başlık", "text"], ["provider", "Sağlayıcı", "text"], ["amount", "Tutar", "number"], ["currency", "Para birimi", "text"],
  ["start_date", "Başlangıç tarihi", "date"], ["end_date", "Bitiş tarihi", "date"], ["next_due_date", "Sonraki tarih", "date"], ["recurrence", "Tekrarlama", "text"],
] as const;

export default function DocumentAnalysisReview({ documentId, initialAnalysis }: { documentId: string; initialAnalysis?: Analysis }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(initialAnalysis ?? null);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(([key]) => [key, String(initialAnalysis?.[key as keyof Analysis] ?? "")] )));
  const [category, setCategory] = useState(initialAnalysis?.category ?? "other");
  const [documentType, setDocumentType] = useState(initialAnalysis?.document_type ?? "");
  const [description, setDescription] = useState(initialAnalysis?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function analyze() {
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/documents/${documentId}/analyze`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) setMessage(payload?.error ?? "Belge analizi tamamlanamadı.");
    else if (payload.analysis) { setAnalysis(payload.analysis); setCategory(payload.analysis.category); setDocumentType(payload.analysis.document_type ?? ""); setDescription(payload.analysis.description ?? ""); setValues(Object.fromEntries(fields.map(([key]) => [key, String(payload.analysis[key] ?? "")] ))); }
    setBusy(false);
  }

  async function confirm() {
    if (!analysis) return;
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/documents/${documentId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, documentType: documentType || null, amount: values.amount ? Number(values.amount) : null, category, description: description || null, startDate: values.start_date || null, endDate: values.end_date || null, nextDueDate: values.next_due_date || null }) });
    const payload = await response.json().catch(() => null);
    setMessage(response.ok ? "LifeOS'a eklendi." : payload?.error ?? "Kayıt oluşturulamadı.");
    setBusy(false);
  }

  if (!analysis) return <button type="button" disabled={busy} onClick={analyze} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />} Analiz Et</button>;
  const confidenceLabel = analysis.confidence >= 0.8 ? "Yüksek güven" : analysis.confidence >= 0.5 ? "Orta güven" : "Kontrol önerilir";
  return <div className="mt-4 space-y-4 rounded-lg border border-border bg-muted/30 p-4"><div className="flex items-center justify-between"><h3 className="font-medium">LifeOS bunları buldu</h3><span className="text-xs text-muted-foreground">{confidenceLabel}</span></div><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span className="text-muted-foreground">Tür</span><input value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring" /></label><label className="space-y-1 text-sm"><span className="text-muted-foreground">Kategori</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{fields.map(([key, label, type]) => <label key={key} className="space-y-1 text-sm"><span className="text-muted-foreground">{label}</span><input type={type} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring" /></label>)}<label className="space-y-1 text-sm sm:col-span-2"><span className="text-muted-foreground">Açıklama</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-1 focus:ring-ring" /></label></div>{analysis.warnings?.length > 0 && <p className="text-sm text-amber-700">{analysis.warnings.join(" ")}</p>}<div className="flex gap-2"><button type="button" disabled={busy} onClick={confirm} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} LifeOS&apos;a Ekle</button><button type="button" onClick={() => { setAnalysis(null); setMessage(null); }} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-background"><X size={15} /> İptal</button></div>{message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}</div>;
}