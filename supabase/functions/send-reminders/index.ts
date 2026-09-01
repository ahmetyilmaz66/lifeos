// Sends pending "email" channel reminders that are due (remind_at <= now).
// Triggered on a schedule by pg_cron via net.http_post (see setup instructions).
// Auth: a shared secret header (x-cron-secret), not a user JWT, since this runs unattended.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "LifeOS <onboarding@resend.com>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH_LIMIT = 50;

const categoryLabels: Record<string, string> = {
  digital_subscription: "Abonelik",
  bill: "Fatura",
  vehicle: "Araç",
  product: "Ürün",
  warranty: "Garanti",
  document: "Belge",
  home: "Ev",
  family: "Aile",
  other: "Kayıt",
};

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null || !Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY" }).format(amount);
}

function emailHtml(item: { title: string | null; provider: string | null; category: string | null; amount: number | null; currency: string | null; next_due_date: string | null }) {
  const amountText = formatMoney(item.amount, item.currency);
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <p style="color:#666;font-size:13px;margin:0 0 8px">${categoryLabels[item.category ?? ""] ?? "Kayıt"}</p>
    <h2 style="margin:0 0 12px">${item.title ?? "Başlıksız kayıt"}</h2>
    ${item.provider ? `<p style="color:#666;margin:0 0 12px">${item.provider}</p>` : ""}
    ${amountText ? `<p style="font-size:20px;font-weight:600;margin:0 0 12px">${amountText}</p>` : ""}
    ${item.next_due_date ? `<p style="color:#666">Son tarih: ${item.next_due_date}</p>` : ""}
    <p style="margin-top:24px;font-size:13px;color:#999">LifeOS — hayatındaki önemli tarihleri unutma.</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 503 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const nowIso = new Date().toISOString();

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("id, user_id, life_item_id, remind_at")
    .eq("status", "pending")
    .eq("channel", "email")
    .lte("remind_at", nowIso)
    .order("remind_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!reminders?.length) return new Response(JSON.stringify({ sent: 0, failed: 0, total: 0 }), { status: 200 });

  const lifeItemIds = [...new Set(reminders.map((r) => r.life_item_id))];
  const { data: items } = await supabase
    .from("life_items")
    .select("id, title, provider, category, amount, currency, next_due_date")
    .in("id", lifeItemIds);
  const itemsById = new Map((items ?? []).map((item) => [item.id, item]));

  const userIds = [...new Set(reminders.map((r) => r.user_id))];
  const emailByUser = new Map<string, string>();
  for (const userId of userIds) {
    const { data } = await supabase.auth.admin.getUserById(userId);
    if (data?.user?.email) emailByUser.set(userId, data.user.email);
  }

  let sent = 0;
  let failed = 0;
  for (const reminder of reminders) {
    const item = itemsById.get(reminder.life_item_id);
    const to = emailByUser.get(reminder.user_id);
    if (!item || !to) {
      console.error("Skipping reminder: missing item or user email", { reminderId: reminder.id, hasItem: !!item, hasEmail: !!to });
      failed++;
      continue;
    }
    const amount = typeof item.amount === "string" ? Number(item.amount) : item.amount;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        subject: `Hatırlatma: ${item.title ?? "Bir kaydın"} yaklaşıyor`,
        html: emailHtml({ ...item, amount }),
      }),
    });
    if (response.ok) {
      await supabase.from("reminders").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", reminder.id);
      sent++;
    } else {
      const bodyText = await response.text();
      console.error("Resend send failed", { reminderId: reminder.id, status: response.status, body: bodyText });
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: reminders.length }), { status: 200 });
});
