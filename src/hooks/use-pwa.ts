import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const LAST_SYNC_KEY = "pwa:lastSync";

export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [swActive, setSwActive] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(
    typeof localStorage !== "undefined" ? localStorage.getItem(LAST_SYNC_KEY) : null
  );

  // Detect already-installed (standalone display)
  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setIsInstalled(mql.matches || (window.navigator as any).standalone === true);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  // beforeinstallprompt
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success("UniGenius AI installed!");
    };
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // online / offline
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      const ts = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, ts);
      setLastSync(ts);
      toast.success("Back online — data synced successfully");
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.message("You're offline", {
        description: "Previously loaded content is still available.",
      });
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // SW ready state
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(() => setSwActive(true)).catch(() => setSwActive(false));
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) {
      toast.message("Install not available", {
        description: "Use your browser menu → Add to Home Screen / Install App.",
      });
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } catch (e) {
      console.warn("[PWA] install failed", e);
    }
  }, [installPrompt]);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") {
      toast.error("Notifications not supported in this browser");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") toast.success("Notifications enabled");
      else if (perm === "denied") toast.error("Notifications blocked");
    } catch {
      /* noop */
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      toast.success("Cache cleared");
    } catch {
      toast.error("Failed to clear cache");
    }
  }, []);

  const syncNow = useCallback(async () => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      }
      const ts = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, ts);
      setLastSync(ts);
      toast.success("Data synced successfully");
    } catch {
      toast.error("Sync failed");
    }
  }, []);

  return {
    canInstall: !!installPrompt,
    isInstalled,
    isOnline,
    notifPermission,
    swActive,
    lastSync,
    install,
    requestNotifications,
    clearCache,
    syncNow,
  };
};
