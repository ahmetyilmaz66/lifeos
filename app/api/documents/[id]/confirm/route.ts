import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createMissingReminders } from "@/lib/reminders";
import type { LifeItem } from "@/lib/lifeos";

const idSchema = z.string().uuid();
const confirmationSchema = z.object({
  documentType: z.string().trim().max(120).nullable(),
  category: z.enum(["digital_subscription", "bill", "vehicle", "product", "warranty", "document", "home", "family", "other"]),
  title: z.string().trim().max(240).nullable(),
  provider: z.string().trim().max(240).nullable(),
  amount: z.number().finite().nonnegative().nullable(),
  currency: z.string().trim().max(12).nullable(),
  startDate: z.string().date().nullable(),
  endDate: z.string().date().nullable(),
  nextDueDate: z.string().date().nullable(),
  recurrence: z.string().trim().max(120).nullable(),
  description: z.string().trim().max(2000).nullable(),
});

const nullableStringFields = ["documentType", "title", "provider", "currency", "recurrence", "description"] as const;
const dateFields = ["startDate", "endDate", "nextDueDate"] as const;

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  const candidate = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : trimmed;
}

function normalizeConfirmationPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const normalized: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  for (const field of nullableStringFields) {
    if (!(field in normalized)) {
      normalized[field] = null;
    } else if (typeof normalized[field] === "string") {
      const value = normalized[field].trim();
      normalized[field] = value || null;
    }
  }
  for (const field of dateFields) normalized[field] = normalizeDate(normalized[field]);
  for (const field of dateFields) {
    if (!(field in normalized)) normalized[field] = null;
  }
  if (typeof normalized.amount === "string") {
    const value = normalized.amount.trim().replace(",", ".");
    normalized.amount = value ? Number(value) : null;
  } else if (!("amount" in normalized)) {
    normalized.amount = null;
  }
  return normalized;
}

function valueType(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Geçersiz belge." }, { status: 400 });
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Bu işlem için giriş yapmalısın." }, { status: 401 });
  const normalizedPayload = normalizeConfirmationPayload(await request.json().catch(() => null));
  const body = confirmationSchema.safeParse(normalizedPayload);
  if (!body.success) {
    const diagnostics = body.error.issues.map((issue) => {
      const field = issue.path.join(".");
      const value = normalizedPayload && typeof normalizedPayload === "object" && !Array.isArray(normalizedPayload) ? (normalizedPayload as Record<string, unknown>)[field] : normalizedPayload;
      return { field, expected: issue.code === "invalid_type" ? issue.expected : issue.code, received: issue.code === "invalid_type" ? valueType(value) : "invalid" };
    });
    console.warn("Invalid document confirmation payload", diagnostics);
    return NextResponse.json({ error: "Geçersiz onay bilgisi.", fields: diagnostics.map((issue) => issue.field) }, { status: 400 });
  }

  const { data: document } = await supabase.from("documents").select("id, user_id, processing_status").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!document || document.processing_status !== "needs_review") return NextResponse.json({ error: "Belge onaya hazır değil." }, { status: 409 });
  const { data: analysis } = await supabase.from("document_analyses").select("id, document_id").eq("document_id", id).eq("user_id", userId).maybeSingle();
  if (!analysis) return NextResponse.json({ error: "Analiz bulunamadı." }, { status: 404 });

  const { data: existingItem } = await supabase.from("life_items").select("id").eq("source_document_id", id).eq("user_id", userId).maybeSingle();
  if (existingItem) {
    await supabase.from("documents").update({ processing_status: "completed" }).eq("id", id).eq("user_id", userId);
    return NextResponse.json({ id: existingItem.id, alreadyExists: true });
  }

  const values = body.data;
  const { data: item, error: itemError } = await supabase.from("life_items").insert({ user_id: userId, source_document_id: id, title: values.title, category: values.category, provider: values.provider, amount: values.amount, currency: values.currency, start_date: values.startDate, end_date: values.endDate, next_due_date: values.nextDueDate, recurrence: values.recurrence, description: values.description }).select("id").single();
  if (itemError || !item) return NextResponse.json({ error: "LifeOS kaydı oluşturulamadı." }, { status: 500 });
  await createMissingReminders(supabase, { ...values, id: item.id, user_id: userId, title: values.title, category: values.category, start_date: values.startDate, end_date: values.endDate, next_due_date: values.nextDueDate } as LifeItem);
  const { error: statusError } = await supabase.from("documents").update({ processing_status: "completed" }).eq("id", id).eq("user_id", userId);
  if (statusError) return NextResponse.json({ error: "Belge durumu güncellenemedi." }, { status: 500 });
  return NextResponse.json({ id: item.id });
}