"use client";

import { useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";

const examples = [
  "Gelecek ay hangi aboneliklerim var?",
  "Bu ay toplam ne kadar ödeme yapacağım?",
  "En pahalı aboneliğim hangisi?",
  "Hangi garantilerim bu yıl bitiyor?",
];

export default function SearchAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: trimmed }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) setError(payload?.error ?? "Arama tamamlanamadı.");
    else setAnswer(payload.answer);
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-sm"
      >
        <Search size={18} className="shrink-0 text-muted-foreground" />
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ör. Bu ay toplam ne kadar ödeme yapacağım?"
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-sm shadow-violet-900/30 transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Sor
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuestion(example);
              ask(example);
            }}
            disabled={busy}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      {busy && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> LifeOS verilerini inceliyor...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
      {answer && !busy && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Sparkles size={14} /> LifeOS</p>
          <p className="leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
