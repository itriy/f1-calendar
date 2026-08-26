import {
  getCurrentSubscription,
  getNotificationPermission,
  isPushSupported,
  serializeSubscription,
  subscribe,
  unsubscribe,
} from "@mmmike/web-push/client";

export type ReminderPreferences = {
  day: boolean;
  hour: boolean;
  start: boolean;
};

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      data?.error?.message || "Не вдалося змінити налаштування нагадувань.",
    );
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

export async function pushState() {
  return {
    supported: isPushSupported(),
    permission: isPushSupported() ? getNotificationPermission() : "unsupported",
    subscription: isPushSupported() ? await getCurrentSubscription() : null,
  };
}
export async function enablePush(preferences: ReminderPreferences) {
  const config = (await api("/api/push/config")) as { publicKey: string };
  const result = await subscribe(config.publicKey);
  if (result.status !== "subscribed") return result.status;
  await api("/api/push/subscription", "POST", {
    subscription: serializeSubscription(result.subscription),
    preferences,
  });
  return "subscribed" as const;
}
export async function updatePush(preferences: ReminderPreferences) {
  const subscription = await getCurrentSubscription();
  if (!subscription) throw new Error("Браузерна підписка не знайдена.");
  await api("/api/push/subscription", "PATCH", {
    subscription: serializeSubscription(subscription),
    preferences,
  });
}
export async function disablePush() {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const serialized = serializeSubscription(subscription);
  await api("/api/push/subscription", "DELETE", { subscription: serialized });
  await unsubscribe();
}
