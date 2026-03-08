import { useState, useEffect } from "react";
import { CalendarCheck, AlertTriangle, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { motion } from "framer-motion";
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

const AttendancePage = () => {
  const { department } = useDepartment();
  const { user } = useAuth();
  const [semester, setSemester] = useState(1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

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
      // Upsert for the date+subject combo
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

  // Calculate stats per subject
  const getStats = (subjectName: string) => {
    const subRecords = records.filter(r => r.subject === subjectName);
    const total = subRecords.length;
    const present = subRecords.filter(r => r.status === "present").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent: subRecords.filter(r => r.status === "absent").length, percentage };
  };

  // Get today's status for a subject
  const getTodayStatus = (subjectName: string): Status | null => {
    const rec = records.find(r => r.subject === subjectName && r.date === selectedDate);
    return rec?.status || null;
  };

  if (!user) {
    return (
      <PageShell
        title="Attendance Tracker"
        subtitle="Log & Monitor"
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
      subtitle="Log & Monitor"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Semester</label>
            <Select value={String(semester)} onValueChange={v => setSemester(Number(v))}>
              <SelectTrigger className="rounded-xl w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
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
        </div>

        {/* Mark Attendance */}
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-foreground">Mark Attendance — {selectedDate}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map(sub => {
              const todayStatus = getTodayStatus(sub.name);
              const stats = getStats(sub.name);
              const isLow = stats.total >= 3 && stats.percentage < 75;

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass rounded-2xl p-4 space-y-3 border-2 ${isLow ? "border-destructive/50" : "border-transparent"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{sub.icon}</span>
                    <h4 className="font-display font-semibold text-foreground text-sm flex-1 truncate">{sub.name}</h4>
                  </div>

                  {/* Status buttons */}
                  <div className="flex gap-2">
                    {(["present", "absent", "leave"] as Status[]).map(status => {
                      const isActive = todayStatus === status;
                      const Icon = status === "present" ? CheckCircle : status === "absent" ? XCircle : MinusCircle;
                      const colors = status === "present"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : status === "absent"
                        ? "bg-destructive/20 text-destructive border-destructive/50"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/50";

                      return (
                        <button
                          key={status}
                          onClick={() => markAttendance(sub.name, status)}
                          className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all flex items-center justify-center gap-1 ${
                            isActive ? colors : "border-border/50 text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{stats.present}/{stats.total} classes</span>
                    <span className={`font-bold ${isLow ? "text-destructive" : stats.percentage >= 75 ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {stats.total > 0 ? `${stats.percentage}%` : "—"}
                    </span>
                  </div>

                  {isLow && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-2 py-1">
                      <AlertTriangle className="w-3 h-3" />
                      Low Attendance Warning!
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default AttendancePage;
