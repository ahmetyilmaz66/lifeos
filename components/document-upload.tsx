"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);
const acceptedExtensions = ".pdf,.jpg,.jpeg,.png,.webp";
const maxFileSize = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? "belge";
  const namePart = baseName.replace(/\.[^.]*$/, "");
  const extensionMatch = baseName.match(/\.([a-zA-Z0-9]{1,10})$/);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : "";
  const name = namePart.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "belge";
  return `${name}-${crypto.randomUUID().slice(0, 8)}${extension}`;
}

export default function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"file" | "photo" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [textValue, setTextValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function chooseFile(nextFile: File | undefined) {
    setError(null); setMessage(null);
    if (!nextFile) return;
    if (!acceptedTypes.has(nextFile.type)) { setFile(null); setError("Yalnızca PDF, JPG, JPEG, PNG veya WEBP yükleyebilirsin."); return; }
    if (nextFile.size > maxFileSize) { setFile(null); setError("Dosya boyutu 10 MB'dan büyük olamaz."); return; }
    setFile(nextFile);
  }

  async function uploadFile() {
    const effectiveFile = mode === "text" ? (textValue.trim() ? new File([textValue.trim()], "metin.txt", { type: "text/plain" }) : null) : file;
    if (!effectiveFile) return;
    setUploading(true); setError(null); setMessage(null);
    const supabase = createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (authError || !userId) { setError("Belge yüklemek için giriş yapmalısın."); setUploading(false); return; }
    const documentId = crypto.randomUUID();
    const storagePath = `${userId}/${documentId}/${sanitizeFileName(effectiveFile.name)}`;
    const { error: uploadError } = await supabase.storage.from("lifeos-documents").upload(storagePath, effectiveFile, { contentType: effectiveFile.type, upsert: false });
    if (uploadError) { setError("Belge yüklenemedi. Bucket ve storage policy ayarlarını kontrol et."); setUploading(false); return; }
    const { error: insertError } = await supabase.from("documents").insert({ id: documentId, user_id: userId, file_name: sanitizeFileName(effectiveFile.name), file_type: effectiveFile.type, storage_path: storagePath, file_size: effectiveFile.size, processing_status: "uploaded" });
    if (insertError) {
      await supabase.storage.from("lifeos-documents").remove([storagePath]);
      setError("Belge kaydı oluşturulamadı; yüklenen dosya temizlendi."); setUploading(false); return;
    }
    setFile(null); setTextValue(""); setMessage("Belgen LifeOS'a eklendi. Analiz için hazır."); setUploading(false); router.refresh();
  }

  return <div className="space-y-5 rounded-xl border border-border bg-card p-6 sm:p-8">
    <div><h2 className="text-lg font-semibold">Belge yükle</h2><p className="mt-1 text-sm text-muted-foreground">PDF, JPG, JPEG, PNG, WEBP veya metin · En fazla 10 MB</p></div>
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1"><button type="button" onClick={() => setMode("file")} className={`rounded-md px-2 py-2 text-sm ${mode === "file" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>Dosya yükle</button><button type="button" onClick={() => setMode("photo")} className={`rounded-md px-2 py-2 text-sm ${mode === "photo" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>Fotoğraf</button><button type="button" onClick={() => setMode("text")} className={`rounded-md px-2 py-2 text-sm ${mode === "text" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>Metin gir</button></div>
    {mode === "text" ? <textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} rows={6} placeholder="Örn: Netflix Premium aboneliğim ayda 349 TL, her ayın 14'ünde ödeniyor." className="w-full rounded-lg border border-border bg-background p-4 text-sm outline-none focus:ring-1 focus:ring-ring" /> : <button type="button" className={`flex min-h-44 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${dragging ? "border-primary bg-accent" : "border-border hover:border-muted-foreground"}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}><UploadCloud className="mb-3 text-muted-foreground" size={30} /><span className="font-medium">{mode === "photo" ? "Fotoğrafı sürükleyip bırak veya seç" : "Dosyanı sürükleyip bırak veya seç"}</span><span className="mt-1 text-sm text-muted-foreground">Güvenli ve özel depolama</span><input ref={inputRef} className="hidden" type="file" accept={acceptedExtensions} capture={mode === "photo" ? "environment" : undefined} onChange={(event) => chooseFile(event.target.files?.[0])} /></button>}
    {file && <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm"><span className="flex min-w-0 items-center gap-2"><FileUp size={17} /><span className="truncate">{file.name}</span></span><button type="button" aria-label="Dosyayı kaldır" onClick={() => setFile(null)}><X size={17} /></button></div>}
    {uploading && <div className="space-y-2" aria-live="polite"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 animate-pulse rounded-full bg-primary" /></div><p className="text-sm text-muted-foreground">Belge yükleniyor...</p></div>}
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    {message && <p className="flex items-center gap-2 text-sm text-green-700" role="status"><CheckCircle2 size={17} /> {message}</p>}
    <Button type="button" disabled={(mode === "text" ? !textValue.trim() : !file) || uploading} onClick={uploadFile}>{uploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}{uploading ? "Yükleniyor..." : "Belgeyi yükle"}</Button>
  </div>;
}