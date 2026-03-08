import { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Trophy, Medal, Crown, Star, Flame, Target, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  quizzes_taken: number;
  perfect_scores: number;
  avg_percentage: number;
}

const rankIcons = [
  <Crown className="w-5 h-5 text-amber-400" />,
  <Medal className="w-5 h-5 text-gray-300" />,
  <Medal className="w-5 h-5 text-amber-600" />,
];

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("leaderboard" as any)
      .select("*")
      .order("total_points", { ascending: false })
      .limit(50);

    if (!error && data) {
      setEntries(data as unknown as LeaderboardEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();

    // Real-time: re-fetch when quiz_results changes
    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_results" },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getUserRank = () => {
    if (!user) return -1;
    return entries.findIndex((e) => e.user_id === user.id);
  };

  const currentUserRank = getUserRank();

  return (
    <PageShell
      title="Leaderboard"
      subtitle="Top Performers"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Current user rank card */}
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
              <div className="flex-1">
                <p className="font-display font-bold text-foreground">Your Rank</p>
                <p className="text-sm text-muted-foreground">
                  {entries[currentUserRank].total_points} points • {entries[currentUserRank].quizzes_taken} quizzes • {entries[currentUserRank].perfect_scores} perfect
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="font-display font-bold text-lg text-amber-400">
                  {entries[currentUserRank].total_points}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top 3 Podium */}
        {entries.length >= 3 && (
          <div className="flex items-end justify-center gap-3 pb-4">
            {[1, 0, 2].map((idx) => {
              const entry = entries[idx];
              const isFirst = idx === 0;
              const heights = ["h-28", "h-20", "h-16"];
              const podiumHeight = heights[idx];
              const isCurrentUser = user && entry.user_id === user.id;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15, type: "spring", damping: 20 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`relative ${isCurrentUser ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background rounded-full" : ""}`}>
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt={entry.display_name || "User"}
                        className={`${isFirst ? "w-16 h-16" : "w-12 h-12"} rounded-full object-cover`}
                      />
                    ) : (
                      <div className={`${isFirst ? "w-16 h-16" : "w-12 h-12"} rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold ${isFirst ? "text-xl" : "text-sm"}`}>
                        {(entry.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -top-2 -right-2">
                      {rankIcons[idx]}
                    </div>
                  </div>
                  <p className={`font-display font-semibold text-foreground ${isFirst ? "text-sm" : "text-xs"} max-w-[80px] truncate text-center`}>
                    {entry.display_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-amber-400 font-bold">{entry.total_points} pts</p>
                  <div className={`${podiumHeight} w-20 rounded-t-xl glass border border-border/50 flex items-center justify-center`}>
                    <span className="font-display font-bold text-2xl text-muted-foreground/50">
                      {idx + 1}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full Rankings Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_100px_80px_80px] gap-2 px-4 py-3 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Rank</span>
            <span>Student</span>
            <span className="text-center">Points</span>
            <span className="text-center">Quizzes</span>
            <span className="text-center">Avg %</span>
          </div>

          <LayoutGroup>
            <AnimatePresence>
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading rankings...
                </div>
              ) : entries.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Target className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-foreground font-display font-semibold">No rankings yet</p>
                  <p className="text-xs text-muted-foreground">Complete quizzes to appear on the leaderboard!</p>
                </div>
              ) : (
                entries.map((entry, idx) => {
                  const isCurrentUser = user && entry.user_id === user.id;
                  return (
                    <motion.div
                      key={entry.user_id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, type: "spring", damping: 25 }}
                      className={`grid grid-cols-[60px_1fr_100px_80px_80px] gap-2 px-4 py-3 items-center border-b border-border/20 transition-colors ${
                        isCurrentUser
                          ? "bg-amber-500/10 border-l-4 border-l-amber-500"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center">
                        {idx < 3 ? (
                          rankIcons[idx]
                        ) : (
                          <span className="font-display font-bold text-sm text-muted-foreground">
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Student */}
                      <div className="flex items-center gap-3 min-w-0">
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt={entry.display_name || "User"}
                            className={`w-8 h-8 rounded-lg object-cover flex-shrink-0 ${isCurrentUser ? "ring-2 ring-amber-400" : ""}`}
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0 ${isCurrentUser ? "ring-2 ring-amber-400" : ""}`}>
                            {(entry.display_name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`font-display font-semibold text-sm truncate ${isCurrentUser ? "text-amber-400" : "text-foreground"}`}>
                            {entry.display_name || "Anonymous"}
                            {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                          </p>
                          {entry.perfect_scores > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] text-amber-400">{entry.perfect_scores} perfect</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-center">
                        <span className={`font-display font-bold text-sm ${isCurrentUser ? "text-amber-400" : "text-foreground"}`}>
                          {entry.total_points}
                        </span>
                      </div>

                      {/* Quizzes */}
                      <div className="text-center text-sm text-muted-foreground">
                        {entry.quizzes_taken}
                      </div>

                      {/* Avg % */}
                      <div className="text-center">
                        <span className={`text-sm font-medium ${
                          entry.avg_percentage >= 80
                            ? "text-emerald-400"
                            : entry.avg_percentage >= 60
                            ? "text-amber-400"
                            : "text-destructive"
                        }`}>
                          {entry.avg_percentage}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>

        {/* Points System Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-4 space-y-2"
        >
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Scoring System
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Each correct answer = <span className="font-bold text-foreground">10 points</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              Perfect score bonus = <span className="font-bold text-amber-400">+50 points</span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default LeaderboardPage;
