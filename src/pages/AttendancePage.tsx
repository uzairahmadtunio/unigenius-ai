import { useState, useEffect, useMemo } from "react";
import { CalendarCheck, AlertTriangle, CheckCircle, XCircle, MinusCircle, TrendingUp, TrendingDown, Calculator, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartment } from "@/contexts/DepartmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";

type Status = "present" | "absent" | "leave";

interface AttendanceRecord {
  id: string;
  subject: string;
  date: string;
  status: Status;
}

const MIN_ATTENDANCE = 75;

// ── Circular Progress Component ──
const CircularProgress = ({ percentage, size = 80, strokeWidth = 7 }: { percentage: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const color = percentage >= 80 ? "stroke-emerald-400" : percentage >= 75 ? "stroke-amber-400" : "stroke-red-400";
  const bgColor = percentage >= 80 ? "text-emerald-400" : percentage >= 75 ? "text-amber-400" : "text-red-400";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${color} transition-all duration-700 ease-out`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold font-display ${bgColor}`}>{percentage}%</span>
      </div>
    </div>
  );
};

// ── Bunk Calculator Logic ──
function calcBunkable(present: number, total: number): number {
  // How many more classes can I miss and stay >= 75%?
  // (present) / (total + x) >= 0.75  →  x <= (present / 0.75) - total
  if (total === 0) return 0;
  const maxBunks = Math.floor(present / (MIN_ATTENDANCE / 100)) - total;
  return Math.max(0, maxBunks);
}

function calcToReach(present: number, total: number, target: number): number {
  // How many consecutive classes to attend to reach target%?
  // (present + x) / (total + x) >= target/100
  // x >= (target * total - 100 * present) / (100 - target)
  if (total === 0) return 0;
  const current = (present / total) * 100;
  if (current >= target) return 0;
  const needed = Math.ceil((target * total - 100 * present) / (100 - target));
  return Math.max(0, needed);
}

