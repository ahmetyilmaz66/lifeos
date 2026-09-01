import { addDays, isClosed, type LifeItem, todayInIstanbul } from "./lifeos";
import type { SupabaseClient } from "@supabase/supabase-js";

export const categoryReminderDefaults: Record<string, number[]> = {
  digital_subscription: [3, 1], bill: [3, 1], vehicle: [30, 7, 1], warranty: [30, 7], document: [30, 7], other: [7, 1],
};

const maxReminderDays = 365;
const maxReminderCount = 5;

export function normalizeReminderDays(value: unknown) {
  if (value === null || value === undefined) return { days: null as number[] | null, valid: true };
  if (!Array.isArray(value) || value.length > maxReminderCount) return { days: [] as number[], valid: false };
  const days = [...new Set(value)];
  if (!days.every((day) => Number.isInteger(day) && day >= 0 && day <= maxReminderDays)) return { days: [] as number[], valid: false };
  return { days: days.sort((a, b) => b - a), valid: true };
}

export function reminderDaysForItem(item: LifeItem) {
  if (item.reminder_enabled === false) return [];
  if (item.reminder_days !== null && item.reminder_days !== undefined) {
    const custom = normalizeReminderDays(item.reminder_days);
    return custom.valid ? custom.days ?? [] : [];
  }
  return categoryReminderDefaults[item.category ?? "other"] ?? categoryReminderDefaults.other;
}

export function reminderDatesForItem(item: LifeItem, today = todayInIstanbul()) {
  if (!item.next_due_date || isClosed(item) || item.next_due_date < today) return [];
  return reminderDaysForItem(item)
    .map((offset) => addDays(item.next_due_date as string, -offset))
    .filter((date) => date >= today)
    .map((date) => `${date}T09:00:00+03:00`);
}

const reminderChannels = ["in_app", "email", "push"] as const;

export async function createMissingReminders(supabase: SupabaseClient, item: LifeItem) {
  const dates = reminderDatesForItem(item);
  if (!dates.length) return { attempted: 0, error: null };
  const rows = dates.flatMap((remindAt) => reminderChannels.map((channel) => ({ user_id: item.user_id, life_item_id: item.id, remind_at: remindAt, status: "pending", channel })));
  const { error } = await supabase.from("reminders").upsert(rows, { onConflict: "user_id,life_item_id,remind_at,channel", ignoreDuplicates: true });
  return { attempted: rows.length, error };
}

export async function reconcileRemindersForItem(supabase: SupabaseClient, userId: string, lifeItemId: string) {
  const { data: item, error: itemError } = await supabase.from("life_items").select("*").eq("id", lifeItemId).eq("user_id", userId).maybeSingle();
  if (itemError || !item) return { createdAttempted: 0, deleted: 0, kept: 0, error: itemError ?? new Error("LIFE_ITEM_NOT_FOUND") };

  const { data: reminders, error: reminderError } = await supabase.from("reminders").select("id, life_item_id, remind_at, status, channel").eq("life_item_id", lifeItemId).eq("user_id", userId);
  if (reminderError) return { createdAttempted: 0, deleted: 0, kept: 0, error: reminderError };

  const now = Date.now();
  const targetDates = new Set(reminderDatesForItem(item as LifeItem).map((date) => new Date(date).getTime()));
  const staleIds = (reminders ?? []).filter((reminder) => reminder.status === "pending" && new Date(reminder.remind_at).getTime() > now && !targetDates.has(new Date(reminder.remind_at).getTime())).map((reminder) => reminder.id);
  let deleted = 0;
  if (staleIds.length) {
    const { data: deletedRows, error: deleteError } = await supabase.from("reminders").delete().in("id", staleIds).eq("user_id", userId).eq("life_item_id", lifeItemId).eq("status", "pending").gt("remind_at", new Date(now).toISOString()).select("id");
    if (deleteError) return { createdAttempted: 0, deleted: 0, kept: reminders.length, error: deleteError };
    const actuallyDeletedIds = new Set((deletedRows ?? []).map((row) => row.id));
    const missingCount = staleIds.filter((id) => !actuallyDeletedIds.has(id)).length;
    if (missingCount > 0) {
      if (process.env.NODE_ENV === "development") console.warn("Reminder reconciliation delete incomplete", { requestedCount: staleIds.length, deletedCount: actuallyDeletedIds.size, missingCount });
      return { createdAttempted: 0, deleted: actuallyDeletedIds.size, kept: reminders.length - actuallyDeletedIds.size, error: new Error("REMINDER_DELETE_INCOMPLETE") };
    }
    deleted = actuallyDeletedIds.size;
  }

  const generation = await createMissingReminders(supabase, item as LifeItem);
  if (generation.error) return { createdAttempted: generation.attempted, deleted, kept: reminders.length - deleted, error: generation.error };
  return { createdAttempted: generation.attempted, deleted, kept: reminders.length - deleted, error: null };
}

export async function backfillMissingReminders(supabase: SupabaseClient, userId: string) {
  const { data: items, error } = await supabase.from("life_items").select("*").eq("user_id", userId);
  if (error) return { created: 0, error };
  let created = 0;
  for (const item of (items ?? []) as LifeItem[]) {
    const generation = await createMissingReminders(supabase, { ...item, user_id: userId });
    if (!generation.error) created += generation.attempted;
  }
  return { created, error: null };
}