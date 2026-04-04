import { useState } from "react";
import { X, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const typeStyles: Record<string, { bg: string; icon: any; text: string }> = {
  info: { bg: "bg-primary/90", icon: Info, text: "text-primary-foreground" },
  warning: { bg: "bg-amber-500/90", icon: AlertTriangle, text: "text-white" },
  critical: { bg: "bg-destructive/90", icon: AlertOctagon, text: "text-destructive-foreground" },
};

const GlobalAlertBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  const { data: alert = null } = useQuery({
    queryKey: ["global-alert"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("global_alerts" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const a = data[0] as any;
        const dismissedId = sessionStorage.getItem("dismissed-alert");
        if (dismissedId !== a.id) return a;
      }
      return null;
    },
  });

  if (!alert || dismissed) return null;

  const style = typeStyles[alert.alert_type] || typeStyles.info;
  const Icon = style.icon;

  return (
    <div className={`${style.bg} ${style.text} px-4 py-2.5 flex items-center justify-center gap-3 text-sm relative z-50`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-medium text-center">{alert.message}</span>
      <button
        onClick={() => {
          sessionStorage.setItem("dismissed-alert", alert.id);
          setDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default GlobalAlertBanner;
