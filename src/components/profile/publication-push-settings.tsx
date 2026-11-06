"use client";

import { useEffect, useState } from "react";

export function PublicationPushSettings({ publicKey }: { publicKey: string | null }) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSupported(window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  }, []);

  async function changeSubscription(enable: boolean) {
    if (!publicKey || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (enable && await Notification.requestPermission() !== "granted") {
        setMessage("Разрешите уведомления в настройках браузера.");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) throw new Error("Service worker not active");
      const current = await registration.pushManager.getSubscription();
      const subscription = enable
        ? current ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey })
        : current;

      if (subscription) {
        const response = await fetch("/api/push-subscriptions", {
          method: enable ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enable ? subscription : { endpoint: subscription.endpoint })
        });
        if (!response.ok) {
          if (enable && !current) await subscription.unsubscribe();
          throw new Error("Subscription update failed");
        }
        if (!enable) await subscription.unsubscribe();
      }
      setMessage(enable ? "Уведомления о новинках включены на этом устройстве." : "Уведомления на этом устройстве отключены.");
    } catch {
      setMessage("Не удалось обновить подписку. Перезагрузите страницу и попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="concept-panel space-y-3 rounded-[26px] p-5">
      <h2 className="text-xl font-semibold">Уведомления о новинках</h2>
      <p>Получайте уведомления о новых книгах, даже когда библиотека закрыта.</p>
      {supported && publicKey ? (
        <div className="flex flex-wrap gap-3">
          <button className="concept-button-primary rounded-xl px-4 py-2" type="button" disabled={busy} onClick={() => void changeSubscription(true)}>Включить</button>
          <button className="concept-button-secondary rounded-xl px-4 py-2" type="button" disabled={busy} onClick={() => void changeSubscription(false)}>Отключить</button>
        </div>
      ) : <p>Push-уведомления недоступны на этом сервере или устройстве.</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
