// Sends pending "email" and "push" channel reminders that are due (remind_at <= now).
// Triggered on a schedule by pg_cron via net.http_post (see setup instructions).
// Auth: a shared secret header (x-cron-secret), not a user JWT, since this runs unattended.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "LifeOS <onboarding@resend.com>";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH_LIMIT = 50;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

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

type LifeItemRow = { id: string; title: string | null; provider: string | null; category: string | null; amount: number | string | null; currency: string | null; next_due_date: string | null };

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

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const nowIso = new Date().toISOString();

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("id, user_id, life_item_id, remind_at, channel")
    .eq("status", "pending")
    .in("channel", ["email", "push"])
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
  const itemsById = new Map<string, LifeItemRow>((items ?? []).map((item) => [item.id, item]));

  const userIds = [...new Set(reminders.map((r) => r.user_id))];

  const emailReminders = reminders.filter((r) => r.channel === "email");
  const emailByUser = new Map<string, string>();
  if (emailReminders.length && RESEND_API_KEY) {
    for (const userId of userIds) {
      const { data } = await supabase.auth.admin.getUserById(userId);
      if (data?.user?.email) emailByUser.set(userId, data.user.email);
    }
  }

  const pushReminders = reminders.filter((r) => r.channel === "push");
  const subscriptionsByUser = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>();
  if (pushReminders.length && VAPID_PRIVATE_KEY) {
    const { data: subs } = await supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
    for (const sub of subs ?? []) {
      if (!subscriptionsByUser.has(sub.user_id)) subscriptionsByUser.set(sub.user_id, []);
      subscriptionsByUser.get(sub.user_id)!.push(sub);
    }
  }

  let sent = 0;
  let failed = 0;

  for (const reminder of emailReminders) {
    const item = itemsById.get(reminder.life_item_id);
    const to = emailByUser.get(reminder.user_id);
    if (!RESEND_API_KEY || !item || !to) {
      console.error("Skipping email reminder", { reminderId: reminder.id, hasItem: !!item, hasEmail: !!to, resendConfigured: !!RESEND_API_KEY });
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

  for (const reminder of pushReminders) {
    const item = itemsById.get(reminder.life_item_id);
    const subs = subscriptionsByUser.get(reminder.user_id) ?? [];
    if (!VAPID_PRIVATE_KEY || !item || !subs.length) {
      console.error("Skipping push reminder", { reminderId: reminder.id, hasItem: !!item, subCount: subs.length, vapidConfigured: !!VAPID_PRIVATE_KEY });
      failed++;
      continue;
    }
    const amount = typeof item.amount === "string" ? Number(item.amount) : item.amount;
    const amountText = formatMoney(amount, item.currency);
    const payload = JSON.stringify({
      title: `Hatırlatma: ${item.title ?? "Bir kaydın"} yaklaşıyor`,
      body: [item.provider, amountText].filter(Boolean).join(" · ") || "Detayları görmek için dokun.",
      url: "/dashboard/today",
    });
    let deliveredToAny = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        deliveredToAny = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Push send failed", { reminderId: reminder.id, subscriptionId: sub.id, statusCode });
        }
      }
    }
    if (deliveredToAny) {
      await supabase.from("reminders").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", reminder.id);
      sent++;
    } else {
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: reminders.length }), { status: 200 });
});
