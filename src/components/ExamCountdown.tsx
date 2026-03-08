import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const ExamCountdown = ({ semester }: { semester: number }) => {
  const [nextExam, setNextExam] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const fetchExam = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("exam_schedule" as any)
        .select("*")
        .eq("semester", semester)
        .gte("exam_date", now)
        .order("exam_date", { ascending: true })
        .limit(1);

      if (data && data.length > 0) setNextExam(data[0]);
    };
    fetchExam();
  }, [semester]);

  useEffect(() => {
    if (!nextExam) return;
    const tick = () => {
      const diff = new Date(nextExam.exam_date).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextExam]);

  if (!nextExam) return null;

  const urgency = timeLeft.days <= 3 ? "text-destructive" : timeLeft.days <= 7 ? "text-amber-500" : "text-primary";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass border-border/30 overflow-hidden">
        <div className={`h-1 ${timeLeft.days <= 3 ? "bg-destructive" : timeLeft.days <= 7 ? "bg-amber-500" : "bg-primary"}`} />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Clock className={`w-5 h-5 ${urgency}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display font-semibold text-xs text-foreground">Next Exam</p>
                <Badge variant="outline" className="text-[9px]">{(nextExam as any).exam_type}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <BookOpen className="w-3 h-3" /> {(nextExam as any).subject}
              </p>
            </div>
            <div className="flex gap-1.5 text-center">
              {[
                { val: timeLeft.days, label: "D" },
                { val: timeLeft.hours, label: "H" },
                { val: timeLeft.minutes, label: "M" },
                { val: timeLeft.seconds, label: "S" },
              ].map((t, i) => (
                <div key={i} className="w-10 rounded-lg bg-muted/80 p-1.5">
                  <p className={`text-sm font-bold font-mono ${urgency}`}>
                    {String(t.val).padStart(2, "0")}
                  </p>
                  <p className="text-[8px] text-muted-foreground">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ExamCountdown;
