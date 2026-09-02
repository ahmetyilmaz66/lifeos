"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ImageIcon, Loader2, Mic, MicOff, Type, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);
const maxFileSize = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? "belge";
  const namePart = baseName.replace(/\.[^.]*$/, "");
  const extensionMatch = baseName.match(/\.([a-zA-Z0-9]{1,10})$/);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : "";
  const name = namePart.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "belge";
  return `${name}-${crypto.randomUUID().slice(0, 8)}${extension}`;
}

const categories = ["digital_subscription", "bill", "vehicle", "product", "warranty", "document", "home", "family", "other"] as const;
const categoryLabels: Record<string, string> = {
  digital_subscription: "Abonelik", bill: "Fatura", vehicle: "Araç", product: "Ürün",
  warranty: "Garanti", document: "Belge", home: "Ev", family: "Aile", other: "Diğer",
};

type Analysis = {
  documentType: string | null;
  category: string;
  title: string | null;
  provider: string | null;
  amount: number | null;
  currency: string | null;
  startDate: string | null;
  endDate: string | null;
  nextDueDate: string | null;
  recurrence: string | null;
  description: string | null;
  confidence: number;
  warnings: string[];
};

export default function QuickCapture() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "text" | "working" | "review">("idle");
  const [textInput, setTextInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<(typeof categories)[number]>("other");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
    return () => recognitionRef.current?.stop();
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;
    const baseText = textInput.trim();
    // Rebuild from all results each time (not just the incremental slice) so
    // there's one stable source of truth — avoids double-appending text.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${transcript} `;
        else interimText += transcript;
      }
      const combined = [baseText, finalText.trim()].filter(Boolean).join(" ");
      setTextInput(interimText ? `${combined} ${interimText}` : combined);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!acceptedTypes.has(file.type)) {
      setError("Yalnızca PDF, JPG, PNG veya WEBP olabilir.");
      return;
    }
    if (file.size > maxFileSize) {
      setError("Dosya 10 MB'dan büyük olamaz.");
      return;
    }

    setStage("working");
    setMessage("Yükleniyor...");
    const supabase = createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (authError || !userId) {
      setError("Bu işlem için giriş yapmalısın.");
      setStage("idle");
      return;
    }

    const docId = crypto.randomUUID();
    const storagePath = `${userId}/${docId}/${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("lifeos-documents").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setError("Belge yüklenemedi. Lütfen tekrar dene.");
      setStage("idle");
      return;
    }
    const { error: insertError } = await supabase.from("documents").insert({
      id: docId, user_id: userId, file_name: sanitizeFileName(file.name), file_type: file.type,
      storage_path: storagePath, file_size: file.size, processing_status: "uploaded",
    });
    if (insertError) {
      await supabase.storage.from("lifeos-documents").remove([storagePath]);
      setError("Kayıt oluşturulamadı. Lütfen tekrar dene.");
      setStage("idle");
      return;
    }
    setDocumentId(docId);

    setMessage("LifeOS analiz ediyor...");
    const response = await fetch(`/api/documents/${docId}/analyze`, { method: "POST" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.analysis) {
      setError(payload?.error ?? "Analiz tamamlanamadı. Belgeler sayfasından tekrar deneyebilirsin.");
      setStage("idle");
      return;
    }

    const a = payload.analysis as Analysis;
    setAnalysis(a);
    setCategory((a.category as (typeof categories)[number]) ?? "other");
    setValues({
      title: a.title ?? "",
      provider: a.provider ?? "",
      amount: a.amount !== null && a.amount !== undefined ? String(a.amount) : "",
      currency: a.currency ?? "TRY",
      start_date: a.startDate ?? "",
      end_date: a.endDate ?? "",
      next_due_date: a.nextDueDate ?? "",
      recurrence: a.recurrence ?? "",
    });
    setStage("review");
  }

  async function confirm() {
    if (!documentId) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/documents/${documentId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentType: analysis?.documentType ?? null,
        category,
        title: values.title || null,
        provider: values.provider || null,
        amount: values.amount ? Number(values.amount) : null,
        currency: values.currency || null,
        startDate: values.start_date || null,
        endDate: values.end_date || null,
        nextDueDate: values.next_due_date || null,
        recurrence: values.recurrence || null,
        description: analysis?.description ?? null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Kaydedilemedi. Lütfen tekrar dene.");
      setSaving(false);
      return;
    }
    router.push(payload.id ? `/dashboard/items/${payload.id}` : "/dashboard");
    router.refresh();
  }

  function reset() {
    setStage("idle");
    setAnalysis(null);
    setDocumentId(null);
    setError(null);
    setTextInput("");
  }

  function submitText() {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    const file = new File([trimmed], "metin.txt", { type: "text/plain" });
    handleFile(file);
  }

  if (stage === "working") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-20 text-center">
        <Loader2 className="animate-spin text-violet-400" size={32} />
        <p className="font-medium">{message}</p>
      </div>
    );
  }

  if (stage === "review" && analysis) {
    const confidenceLabel = analysis.confidence >= 0.8 ? "Yüksek güven" : analysis.confidence >= 0.5 ? "Orta güven" : "Kontrol önerilir";
    return (
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">LifeOS bunu buldu</h2>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{confidenceLabel}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Başlık</span>
            <input value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Kategori</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring">
              {categories.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Sağlayıcı</span>
            <input value={values.provider} onChange={(event) => setValues({ ...values, provider: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Tutar</span>
            <input type="number" value={values.amount} onChange={(event) => setValues({ ...values, amount: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Sonraki tarih</span>
            <input type="date" value={values.next_due_date} onChange={(event) => setValues({ ...values, next_due_date: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Tekrarlama</span>
            <input value={values.recurrence} onChange={(event) => setValues({ ...values, recurrence: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 outline-none focus:ring-1 focus:ring-ring" />
          </label>
        </div>
        {analysis.warnings?.length > 0 && <p className="text-sm text-amber-500">{analysis.warnings.join(" ")}</p>}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex gap-2">
          <button type="button" disabled={saving} onClick={confirm} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-900/30 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "Kaydediliyor..." : "Hayatıma Ekle"}
          </button>
          <button type="button" onClick={reset} aria-label="İptal" className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm hover:bg-accent">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (stage === "text") {
    return (
      <div className="space-y-3">
        <div className="relative">
          <textarea
            autoFocus
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            rows={8}
            placeholder="Örn: Netflix Premium aboneliğim ayda 349 TL, her ayın 14'ünde ödeniyor. Ya da mikrofona konuş."
            className="w-full rounded-2xl border border-border bg-card p-4 pb-14 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              aria-label={listening ? "Dinlemeyi durdur" : "Mikrofonla konuş"}
              className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full transition ${
                listening ? "animate-pulse bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-md shadow-violet-900/30" : "border border-border bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
          )}
        </div>
        {listening && <p className="text-xs text-violet-400">Dinliyorum... bitirince mikrofona tekrar bas.</p>}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!textInput.trim()}
            onClick={submitText}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-md shadow-violet-900/30 disabled:opacity-50"
          >
            <Check size={16} /> Analiz Et
          </button>
          <button type="button" onClick={reset} aria-label="İptal" className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm hover:bg-accent">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
      <input ref={galleryInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-6 text-base font-semibold text-white shadow-lg shadow-violet-900/30"
      >
        <Camera size={22} /> Fotoğraf Çek
      </button>
      <button
        type="button"
        onClick={() => galleryInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-4 text-sm font-medium text-foreground hover:bg-accent"
      >
        <ImageIcon size={18} /> Galeriden veya Dosyadan Seç
      </button>
      <button
        type="button"
        onClick={() => setStage("text")}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-4 text-sm font-medium text-foreground hover:bg-accent"
      >
        <Type size={18} /> Metin Gir
      </button>
      <p className="text-center text-xs text-muted-foreground">PDF, JPG, PNG, WEBP veya metin · En fazla 10 MB</p>
    </div>
  );
}
