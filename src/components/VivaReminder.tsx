import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const SUBJECTS_BY_SEMESTER: Record<number, string[]> = {
  1: ["Programming Fundamentals", "ICT", "Calculus", "Applied Physics"],
  2: ["OOP", "Data Structures", "Linear Algebra", "Digital Logic"],
  3: ["Algorithms", "Database Systems", "Software Requirements", "Computer Architecture"],
  4: ["Operating Systems", "Computer Networks", "Software Design", "Probability"],
  5: ["Software Construction", "Web Engineering", "Software Quality", "Information Security"],
  6: ["Software Project Management", "Cloud Computing", "Machine Learning", "DevOps"],
  7: ["Deep Learning", "NLP", "Computer Vision", "FYP-I"],
  8: ["Network Security", "FYP-II"],
};

const VivaReminder = ({ semester }: { semester: number }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ["viva-reminder", user?.id, semester],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const [profileRes, vivaRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user!.id).single(),
        supabase.from("chat_logs").select("subject").eq("user_id", user!.id).eq("role", "user").gte("created_at", new Date(Date.now() - 3 * 86400000).toISOString()),
      ]);

      const name = (profileRes.data as any)?.display_name?.split(" ")[0] || "Student";
      const subjects = SUBJECTS_BY_SEMESTER[semester] || SUBJECTS_BY_SEMESTER[1];
      const practicedSubjects = new Set((vivaRes.data || []).map((v: any) => v.subject));
      const unpracticed = subjects.filter(s => !practicedSubjects.has(s));

      if (unpracticed.length === 0) return null;
      const pick = unpracticed[Math.floor(Math.random() * unpracticed.length)];
      return { displayName: name, reminder: pick };
    },
  });

  if (!data || dismissed || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass rounded-2xl p-3 flex items-center gap-3 border border-primary/20"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-primary-foreground" />
        </div>
        <p className="flex-1 text-xs text-foreground">
          <span className="font-semibold">{data.displayName}</span>, time for a quick 5-minute Viva practice for{" "}
          <span className="font-semibold text-primary">{data.reminder}</span>!
        </p>
        <Button size="sm" className="rounded-xl text-[10px] gap-1 h-7 px-2.5" onClick={() => navigate("/viva-prep")}>
          Practice <ArrowRight className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="w-6 h-6 rounded-lg" onClick={() => setDismissed(true)}>
          <X className="w-3 h-3" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};

export default VivaReminder;
