import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export const fireCelebration = (points: number) => {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#fbbf24", "#f59e0b", "#d97706", "#6366f1", "#8b5cf6"],
  });

  toast.success(`🎉 Success! +${points} Points added to your Leaderboard rank!`, {
    duration: 4000,
  });
};

export const recordCareerActivity = async (
  userId: string,
  activityType: "dsa_solve" | "interview_complete" | "cv_score",
  points: number,
  metadata: Record<string, any> = {}
) => {
  const { error } = await supabase.from("career_activity" as any).insert({
    user_id: userId,
    activity_type: activityType,
    points,
    metadata,
  });

  if (error) {
    console.error("Failed to record career activity:", error);
    return false;
  }
  return true;
};

type BadgeDef = { id: string; name: string; icon: string };

const BADGES: Record<string, BadgeDef> = {
  dsa_warrior: { id: "dsa_warrior", name: "DSA Warrior", icon: "⚔️" },
  interview_ready: { id: "interview_ready", name: "Interview Ready", icon: "🎤" },
  cv_master: { id: "cv_master", name: "CV Master", icon: "📄" },
};

export const checkAndAwardBadges = async (userId: string) => {
  // Fetch career activity counts
  const { data: activities } = await supabase
    .from("career_activity" as any)
    .select("activity_type, metadata")
    .eq("user_id", userId);

  if (!activities) return;

  const dsaCount = activities.filter((a: any) => a.activity_type === "dsa_solve").length;
  const interviewCount = activities.filter((a: any) => a.activity_type === "interview_complete").length;
  const hasCvAbove80 = activities.some(
    (a: any) => a.activity_type === "cv_score" && (a.metadata as any)?.score >= 80
  );

  const badgesToAward: BadgeDef[] = [];
  if (dsaCount >= 10) badgesToAward.push(BADGES.dsa_warrior);
  if (interviewCount >= 5) badgesToAward.push(BADGES.interview_ready);
  if (hasCvAbove80) badgesToAward.push(BADGES.cv_master);

  for (const badge of badgesToAward) {
    const { error } = await supabase.from("user_badges" as any).upsert(
      { user_id: userId, badge_id: badge.id, badge_name: badge.name, badge_icon: badge.icon },
      { onConflict: "user_id,badge_id" }
    );
    if (!error) {
      // Only toast if newly inserted (upsert won't error on existing)
    }
  }
};
