import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Trophy, Crown, Medal, Flame, Target, Award, Clock, CalendarDays, Globe, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/PageShell";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  university: string | null;
  current_semester: number | null;
  streak_days: number;
  total_points: number;
  quizzes_taken: number;
  perfect_scores: number;
  avg_percentage: number;
  dsa_solved: number;
  interviews_done: number;
  best_cv_score: number;
}

type TimeFilter = "all" | "week";
type ScopeFilter = "global" | "class";

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("global");

  // Get current user's semester for "My Class" filter
  const { data: profile } = useQuery({
    queryKey: ["profile-semester", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("current_semester")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard-global", timeFilter, scopeFilter, profile?.current_semester],
    queryFn: async () => {
      const semesterParam = scopeFilter === "class" && profile?.current_semester
        ? profile.current_semester
        : null;

      const { data, error } = await supabase.rpc("get_leaderboard_filtered" as any, {
        time_filter: timeFilter,
        semester_filter: semesterParam,
      });
      if (error) throw error;
      return (data as unknown as LeaderboardEntry[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const top10 = entries.slice(0, 10);
  const currentUserRank = user ? entries.findIndex((e) => e.user_id === user.id) : -1;

  return (
    <PageShell
      title="Leaderboard"
      subtitle="Global Competition"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-5">
        {/* Your Rank Banner */}
        {user && currentUserRank >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 border-2 border-amber-500/40 bg-amber-500/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg font-bold text-primary-foreground">
                #{currentUserRank + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-foreground">Your Rank</p>
                <p className="text-sm text-muted-foreground truncate">
                  {entries[currentUserRank].total_points} pts • {entries[currentUserRank].quizzes_taken} quizzes • 🔥 {entries[currentUserRank].streak_days}d streak
                </p>
              </div>
              <Flame className="w-6 h-6 text-amber-400 flex-shrink-0" />
            </div>
          </motion.div>
        )}

        {/* Filters Row */}
        <div className="flex gap-2 flex-wrap">
          {/* Scope Toggle */}
          <div className="flex gap-1 glass rounded-xl p-1">
            {([
              { id: "global" as ScopeFilter, label: "Global", icon: Globe },
              { id: "class" as ScopeFilter, label: "My Class", icon: Users },
            ]).map((s) => (
              <button
                key={s.id}
                onClick={() => setScopeFilter(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all ${
                  scopeFilter === s.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>
          {/* Time Toggle */}
          <div className="flex gap-1 glass rounded-xl p-1">
            {([
              { id: "all" as TimeFilter, label: "All Time", icon: Trophy },
              { id: "week" as TimeFilter, label: "Weekly", icon: Clock },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all ${
                  timeFilter === t.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium */}
        {top10.length >= 3 && (
          <div className="flex items-end justify-center gap-3 pt-2 pb-4">
            {[1, 0, 2].map((idx) => {
              const entry = top10[idx];
              const isFirst = idx === 0;
              const heights = ["h-28", "h-20", "h-16"];
              const badges = [
                { icon: <Crown className="w-5 h-5 text-amber-400" />, ring: "ring-amber-400", gradient: "from-amber-400 to-yellow-500" },
                { icon: <Medal className="w-4 h-4 text-gray-300" />, ring: "ring-gray-300", gradient: "from-gray-300 to-gray-400" },
                { icon: <Medal className="w-4 h-4 text-amber-600" />, ring: "ring-amber-600", gradient: "from-amber-600 to-amber-700" },
              ];
              const badge = badges[idx];
              const isCurrentUser = user && entry.user_id === user.id;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.12, type: "spring", damping: 20 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={`relative ${isCurrentUser ? `ring-2 ${badge.ring} ring-offset-2 ring-offset-background rounded-full` : ""}`}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className={`${isFirst ? "w-16 h-16" : "w-12 h-12"} rounded-full object-cover`} />
                    ) : (
                      <div className={`${isFirst ? "w-16 h-16 text-xl" : "w-12 h-12 text-sm"} rounded-full bg-gradient-to-br ${badge.gradient} flex items-center justify-center text-primary-foreground font-bold`}>
                        {(entry.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -top-2 -right-2">{badge.icon}</div>
                  </div>
                  <p className={`font-display font-semibold text-foreground ${isFirst ? "text-sm" : "text-xs"} max-w-[80px] truncate text-center`}>
                    {entry.display_name || "Anonymous"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[80px] text-center">
                    {entry.university ? entry.university.replace("University of ", "U. ") : "—"}
                  </p>
                  <p className="text-xs text-amber-400 font-bold">{entry.total_points} pts</p>
                  <div className={`${heights[idx]} w-20 rounded-t-xl glass border border-border/50 flex items-center justify-center`}>
                    <span className="font-display font-bold text-2xl text-muted-foreground/40">{idx + 1}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rankings Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_70px_55px_50px] sm:grid-cols-[40px_1fr_100px_70px_60px_50px] gap-2 px-4 py-3 border-b border-border/50 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>#</span>
            <span>Student</span>
            <span className="hidden sm:block text-center">University</span>
            <span className="text-center">Score</span>
            <span className="text-center">Quiz</span>
            <span className="text-center">🔥</span>
          </div>

          <LayoutGroup>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading rankings...
                </div>
              ) : top10.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Target className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-foreground font-display font-semibold">No rankings yet</p>
                  <p className="text-xs text-muted-foreground">Complete quizzes to appear!</p>
                </div>
              ) : (
                top10.map((entry, idx) => {
                  const isCurrentUser = user && entry.user_id === user.id;
                  const rankIcons = [
                    <Crown className="w-4 h-4 text-amber-400" />,
                    <Medal className="w-4 h-4 text-gray-300" />,
                    <Medal className="w-4 h-4 text-amber-600" />,
                  ];

                  return (
                    <motion.div
                      key={entry.user_id}
                      layout
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, type: "spring", damping: 25 }}
                      className={`grid grid-cols-[40px_1fr_70px_55px_50px] sm:grid-cols-[40px_1fr_100px_70px_60px_50px] gap-2 px-4 py-3 items-center border-b border-border/20 transition-colors ${
                        isCurrentUser ? "bg-amber-500/10 border-l-4 border-l-amber-500" : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        {idx < 3 ? rankIcons[idx] : (
                          <span className="font-display font-bold text-sm text-muted-foreground">{idx + 1}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 min-w-0">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className={`w-8 h-8 rounded-lg object-cover flex-shrink-0 ${isCurrentUser ? "ring-2 ring-amber-400" : ""}`} />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0 ${isCurrentUser ? "ring-2 ring-amber-400" : ""}`}>
                            {(entry.display_name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`font-display font-semibold text-sm truncate ${isCurrentUser ? "text-amber-400" : "text-foreground"}`}>
                            {entry.display_name || "Anonymous"}
                            {isCurrentUser && <span className="text-[10px] ml-1 opacity-70">(You)</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate sm:hidden">
                            {entry.university || "—"} • Sem {entry.current_semester || "?"}
                          </p>
                        </div>
                      </div>

                      <span className="hidden sm:block text-[11px] text-muted-foreground truncate text-center">
                        {entry.university ? entry.university.replace("University of ", "U. ") : "—"}
                      </span>

                      <div className="text-center">
                        <span className={`font-display font-bold text-sm ${isCurrentUser ? "text-amber-400" : "text-foreground"}`}>
                          {entry.total_points}
                        </span>
                      </div>
                      <div className="text-center text-sm text-muted-foreground">{entry.quizzes_taken}</div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-orange-400">{entry.streak_days}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>

        {/* Scoring Legend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-4 space-y-2">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> How Scoring Works
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Correct = <span className="font-bold text-foreground">10 pts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              Perfect = <span className="font-bold text-amber-400">+50 pts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              DSA = <span className="font-bold text-emerald-400">+20 pts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              Streak = <span className="font-bold text-orange-400">Tiebreaker</span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default LeaderboardPage;
