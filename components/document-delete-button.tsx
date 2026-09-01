"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DocumentDeleteButton({ documentId, storagePath }: { documentId: string; storagePath: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteDocument() {
    if (!window.confirm("Bu belge silinsin mi?")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: storageError } = await supabase.storage.from("lifeos-documents").remove([storagePath]);
    if (storageError) { setDeleting(false); return; }
    const { error: databaseError } = await supabase.from("documents").delete().eq("id", documentId);
    if (databaseError) { setDeleting(false); return; }
    router.refresh();
  }

  return <button type="button" aria-label="Belgeyi sil" disabled={deleting} onClick={deleteDocument} className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">{deleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}</button>;
}