// ── 14-Day Calendar Strip ──
const CalendarStrip = ({ records, subject }: { records: AttendanceRecord[]; subject: string }) => {
  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const rec = records.find(r => r.subject === subject && r.date === dateStr);
      arr.push({ date: d, dateStr, status: rec?.status || null });
    }
    return arr;
  }, [records, subject]);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex gap-1 justify-between">
      {days.map(({ date, dateStr, status }) => {
        const bg = status === "present" ? "bg-emerald-500" : status === "absent" ? "bg-red-500" : status === "leave" ? "bg-amber-500" : "bg-muted/30";
        return (
          <div key={dateStr} className="flex flex-col items-center gap-0.5" title={`${dateStr}: ${status || "no record"}`}>
            <span className="text-[8px] text-muted-foreground">{dayLabels[date.getDay()]}</span>
            <div className={`w-4 h-4 rounded-sm ${bg} transition-colors`} />
            <span className="text-[8px] text-muted-foreground">{date.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
};

const AttendancePage = () => {
  const { department } = useDepartment();
  const { user } = useAuth();
  const [semester, setSemester] = useState(1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const subjects = department ? getSubjects(department, semester) : [];

  useEffect(() => {
    if (user) fetchRecords();
  }, [user, semester]);

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("semester", semester)
      .order("date", { ascending: false });
    setRecords((data as AttendanceRecord[]) || []);
    setLoading(false);
  };

  const markAttendance = async (subject: string, status: Status) => {
    if (!user) { toast.error("Sign in to track attendance"); return; }
    try {
      const { error } = await supabase.from("attendance").upsert(
        { user_id: user.id, subject, semester, date: selectedDate, status },
        { onConflict: "user_id,subject,date" }
      );
      if (error) throw error;
      toast.success(`${subject}: ${status}`);
      fetchRecords();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const getStats = (subjectName: string) => {
    const subRecords = records.filter(r => r.subject === subjectName);
    const total = subRecords.length;
    const present = subRecords.filter(r => r.status === "present").length;
    const absent = subRecords.filter(r => r.status === "absent").length;
    const leaves = subRecords.filter(r => r.status === "leave").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const bunkable = calcBunkable(present, total);
    const toReach80 = calcToReach(present, total, 80);
    const toReach75 = calcToReach(present, total, 75);
    return { total, present, absent, leaves, percentage, bunkable, toReach80, toReach75 };
  };

  const getTodayStatus = (subjectName: string): Status | null => {
    const rec = records.find(r => r.subject === subjectName && r.date === selectedDate);
    return rec?.status || null;
  };

  // Overall stats
  const overallStats = useMemo(() => {
    if (subjects.length === 0) return { totalClasses: 0, totalPresent: 0, overallPct: 0, lowCount: 0 };
    let totalClasses = 0, totalPresent = 0, lowCount = 0;
    subjects.forEach(sub => {
      const s = getStats(sub.name);
      totalClasses += s.total;
      totalPresent += s.present;
      if (s.total >= 3 && s.percentage < 75) lowCount++;
    });
    const overallPct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
    return { totalClasses, totalPresent, overallPct, lowCount };
  }, [records, subjects]);

  if (!user) {
    return (
      <PageShell
        title="Attendance Tracker"
        subtitle="Smart Bunk Calculator & 75% Monitor"
        icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-primary-foreground" /></div>}
      >
        <div className="glass rounded-2xl p-8 text-center space-y-4">
          <CalendarCheck className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-foreground font-display font-semibold">Sign in to track your attendance</p>
          <p className="text-sm text-muted-foreground">Your attendance data will be saved securely.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Attendance Tracker"
      subtitle="Smart Bunk Calculator & 75% Monitor"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-6">
        {/* Overall Summary Bar */}
        <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-6">
          <CircularProgress percentage={overallStats.overallPct} size={70} strokeWidth={6} />
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-display font-bold text-foreground text-lg">Overall Attendance</h3>
            <p className="text-sm text-muted-foreground">
              {overallStats.totalPresent}/{overallStats.totalClasses} classes attended
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold font-display text-foreground">{subjects.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Subjects</p>
            </div>
            {overallStats.lowCount > 0 && (
              <div>
                <p className="text-2xl font-bold font-display text-red-400">{overallStats.lowCount}</p>
                <p className="text-[10px] text-red-400 uppercase tracking-wider">Low (&lt;75%)</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Semester</label>
            <Select value={String(semester)} onValueChange={v => setSemester(Number(v))}>
              <SelectTrigger className="rounded-xl w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="glass rounded-xl px-3 py-2 text-sm text-foreground outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">Min Required: {MIN_ATTENDANCE}%</span>
          </div>
        </div>

        {/* Subject Cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((sub, idx) => {
            const stats = getStats(sub.name);
            const todayStatus = getTodayStatus(sub.name);
            const isLow = stats.total >= 3 && stats.percentage < MIN_ATTENDANCE;
            const isExpanded = expandedSubject === sub.name;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`glass rounded-2xl overflow-hidden border-2 transition-colors ${isLow ? "border-red-500/40" : "border-transparent hover:border-primary/20"}`}
              >
                {/* Header with Circular Progress */}
                <div className="p-4 flex items-start gap-3">
                  <CircularProgress percentage={stats.percentage} size={64} strokeWidth={5} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sub.icon}</span>
                      <h4 className="font-display font-semibold text-foreground text-sm truncate">{sub.name}</h4>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span className="text-emerald-400">{stats.present}P</span>
                      <span className="text-red-400">{stats.absent}A</span>
                      <span className="text-amber-400">{stats.leaves}L</span>
                      <span>= {stats.total} total</span>
                    </div>

                    {/* Short Attendance Warning Badge */}
                    {isLow && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/15 rounded-full px-2 py-0.5 uppercase tracking-wider">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Short Attendance
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Attendance Buttons */}
                <div className="px-4 pb-3 flex gap-2">
                  {(["present", "absent", "leave"] as Status[]).map(status => {
                    const isActive = todayStatus === status;
                    const Icon = status === "present" ? CheckCircle : status === "absent" ? XCircle : MinusCircle;
                    const colors = status === "present"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      : status === "absent"
                        ? "bg-red-500/20 text-red-400 border-red-500/50"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/50";

                    return (
                      <button
                        key={status}
                        onClick={() => markAttendance(sub.name, status)}
                        className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all flex items-center justify-center gap-1 ${isActive ? colors : "border-border/50 text-muted-foreground hover:border-primary/30"
                          }`}
                      >
                        <Icon className="w-3 h-3" />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    );
                  })}
                </div>

                {/* Bunk Calculator Predictions */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setExpandedSubject(isExpanded ? null : sub.name)}
                    className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      Bunk Calculator & History
                    </span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-2">
                          {/* Predictions */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-center">
                              <TrendingDown className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                              <p className="text-lg font-bold font-display text-emerald-400">{stats.bunkable}</p>
                              <p className="text-[9px] text-muted-foreground leading-tight">classes you can<br />still miss (≥75%)</p>
                            </div>
                            <div className="rounded-xl bg-blue-500/10 p-2.5 text-center">
                              <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                              <p className="text-lg font-bold font-display text-blue-400">
                                {stats.percentage >= 80 ? "✓" : stats.toReach80}
                              </p>
                              <p className="text-[9px] text-muted-foreground leading-tight">
                                {stats.percentage >= 80 ? "already at 80%+" : "classes to attend\nto reach 80%"}
                              </p>
                            </div>
                          </div>

                          {stats.percentage < 75 && stats.total > 0 && (
                            <div className="rounded-xl bg-red-500/10 p-2.5 text-center">
                              <p className="text-xs text-red-400 font-medium">
                                ⚠️ Attend next <span className="font-bold">{stats.toReach75}</span> classes consecutively to reach 75%
                              </p>
                            </div>
                          )}

                          {/* 14-Day Calendar Strip */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              Last 14 Days
                            </div>
                            <CalendarStrip records={records} subject={sub.name} />
                            <div className="flex gap-3 justify-center mt-1">
                              <span className="flex items-center gap-1 text-[8px] text-muted-foreground">
                                <div className="w-2 h-2 rounded-sm bg-emerald-500" /> Present
                              </span>
                              <span className="flex items-center gap-1 text-[8px] text-muted-foreground">
                                <div className="w-2 h-2 rounded-sm bg-red-500" /> Absent
                              </span>
                              <span className="flex items-center gap-1 text-[8px] text-muted-foreground">
                                <div className="w-2 h-2 rounded-sm bg-amber-500" /> Leave
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
};

export default AttendancePage;
