export type LifeItem = {
  id: string;
  user_id: string;
  title: string | null;
  category: string | null;
  provider: string | null;
  amount: number | string | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  next_due_date: string | null;
  recurrence: string | null;
  description: string | null;
  status?: string | null;
  source_document_id?: string | null;
  reminder_enabled?: boolean | null;
  reminder_days?: number[] | null;
};

export function todayInIstanbul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00+03:00`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function dateDifferenceInDays(date: string, today = todayInIstanbul()) {
  const target = Date.parse(`${date}T12:00:00Z`);
  const current = Date.parse(`${today}T12:00:00Z`);
  return Math.round((target - current) / 86400000);
}

export function formatDueDate(date: string) {
  const days = dateDifferenceInDays(date);
  if (days === 0) return "Bugün";
  if (days > 0) return `${days} gün kaldı`;
  return `${Math.abs(days)} gün gecikmiş`;
}

export function formatMoney(amount: number | string | null, currency: string | null) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value === null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY" }).format(value);
}

export function isClosed(item: LifeItem) {
  return ["cancelled", "inactive", "completed", "closed"].includes(item.status?.toLowerCase() ?? "");
}

// Heuristic masking for sensitive numbers (IBAN, TC kimlik no, kart no, telefon) in free-text
// fields the AI extracted, per the "hassas bilgilerin maskelenmesi" privacy rule. Regex-based,
// so it can miss unusual formats — good enough for display, not a compliance guarantee.
export function maskSensitiveText(text: string | null) {
  if (!text) return text;
  let result = text;
  result = result.replace(/\bTR\d{2}(?:[ ]?\d{4}){5}[ ]?\d{2}\b/gi, (match) => {
    const digits = match.replace(/\s/g, "");
    return `TR•• •••• •••• •••• •••• ••${digits.slice(-2)}`;
  });
  result = result.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, (match) => {
    const digits = match.replace(/[ -]/g, "");
    return `•••• •••• •••• ${digits.slice(-4)}`;
  });
  result = result.replace(/\b\d{11}\b/g, (match) => `•••••••${match.slice(-4)}`);
  result = result.replace(/\b0?5\d{2}[ ]?\d{3}[ ]?\d{2}[ ]?\d{2}\b/g, (match) => {
    const digits = match.replace(/\s/g, "");
    return `${digits.slice(0, digits.length - 8)}•• ••• •• ${digits.slice(-2)}`;
  });
  return result;
}

export function categoryLabel(category: string | null) {
  return ({ digital_subscription: "Abonelik", bill: "Fatura", vehicle: "Araç", product: "Ürün", warranty: "Garanti" } as Record<string, string>)[category ?? ""] ?? "Kayıt";
}