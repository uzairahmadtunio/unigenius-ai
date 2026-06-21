import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications, type PushCategory } from "@/hooks/use-push-notifications";

const CATEGORIES: { key: PushCategory; label: string }[] = [
  { key: "study_reminder", label: "Study Reminder" },
  { key: "quiz_reminder", label: "Quiz Reminder" },
  { key: "exam_reminder", label: "Exam Reminder" },
  { key: "viva_reminder", label: "Viva Reminder" },
  { key: "teacher_announcement", label: "Teacher Announcement" },
  { key: "streak_alert", label: "Streak Alert" },
  { key: "premium_updates", label: "Premium Updates" },
];

export const PushSettingsPanel = () => {
  const { supported, enabled, loading, subscription, enable, disable, updatePreference, permission } =
    usePushNotifications();

  if (!supported) {
    return (
      <div className="text-xs text-muted-foreground px-3 py-2">
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
      )}
    </div>
  );
};
