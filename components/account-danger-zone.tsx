"use client";

import { useState } from "react";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const confirmWord = "SİL";

export default function AccountDangerZone() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setExportError(null);
    const response = await fetch("/api/account/export");
    if (!response.ok) {
      setExportError("Veriler indirilemedi. Lütfen tekrar dene.");
      setExporting(false);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lifeos-veri.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function deleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    const response = await fetch("/api/account", { method: "DELETE" });
    if (!response.ok) {
      setDeleteError("Hesap silinemedi. Lütfen tekrar dene.");
      setDeleting(false);
      return;
    }
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-semibold">Verilerini indir</h2>
        <p className="mt-2 text-sm text-muted-foreground">Kayıtlarını, belgelerini ve hatırlatmalarını JSON olarak indir.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={exportData} disabled={exporting}>
          <Download size={16} />
          {exporting ? "Hazırlanıyor..." : "Verilerimi indir"}
        </Button>
        {exportError && <p className="mt-3 text-sm text-destructive" role="alert">{exportError}</p>}
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-destructive">
          <TriangleAlert size={18} />
          <h2 className="font-semibold">Hesabı sil</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu işlem geri alınamaz. Tüm kayıtların, belgelerin, analizlerin ve hatırlatmaların kalıcı olarak silinir.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="confirm-delete">Onaylamak için &quot;{confirmWord}&quot; yaz</Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={confirmWord}
            className="max-w-[200px]"
          />
        </div>
        {deleteError && <p className="mt-3 text-sm text-destructive" role="alert">{deleteError}</p>}
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          disabled={confirmText !== confirmWord || deleting}
          onClick={deleteAccount}
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <TriangleAlert size={16} />}
          {deleting ? "Siliniyor..." : "Hesabımı kalıcı olarak sil"}
        </Button>
      </div>
    </div>
  );
}
