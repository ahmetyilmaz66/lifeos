"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64url: string) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

type Status = "unsupported" | "unsubscribed" | "subscribed" | "denied";

export default function PushNotificationToggle() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const subscription = await registration?.pushManager.getSubscription().catch(() => null);
      setStatus(subscription ? "subscribed" : "unsubscribed");
    }
    checkStatus();
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("Push bildirimleri henüz yapılandırılmadı.");
      setBusy(false);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        setBusy(false);
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("SUBSCRIBE_SAVE_FAILED");
      setStatus("subscribed");
    } catch {
      setError("Bildirimler açılamadı. Lütfen tekrar dene.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError("Bildirimler kapatılamadı. Lütfen tekrar dene.");
    }
    setBusy(false);
  }

  if (status === null) return null;
  if (status === "unsupported") return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-semibold">Push bildirimleri</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {status === "denied"
          ? "Bildirim izni tarayıcı ayarlarından engellenmiş. Açmak için site ayarlarından izin vermen gerekiyor."
          : "Hatırlatmalar için tarayıcı/telefon bildirimi al — LifeOS ana ekrana eklendiğinde en iyi çalışır."}
      </p>
      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      <Button type="button" variant={status === "subscribed" ? "outline" : "default"} className="mt-4" disabled={busy || status === "denied"} onClick={status === "subscribed" ? disable : enable}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : status === "subscribed" ? <BellOff size={16} /> : <Bell size={16} />}
        {status === "subscribed" ? "Bildirimleri kapat" : "Bildirimleri aç"}
      </Button>
    </div>
  );
}
