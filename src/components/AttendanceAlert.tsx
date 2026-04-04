import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface LowSubject {
  name: string;
  percentage: number;
}

const SESSION_KEY = "attendance_alert_shown";

const AttendanceAlert = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);

  const alreadyShown = sessionStorage.getItem(SESSION_KEY);

  const { data: lowSubjects = [] } = useQuery({
    queryKey: ["attendance-alert", user?.id],
    enabled: !!user && !alreadyShown,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("subject, status")
        .eq("user_id", user!.id);

      if (!data || data.length === 0) return [];

      const map: Record<string, { total: number; present: number }> = {};
      data.forEach((r) => {
        if (!map[r.subject]) map[r.subject] = { total: 0, present: 0 };
        map[r.subject].total++;
        if (r.status === "present") map[r.subject].present++;
      });

      const low: LowSubject[] = [];
      Object.entries(map).forEach(([name, { total, present }]) => {
        if (total >= 3) {
          const pct = Math.round((present / total) * 100);
          if (pct < 75) low.push({ name, percentage: pct });
        }
      });

      if (low.length > 0) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setTimeout(() => setVisible(false), 7000);
      }
      return low;
    },
  });

  if (!visible || lowSubjects.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90vw] max-w-md"
        >
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 backdrop-blur-xl shadow-lg shadow-amber-500/10 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-display font-bold text-foreground text-sm">Attendance Warning</h4>
                {lowSubjects.map((s) => (
                  <p key={s.name} className="text-xs text-muted-foreground leading-relaxed">
                    ⚠️ Your attendance in{" "}
                    <span className="font-semibold text-amber-300">{s.name}</span> is{" "}
                    <span className="font-bold text-destructive">{s.percentage}%</span>.
                    Please attend more classes to avoid exam eligibility issues.
                  </p>
                ))}
              </div>
              <button onClick={() => setVisible(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttendanceAlert;
