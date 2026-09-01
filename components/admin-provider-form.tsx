"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categories = ["digital_subscription", "bill", "vehicle", "product", "warranty", "document", "home", "family", "other"] as const;

export default function AdminProviderForm({ initialName = "" }: { initialName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<(typeof categories)[number]>("other");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.error ?? "Sağlayıcı oluşturulamadı.");
    } else {
      setName("");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="provider-name">Sağlayıcı adı</Label>
        <Input id="provider-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Örnek A.Ş." className="w-56" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="provider-category">Kategori</Label>
        <select
          id="provider-category"
          value={category}
          onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
          className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
        >
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={saving || !name}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Ekle
      </Button>
      {message && <p className="w-full text-sm text-destructive" role="alert">{message}</p>}
    </form>
  );
}
