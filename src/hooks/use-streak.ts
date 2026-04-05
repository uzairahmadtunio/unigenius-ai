import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  loading: boolean;
}

const STREAK_MILESTONES = [7, 14, 30, 50, 100];

export const useStreak = (): StreakData => {
  const { user } = useAuth();
  const [data, setData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalActiveDays: 0,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Only run once per browser session
    const key = `streak_recorded_${user.id}`;
    if (sessionStorage.getItem(key)) {
      // Use cached values from sessionStorage
      try {
        const cached = JSON.parse(sessionStorage.getItem(key)!);
        setData({ ...cached, loading: false });
      } catch {
        setData((prev) => ({ ...prev, loading: false }));
      }
      return;
    }

    const recordActivity = async () => {
      try {
        const { data: result, error } = await supabase.rpc("record_daily_activity", {
          _user_id: user.id,
        });

        if (error) throw error;

        const row = result?.[0];
        if (!row) return;

        const streakData = {
          currentStreak: row.current_streak,
          longestStreak: row.longest_streak,
          totalActiveDays: row.total_active_days,
        };
        setData({ ...streakData, loading: false });
        sessionStorage.setItem(key, JSON.stringify(streakData));

        // Celebrate streak milestones
        if (row.streak_increased && STREAK_MILESTONES.includes(row.current_streak)) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          toast.success(`🔥 ${row.current_streak}-day streak! Keep it up!`);
        }
      } catch {
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    recordActivity();
  }, [user]);

  return data;
};
