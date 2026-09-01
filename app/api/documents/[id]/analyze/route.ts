import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeDocument } from "@/lib/ai/analyze-document";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const activeRequests = new Set<string>();
const requestTimeoutMs = 30_000;

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  void request;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return publicError("Geçersiz belge.", 400);

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (authError || !userId) return publicError("Bu işlem için giriş yapmalısın.", 401);
  if (activeRequests.has(userId)) return publicError("Başka bir analiz devam ediyor.", 429);

  const { data: document, error: documentError } = await supabase.from("documents").select("id, user_id, file_name, file_type, storage_path, processing_status").eq("id", id).eq("user_id", userId).maybeSingle();
  if (documentError || !document) return publicError("Belge bulunamadı.", 404);
  if (document.processing_status === "completed") return publicError("Bu belge zaten tamamlandı.", 409);

  const { data: existingAnalysis } = await supabase.from("document_analyses").select("*").eq("document_id", id).eq("user_id", userId).maybeSingle();
  if (existingAnalysis && document.processing_status === "needs_review") return NextResponse.json({ analysis: existingAnalysis });

  activeRequests.add(userId);
  await supabase.from("documents").update({ processing_status: "processing" }).eq("id", id).eq("user_id", userId);
  try {
    const { data: file, error: downloadError } = await supabase.storage.from("lifeos-documents").download(document.storage_path);
    if (downloadError || !file) throw new Error("DOCUMENT_DOWNLOAD_FAILED");
    const result = await Promise.race([
      analyzeDocument({ fileName: document.file_name, fileType: document.file_type, content: Buffer.from(await file.arrayBuffer()) }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), requestTimeoutMs)),
    ]);
    const { data: analysis, error: analysisError } = await supabase.from("document_analyses").upsert({ user_id: userId, document_id: id, document_type: result.documentType, category: result.category, title: result.title, provider: result.provider, amount: result.amount, currency: result.currency, start_date: result.startDate, end_date: result.endDate, next_due_date: result.nextDueDate, recurrence: result.recurrence, description: result.description, confidence: result.confidence, extracted_fields: result.extractedFields, warnings: result.warnings, updated_at: new Date().toISOString() }, { onConflict: "document_id" }).select().single();
    if (analysisError || !analysis) throw new Error("ANALYSIS_SAVE_FAILED");
    await supabase.from("documents").update({ processing_status: "needs_review" }).eq("id", id).eq("user_id", userId);
    return NextResponse.json({ analysis });
  } catch (error) {
    await supabase.from("documents").update({ processing_status: "failed" }).eq("id", id).eq("user_id", userId);
    if (error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED") return publicError("AI analiz servisi henüz yapılandırılmadı.", 503);
    if (error instanceof Error && error.message === "UNSUPPORTED_DOCUMENT_TYPE") return publicError("Bu belge türü analiz için desteklenmiyor.", 415);
    return publicError("Belge analizi tamamlanamadı.", 503);
  } finally {
    activeRequests.delete(userId);
  }
}