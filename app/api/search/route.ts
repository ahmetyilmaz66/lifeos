import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { answerLifeOSQuestion } from "@/lib/ai/answer-question";
import { todayInIstanbul, type LifeItem } from "@/lib/lifeos";

const bodySchema = z.object({ question: z.string().trim().min(1).max(500) });
const activeRequests = new Set<string>();
const requestTimeoutMs = 20_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bir soru yazmalısın." }, { status: 400 });

  if (activeRequests.has(userId)) return NextResponse.json({ error: "Başka bir arama devam ediyor." }, { status: 429 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI arama servisi henüz yapılandırılmadı." }, { status: 503 });

  activeRequests.add(userId);
  try {
    const { data: items, error: itemsError } = await supabase
      .from("life_items")
      .select("*")
      .eq("user_id", userId)
      .order("next_due_date", { ascending: true, nullsFirst: false });
    if (itemsError) return NextResponse.json({ error: "Veriler alınamadı." }, { status: 500 });

    const answer = await Promise.race([
      answerLifeOSQuestion(apiKey, body.data.question, (items ?? []) as LifeItem[], todayInIstanbul()),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), requestTimeoutMs)),
    ]);
    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_TIMEOUT") return NextResponse.json({ error: "Arama zaman aşımına uğradı." }, { status: 504 });
    console.error("Search failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Arama tamamlanamadı." }, { status: 503 });
  } finally {
    activeRequests.delete(userId);
  }
}
