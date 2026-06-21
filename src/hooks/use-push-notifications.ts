import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  requestPushToken,
  listenForegroundMessages,
  detectBrowser,
  detectDevice,
  getFirebaseMessaging,
} from "@/lib/firebase-push";

export type PushCategory =
  | "study_reminder"
  | "quiz_reminder"
  | "exam_reminder"
  | "viva_reminder"
  | "teacher_announcement"
  | "streak_alert"
  | "premium_updates";

export const DEFAULT_PREFS: Record<PushCategory, boolean> = {
  study_reminder: true,
  quiz_reminder: true,
  exam_reminder: true,
  viva_reminder: true,
  teacher_announcement: true,
  streak_alert: true,
  premium_updates: true,
};

export interface PushSubscription {
  id: string;
  fcm_token: string;
  device_name: string | null;
  browser: string | null;
  enabled: boolean;
  notification_preferences: Record<PushCategory, boolean>;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default",
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("push_subscriptions" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as any) || null);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Foreground messages -> in-app toast (without breaking existing notifications query)
  useEffect(() => {
    if (!user || !supported) return;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        await getFirebaseMessaging();
        unsub = listenForegroundMessages((payload) => {
          const title = payload?.notification?.title || payload?.data?.title || "Notification";
          const body = payload?.notification?.body || payload?.data?.body || "";
          toast({ title, description: body });
        });
      } catch {
        /* ignore */
      }
    })();
    return () => { unsub?.(); };
  }, [user, supported]);

  const enable = useCallback(async () => {
    if (!user || !supported) return false;
    setLoading(true);
    try {
      const token = await requestPushToken();
      setPermission(Notification.permission);
      if (!token) {
        toast({ title: "Permission denied", description: "Enable notifications in your browser settings.", variant: "destructive" });
        return false;
      }
      const payload = {
        user_id: user.id,
        fcm_token: token,
        device_name: detectDevice(),
        browser: detectBrowser(),
        enabled: true,
        notification_preferences: subscription?.notification_preferences ?? DEFAULT_PREFS,
      };
      const { data, error } = await supabase
        .from("push_subscriptions" as any)
        .upsert(payload, { onConflict: "fcm_token" })
        .select()
        .single();
      if (error) throw error;
      setSubscription(data as any);
      toast({ title: "Push notifications enabled" });
      return true;
    } catch (e: any) {
      toast({ title: "Failed to enable", description: e.message, variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supported, subscription]);

  const disable = useCallback(async () => {
    if (!user || !subscription) return;
    setLoading(true);
    const { error } = await supabase
      .from("push_subscriptions" as any)
      .update({ enabled: false } as any)
      .eq("id", subscription.id);
    setLoading(false);
    if (!error) {
      setSubscription({ ...subscription, enabled: false });
      toast({ title: "Push notifications disabled" });
    }
  }, [user, subscription]);

  const updatePreference = useCallback(async (category: PushCategory, value: boolean) => {
    if (!user || !subscription) return;
    const next = { ...subscription.notification_preferences, [category]: value };
    setSubscription({ ...subscription, notification_preferences: next });
    await supabase
      .from("push_subscriptions" as any)
      .update({ notification_preferences: next } as any)
      .eq("id", subscription.id);
  }, [user, subscription]);

  return {
    supported,
    permission,
    subscription,
    enabled: !!subscription?.enabled && permission === "granted",
    loading,
    enable,
    disable,
    updatePreference,
    refresh: fetchSubscription,
  };
};
