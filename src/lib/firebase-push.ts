import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;
let cachedConfig: { config: any; vapidKey: string } | null = null;

async function loadConfig() {
  if (cachedConfig) return cachedConfig;
  const { data, error } = await supabase.functions.invoke("firebase-config");
  if (error || !data?.config) throw new Error("Failed to load Firebase config");
  cachedConfig = data;
  return data;
}

export async function getFirebaseMessaging() {
  if (messagingInstance) return { messaging: messagingInstance, vapidKey: cachedConfig!.vapidKey, config: cachedConfig!.config };
  const { config, vapidKey } = await loadConfig();
  appInstance = initializeApp(config);
  messagingInstance = getMessaging(appInstance);
  return { messaging: messagingInstance, vapidKey, config };
}

export async function registerMessagingSW(config: any) {
  if (!("serviceWorker" in navigator)) throw new Error("Service workers unsupported");
  // Pass config via query param so the SW can initialize Firebase with the same config.
  const swUrl = `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(config))}`;
  return navigator.serviceWorker.register(swUrl, { scope: "/firebase-cloud-messaging-push-scope" });
}

export async function requestPushToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;

  const { messaging, vapidKey, config } = await getFirebaseMessaging();
  const swReg = await registerMessagingSW(config);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
  return token || null;
}

export function listenForegroundMessages(handler: (payload: any) => void) {
  if (!messagingInstance) return () => {};
  const unsub = onMessage(messagingInstance, handler);
  return unsub;
}

export function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/")) return "Safari";
  return "Browser";
}

export function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Device";
}
