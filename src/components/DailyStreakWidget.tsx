import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Calendar, TrendingUp, Gift } from "lucide-react";
import { useStreak } from "@/hooks/use-streak";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const DailyStreakWidget = () => {
  const { user } = useAuth();
  const { currentStreak, longestStreak, totalActiveDays, loading } = useStreak();
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("streak_pro_until")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const until = (data as any)?.streak_pro_until;
        if (until && new Date(until) > new Date()) setClaimed(true);
      });
  }, [user]);

  if (!user || loading) return null;

  const streakLevel =
    currentStreak >= 30 ? "legendary" : currentStreak >= 14 ? "blazing" : currentStreak >= 7 ? "hot" : "warming";

  const streakColors: Record<string, string> = {
    warming: "from-orange-400/20 to-yellow-400/20 border-orange-500/30",
    hot: "from-orange-500/20 to-red-400/20 border-orange-500/40",
    blazing: "from-red-500/20 to-pink-500/20 border-red-500/40",
    legendary: "from-purple-500/20 to-pink-500/20 border-purple-500/50",
  };

  const flameColors: Record<string, string> = {
    warming: "text-orange-400",
    hot: "text-orange-500",
    blazing: "text-red-500",
    legendary: "text-purple-500",
  };

  const canClaimProDay = currentStreak >= 7 && !claimed;

  const claimProDay = async () => {
    if (claiming) return;
    setClaiming(true);
    const { error } = await supabase.rpc("grant_streak_pro_day" as any);
    setClaiming(false);
    if (error) {
      toast.error("Couldn't claim Pro Day. Keep your streak going!");
      return;
    }
    setClaimed(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    toast.success("🎉 Free Pro Day claimed! Enjoy all Pro features today!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      className={`glass rounded-2xl p-4 bg-gradient-to-br ${streakColors[streakLevel]} border`}
    >
      <div className="flex items-center justify-between">
        {/* Streak counter */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="relative"
          >
            <Flame className={`w-8 h-8 ${flameColors[streakLevel]}`} />
            {currentStreak >= 7 && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-400 blur-[2px]"
              />
            )}
          </motion.div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-display font-bold text-foreground">{currentStreak}</span>
              <span className="text-xs text-muted-foreground font-medium">day streak</span>
            </div>
            <p className="text-[10px] text-muted-foreground capitalize">{streakLevel} 🔥</p>
          </div>
        </div>

        {/* Stats + Claim */}
        <div className="flex items-center gap-4">
          {canClaimProDay && (
            <Button
              size="sm"
              onClick={claimProDay}
              className="rounded-xl gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white animate-pulse hover:animate-none"
            >
              <Gift className="w-3.5 h-3.5" />
              Free Pro Day
            </Button>
          )}
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Trophy className="w-3 h-3 text-yellow-500" />
              <span className="text-sm font-bold text-foreground">{longestStreak}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Best</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold text-foreground">{totalActiveDays}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* Streak progress bar to next milestone */}
      {currentStreak > 0 && <StreakProgress current={currentStreak} />}
    </motion.div>
  );
};

const MILESTONES = [7, 14, 30, 50, 100];

const StreakProgress = ({ current }: { current: number }) => {
  const nextMilestone = MILESTONES.find((m) => m > current) || 100;
  const prevMilestone = MILESTONES.filter((m) => m <= current).pop() || 0;
  const progress = ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Next milestone: {nextMilestone} days
        </span>
        <span className="text-[10px] font-medium text-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
        />
      </div>
    </div>
  );
};

export default DailyStreakWidget;
