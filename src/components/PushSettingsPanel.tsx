import { Bell, BellOff, Loader2, CheckCircle2, XCircle, Send, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { usePushNotifications, type PushCategory } from "@/hooks/use-push-notifications";
import { listenForegroundMessages, getFirebaseMessaging } from "@/lib/firebase-push";

const CATEGORIES: { key: PushCategory; label: string }[] = [
  { key: "study_reminder", label: "Study Reminder" },
  { key: "quiz_reminder", label: "Quiz Reminder" },
  { key: "exam_reminder", label: "Exam Reminder" },
  { key: "viva_reminder", label: "Viva Reminder" },
  { key: "teacher_announcement", label: "Teacher Announcement" },
  { key: "streak_alert", label: "Streak Alert" },
  { key: "premium_updates", label: "Premium Updates" },
];

const Row = ({ ok, label, detail }: { ok: boolean | null; label: string; detail?: string }) => (
  <div className="flex items-start justify-between gap-2 text-[11px] py-0.5">
    <span className="flex items-center gap-1.5 text-foreground/80">
      {ok === null ? (
        <span className="w-3 h-3 rounded-full bg-muted" />
      ) : ok ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
      ) : (
        <XCircle className="w-3 h-3 text-destructive" />
      )}
      {label}
    </span>
    {detail && <span className="text-muted-foreground truncate max-w-[140px]" title={detail}>{detail}</span>}
  </div>
);

export const PushSettingsPanel = () => {
  const { user } = useAuth();
  const { supported, enabled, loading, subscription, enable, disable, updatePreference, permission } =
    usePushNotifications();
  const [showDiag, setShowDiag] = useState(false);
  const [configLoaded, setConfigLoaded] = useState<boolean | null>(null);
  const [swRegistered, setSwRegistered] = useState<boolean | null>(null);
  const [lastReceived, setLastReceived] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Probe config + SW
  useEffect(() => {
    if (!showDiag) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("firebase-config");
        setConfigLoaded(!!data?.config && !error);
      } catch { setConfigLoaded(false); }
      try {
        const regs = await navigator.serviceWorker?.getRegistrations();
        setSwRegistered(!!regs?.some((r) => r.active?.scriptURL.includes("firebase-messaging-sw.js")));
      } catch { setSwRegistered(false); }
    })();
  }, [showDiag, enabled]);

  // Listen for foreground pushes to update Last Received
  useEffect(() => {
    if (!enabled) return;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        await getFirebaseMessaging();
        unsub = listenForegroundMessages((payload) => {
          setLastReceived(new Date().toLocaleTimeString());
        });
      } catch { /* ignore */ }
    })();
    return () => unsub?.();
  }, [enabled]);

  const sendTest = async () => {
    if (!user) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          target: "user",
          user_id: user.id,
          category: "premium_updates",
          title: "🔔 Test Notification",
          body: "If you can see this, your push setup works end-to-end.",
          link: "/",
        },
      });
      if (error) throw error;
      toast({
        title: data?.sent > 0 ? `Sent to ${data.sent} device(s)` : "No devices received it",
        description: data?.sent > 0
          ? "Check this tab (foreground) or your system tray (background)."
          : `reason: ${data?.reason || "unknown"}`,
        variant: data?.sent > 0 ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!supported) {
    return (
      <div className="text-xs text-muted-foreground px-3 py-2 border-t">
        Push notifications not supported on this browser.
      </div>
    );
  }

  return (
    <div className="border-t bg-muted/30 px-3 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium">Push Notifications</span>
        </div>
        {enabled ? (
          <Button size="sm" variant="outline" onClick={disable} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disable"}
          </Button>
        ) : (
          <Button size="sm" onClick={enable} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
          </Button>
        )}
      </div>

      {permission === "denied" && (
        <div className="text-xs text-destructive">
          Blocked. Allow notifications in your browser's site settings, then click Enable.
        </div>
      )}

      {enabled && subscription && (
        <>
          <div className="space-y-2 pt-1">
            {CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-center justify-between text-xs">
                <span>{c.label}</span>
                <Switch
                  checked={subscription.notification_preferences?.[c.key] !== false}
                  onCheckedChange={(v) => updatePreference(c.key, v)}
                />
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground pt-1">
              Device: {subscription.device_name} · {subscription.browser}
            </div>
          </div>

          <Button size="sm" variant="secondary" className="w-full" onClick={sendTest} disabled={sending}>
            {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Send Test Notification
          </Button>
        </>
      )}

      <button
        onClick={() => setShowDiag((v) => !v)}
        className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        <Activity className="w-3 h-3" /> {showDiag ? "Hide" : "Show"} Diagnostics
      </button>

      {showDiag && (
        <div className="rounded-md bg-background/60 border p-2 space-y-0.5">
          <Row ok={configLoaded} label="Firebase Config Loaded" detail={configLoaded ? "ok" : "loading…"} />
          <Row ok={swRegistered} label="Service Worker Registered" detail={swRegistered ? "fcm scope" : "—"} />
          <Row ok={permission === "granted"} label="Notification Permission" detail={permission} />
          <Row ok={!!subscription?.fcm_token} label="FCM Token Generated" detail={subscription?.fcm_token ? subscription.fcm_token.slice(0, 14) + "…" : "—"} />
          <Row ok={!!subscription?.id} label="Subscription Saved" detail={subscription?.id ? "row #" + subscription.id.slice(0, 6) : "—"} />
          <Row ok={!!lastReceived} label="Last Notification Received" detail={lastReceived || "none yet"} />
        </div>
      )}
    </div>
  );
};
