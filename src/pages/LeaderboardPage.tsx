import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Trophy, Crown, Medal, Flame, Target, Award, Clock, CalendarDays, Globe, Users, GraduationCap, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import PageShell from "@/components/PageShell";
import { departmentInfo, Department, useDepartment } from "@/contexts/DepartmentContext";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  university: string | null;
  department: Department | null;
  current_semester: number | null;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  quizzes_taken: number;
  perfect_scores: number;
  avg_percentage: number;
  dsa_solved: number;
  interviews_done: number;
  best_cv_score: number;
}

type TimeFilter = "all" | "week" | "month";
type ScopeFilter = "global" | "department" | "semester" | "me";

const LeaderboardPage = () => {
  const { user } = useAuth();
  const { department: activeDept } = useDepartment();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("global");

  const { data: profile } = useQuery({
    queryKey: ["profile-leaderboard", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("current_semester, department")
        .eq("user_id", user.id)
        .single();
      return data as { current_semester: number | null; department: Department | null };
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Active department always reflects the navbar selection (live), falling back to the saved profile dept.
  const effectiveDept: Department | null = activeDept ?? profile?.department ?? null;

  const semesterParam = scopeFilter === "semester" && profile?.current_semester ? profile.current_semester : null;
  const departmentParam = scopeFilter === "department" && effectiveDept ? effectiveDept : null;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard", timeFilter, scopeFilter, semesterParam, departmentParam],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard_filtered" as any, {
        time_filter: timeFilter,
        semester_filter: semesterParam,
        department_filter: departmentParam,
      } as any);
      if (error) throw error;
      return (data as unknown as LeaderboardEntry[]) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // After filtering, ranks always recalculate from the filtered array.
  const ranked = useMemo(() => entries.map((e, i) => ({ ...e, rank: i + 1 })), [entries]);
  const currentUserIndex = user ? ranked.findIndex((e) => e.user_id === user.id) : -1;
  const currentUserEntry = currentUserIndex >= 0 ? ranked[currentUserIndex] : null;

  const displayEntries = scopeFilter === "me"
    ? (currentUserEntry ? [currentUserEntry] : [])
    : ranked.slice(0, 25);

  const missingDept = scopeFilter === "department" && !effectiveDept;
  const missingSem = scopeFilter === "semester" && !profile?.current_semester;

  const deptLabel = (d?: Department | null) => (d ? departmentInfo[d].name : "—");

  return (
    <PageShell
      title="Leaderboard"
      subtitle="Compete across UniGenius"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="space-y-5">
        {/* Your Rank Banner */}
        {user && currentUserEntry && scopeFilter !== "me" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 border-2 border-amber-500/40 bg-amber-500/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg font-bold text-primary-foreground">
                #{currentUserEntry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-foreground">Your Rank</p>
                <p className="text-sm text-muted-foreground truncate">
                  {currentUserEntry.total_points} pts • {currentUserEntry.quizzes_taken} quizzes • 🔥 {currentUserEntry.current_streak}d
                </p>
              </div>
              <Flame className="w-6 h-6 text-amber-400 flex-shrink-0" />
            </div>
          </motion.div>
        )}

        {/* Scope filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 glass rounded-xl p-1 flex-wrap">
            {([
              { id: "global", label: "Global", icon: Globe },
              { id: "department", label: "Department", icon: Building2 },
              { id: "semester", label: "Semester", icon: GraduationCap },
              { id: "me", label: "My Rank", icon: Target },
            ] as { id: ScopeFilter; label: string; icon: any }[]).map((s) => (
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
          <div className="flex gap-1 glass rounded-xl p-1">
            {([
              { id: "all", label: "All Time", icon: Trophy },
              { id: "month", label: "Monthly", icon: CalendarDays },
              { id: "week", label: "Weekly", icon: Clock },
            ] as { id: TimeFilter; label: string; icon: any }[]).map((t) => (
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

        {/* Scope description */}
        {scopeFilter === "department" && profile?.department && (
          <p className="text-xs text-muted-foreground">
            Showing only <span className="font-semibold text-foreground">{departmentInfo[profile.department].fullName}</span> students.
          </p>
        )}
        {scopeFilter === "semester" && profile?.current_semester && (
          <p className="text-xs text-muted-foreground">
            Showing only <span className="font-semibold text-foreground">Semester {profile.current_semester}</span> students.
          </p>
        )}
        {(missingDept || missingSem) && (
          <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
            {missingDept ? "Pick a department first to enable this view." : "Set your semester in profile to enable this view."}
          </div>
        )}

        {/* Rankings Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[36px_1fr_60px_50px_50px_50px] sm:grid-cols-[40px_1fr_110px_70px_60px_60px_60px] gap-2 px-3 sm:px-4 py-3 border-b border-border/50 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>#</span>
            <span>Student</span>
            <span className="hidden sm:block text-center">Dept</span>
            <span className="text-center">Sem</span>
            <span className="text-center">Pts</span>
            <span className="text-center" title="Current streak">🔥</span>
            <span className="text-center hidden sm:block" title="Longest streak">★</span>
          </div>

          <LayoutGroup>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading rankings...
                </div>
              ) : displayEntries.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Target className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-foreground font-display font-semibold">
                    {scopeFilter === "me" ? "You're not ranked yet" : "No rankings yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">Complete quizzes to appear!</p>
                </div>
              ) : (
                displayEntries.map((entry) => {
                  const isCurrentUser = user && entry.user_id === user.id;
                  const rankIcons = [
                    <Crown className="w-4 h-4 text-amber-400" />,
                    <Medal className="w-4 h-4 text-gray-300" />,
                    <Medal className="w-4 h-4 text-amber-600" />,
                  ];
                  const rank = entry.rank;

                  return (
                    <motion.div
                      key={entry.user_id}
                      layout
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", damping: 25 }}
                      className={`grid grid-cols-[36px_1fr_60px_50px_50px_50px] sm:grid-cols-[40px_1fr_110px_70px_60px_60px_60px] gap-2 px-3 sm:px-4 py-3 items-center border-b border-border/20 transition-colors ${
                        isCurrentUser ? "bg-amber-500/10 border-l-4 border-l-amber-500" : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        {rank <= 3 ? rankIcons[rank - 1] : (
                          <span className="font-display font-bold text-sm text-muted-foreground">{rank}</span>
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
                            {deptLabel(entry.department)} • Sem {entry.current_semester || "?"}
                          </p>
                        </div>
                      </div>

                      <span className="hidden sm:block text-[11px] text-muted-foreground truncate text-center">
                        {entry.department ? departmentInfo[entry.department].name : "—"}
                      </span>

                      <div className="text-center text-xs text-muted-foreground">
                        {entry.current_semester ?? "—"}
                      </div>

                      <div className="text-center">
                        <span className={`font-display font-bold text-sm ${isCurrentUser ? "text-amber-400" : "text-foreground"}`}>
                          {entry.total_points}
                        </span>
                      </div>
                      <div className="text-center text-sm text-orange-400 font-medium">{entry.current_streak}</div>
                      <div className="text-center text-sm hidden sm:block text-amber-300/80">{entry.longest_streak}</div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>

        {/* Legend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-4 space-y-2">
          <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> How Scoring Works
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" />Correct = <span className="font-bold text-foreground">10 pts</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" />Perfect = <span className="font-bold text-amber-400">+50 pts</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" />DSA = <span className="font-bold text-emerald-400">+20 pts</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400" />🔥 current / ★ longest streak</div>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default LeaderboardPage;
