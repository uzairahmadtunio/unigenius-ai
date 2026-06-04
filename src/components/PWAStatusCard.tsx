import { Download, Bell, Trash2, RefreshCw, Wifi, WifiOff, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePWA } from "@/hooks/use-pwa";
import { formatDistanceToNow } from "date-fns";

const PWAStatusCard = () => {
  const {
    canInstall, isInstalled, isOnline, notifPermission, swActive, lastSync,
    install, requestNotifications, clearCache, syncNow,
  } = usePWA();

  const Row = ({ label, value, ok }: { label: string; value: string; ok?: boolean }) => (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline" className={ok ? "border-emerald-500/40 text-emerald-500" : "border-border text-foreground"}>
        {value}
      </Badge>
    </div>
  );

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
          <Smartphone className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm text-foreground">App Status</h3>
          <p className="text-[11px] text-muted-foreground">Installable progressive web app</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          {isOnline ? (
            <><Wifi className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">Online</span></>
          ) : (
            <><WifiOff className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-500">Offline</span></>
          )}
        </div>
      </div>

      <div className="space-y-0.5 mb-4">
        <Row label="Installation" value={isInstalled ? "Installed" : "Not Installed"} ok={isInstalled} />
        <Row label="Offline Mode" value={swActive ? "Active" : "Inactive"} ok={swActive} />
        <Row
          label="Notifications"
          value={notifPermission === "granted" ? "Enabled" : notifPermission === "denied" ? "Blocked" : "Not set"}
          ok={notifPermission === "granted"}
        />
        <Row
          label="Last Sync"
          value={lastSync ? formatDistanceToNow(new Date(lastSync), { addSuffix: true }) : "Never"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          className="rounded-xl gap-1.5 gradient-primary text-primary-foreground"
          onClick={install}
          disabled={isInstalled}
        >
          {isInstalled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          {isInstalled ? "Installed" : "Install App"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-1.5"
          onClick={requestNotifications}
          disabled={notifPermission === "granted"}
        >
          <Bell className="w-3.5 h-3.5" />
          {notifPermission === "granted" ? "Enabled" : "Enable Alerts"}
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={syncNow}>
          <RefreshCw className="w-3.5 h-3.5" /> Sync Now
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={clearCache}>
          <Trash2 className="w-3.5 h-3.5" /> Clear Cache
        </Button>
      </div>

      {!canInstall && !isInstalled && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          Tip: On iOS, use Safari → Share → Add to Home Screen.
        </p>
      )}
    </div>
  );
};

export default PWAStatusCard;
