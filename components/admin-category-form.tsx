"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminCategoryForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [nameTr, setNameTr] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, nameTr }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.error ?? "Kategori oluşturulamadı.");
    } else {
      setSlug("");
      setNameTr("");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="cat-slug">Slug</Label>
        <Input id="cat-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="ornek_kategori" className="w-48" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Görünen ad</Label>
        <Input id="cat-name" value={nameTr} onChange={(event) => setNameTr(event.target.value)} placeholder="Örnek Kategori" className="w-56" />
      </div>
      <Button type="submit" disabled={saving || !slug || !nameTr}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Ekle
      </Button>
      {message && <p className="w-full text-sm text-destructive" role="alert">{message}</p>}
    </form>
  );
}
