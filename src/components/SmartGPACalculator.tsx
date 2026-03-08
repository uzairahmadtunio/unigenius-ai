import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, Save, Target, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Department } from "@/contexts/DepartmentContext";

// University of Larkana grading scale
const GRADING_SCALE = [
  { min: 85, grade: "A", gp: 4.0 },
  { min: 80, grade: "A-", gp: 3.67 },
  { min: 75, grade: "B+", gp: 3.33 },
  { min: 70, grade: "B", gp: 3.0 },
  { min: 65, grade: "B-", gp: 2.67 },
  { min: 60, grade: "C+", gp: 2.33 },
  { min: 55, grade: "C", gp: 2.0 },
  { min: 50, grade: "C-", gp: 1.67 },
  { min: 45, grade: "D", gp: 1.0 },
  { min: 0, grade: "F", gp: 0.0 },
];

function getGradeFromMarks(marks: number) {
  for (const g of GRADING_SCALE) {
    if (marks >= g.min) return g;
  }
  return GRADING_SCALE[GRADING_SCALE.length - 1];
}

// Default credit hours per subject (best guesses for Larkana Uni)
const CREDIT_HOURS: Record<string, number> = {
  "Programming Fundamentals": 4, "ICT": 3, "Calculus": 3, "Applied Physics": 3,
  "English Composition": 3, "Discrete Structures": 3, "Islamic Studies": 2,
  "Object-Oriented Programming (OOP)": 4, "Digital Logic Design (DLD)": 4,
  "Multivariable Calculus": 3, "Communication Skills": 3, "Pakistan Studies": 2,
  "Data Structures & Algorithms (DSA)": 4, "Software Requirement Engineering": 3,
  "Linear Algebra": 3, "Computer Organization & Assembly": 4,
  "Human Computer Interaction (HCI)": 3, "Database Systems": 4,
  "Software Design & Architecture": 3, "Operating Systems": 4,
  "Probability & Statistics": 3, "Technical Writing": 3,
  "Software Construction & Development": 4, "Computer Networks": 4,
  "Analysis of Algorithms": 3, "Artificial Intelligence": 3,
  "Software Quality Engineering": 3, "Web Engineering": 4,
  "Software Project Management (SPM)": 3, "Information Security": 3,
  "Professional Practices": 3, "Technical Elective-I": 3,
  "Final Year Project (FYP-I)": 6, "Software Re-Engineering": 3,
  "Cloud Computing": 3, "SE Elective-II": 3,
  "Final Year Project (FYP-II)": 6, "Entrepreneurship": 3,
  "SE Elective-III": 3, "Internship": 3,
  "Digital Logic Design": 4, "Statistics & Probability": 3,
  "Theory of Automata": 3, "Design & Analysis of Algorithms": 3,
  "Compiler Construction": 4, "Parallel & Distributed Computing": 3,
  "CS Elective": 3, "Data Science": 3, "Machine Learning": 4,
  "Introduction to AI": 3, "Calculus III": 3,
  "Programming for AI (Python)": 4, "Artificial Neural Networks": 4,
  "Natural Language Processing (NLP)": 3, "Deep Learning": 4,
  "Computer Vision": 4, "Knowledge Representation & Reasoning": 3,
  "Robotics": 3, "AI Ethics": 3, "Reinforcement Learning": 3,
  "Fuzzy Systems": 3, "Functional English": 3,
};

interface SubjectRow {
  name: string;
  icon: string;
  creditHours: number;
  marks: string; // string for input, empty = not entered
}

// GPA Gauge component
const GPAGauge = ({ gpa, size = 160 }: { gpa: number; size?: number }) => {
  const maxGPA = 4.0;
  const percentage = Math.min((gpa / maxGPA) * 100, 100);
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (gpa >= 3.5) return "hsl(var(--primary))";
    if (gpa >= 3.0) return "hsl(142 71% 45%)";
    if (gpa >= 2.5) return "hsl(48 96% 53%)";
    if (gpa >= 2.0) return "hsl(25 95% 53%)";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <p className="text-3xl font-bold text-foreground">{gpa.toFixed(2)}</p>
        <p className="text-[10px] text-muted-foreground">/ 4.00 GPA</p>
      </div>
    </div>
  );
};

interface SmartGPACalculatorProps {
  department: Department | null;
  userId?: string;
  currentSemester?: number;
}

const SmartGPACalculator = ({ department, userId, currentSemester = 1 }: SmartGPACalculatorProps) => {
  const [semester, setSemester] = useState(currentSemester);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [targetGPA, setTargetGPA] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load subjects when semester/department changes
  useEffect(() => {
    if (!department) return;
    const subs = getSubjects(department, semester);
    setSubjects(
      subs.map((s) => ({
        name: s.name,
        icon: s.icon,
        creditHours: CREDIT_HOURS[s.name] || 3,
        marks: "",
      }))
    );
  }, [semester, department]);

  const updateMarks = (index: number, value: string) => {
    // Allow empty or numeric 0-100
    if (value !== "" && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)) return;
    setSubjects((prev) => prev.map((s, i) => (i === index ? { ...s, marks: value } : s)));
  };

  const { gpa, totalCredits, results } = useMemo(() => {
    let totalPoints = 0;
    let totalCH = 0;
    const res = subjects.map((s) => {
      const marks = s.marks === "" ? null : Number(s.marks);
      if (marks === null) return { ...s, grade: "—", gp: 0, included: false };
      const g = getGradeFromMarks(marks);
      totalPoints += g.gp * s.creditHours;
      totalCH += s.creditHours;
      return { ...s, grade: g.grade, gp: g.gp, included: true };
    });
    return {
      gpa: totalCH > 0 ? totalPoints / totalCH : 0,
      totalCredits: totalCH,
      results: res,
    };
  }, [subjects]);

  // Calculate marks needed for target GPA
  const targetAnalysis = useMemo(() => {
    if (!targetGPA || isNaN(Number(targetGPA))) return null;
    const target = Number(targetGPA);
    if (target < 0 || target > 4) return null;

    const unfilledSubjects = subjects.filter((s) => s.marks === "");
    const filledSubjects = subjects.filter((s) => s.marks !== "");

    if (unfilledSubjects.length === 0) return { achievable: gpa >= target, message: gpa >= target ? "✅ You've already achieved your target!" : "❌ Target not met with current marks." };

    let filledPoints = 0, filledCH = 0;
    filledSubjects.forEach((s) => {
      const g = getGradeFromMarks(Number(s.marks));
      filledPoints += g.gp * s.creditHours;
      filledCH += s.creditHours;
    });

    const remainingCH = unfilledSubjects.reduce((a, s) => a + s.creditHours, 0);
    const totalCH = filledCH + remainingCH;
    const neededPoints = target * totalCH - filledPoints;
    const neededAvgGP = remainingCH > 0 ? neededPoints / remainingCH : 0;

    if (neededAvgGP > 4.0) return { achievable: false, message: `❌ Not achievable. You'd need avg GP of ${neededAvgGP.toFixed(2)} in remaining subjects (max is 4.0).` };
    if (neededAvgGP <= 0) return { achievable: true, message: "✅ You'll exceed your target even with minimum marks!" };

    // Find minimum marks needed
    const neededGrade = GRADING_SCALE.find((g) => g.gp >= neededAvgGP) || GRADING_SCALE[0];
    return { achievable: true, message: `🎯 You need an average of ${neededGrade.grade} (${neededGrade.min}+ marks) in remaining ${unfilledSubjects.length} subjects.` };
  }, [targetGPA, subjects, gpa]);

  const saveGPA = async () => {
    if (!userId) { toast.error("Please sign in first"); return; }
    setIsSaving(true);
    try {
      // Store in career_activity as gpa_record
      const { error } = await supabase.from("career_activity" as any).insert({
        user_id: userId,
        activity_type: "gpa_record",
        points: 0,
        metadata: {
          semester,
          gpa: Number(gpa.toFixed(2)),
          subjects: results.filter((r: any) => r.included).map((r: any) => ({
            name: r.name,
            marks: Number(r.marks),
            grade: r.grade,
            gp: r.gp,
            creditHours: r.creditHours,
          })),
        },
      });
      if (error) throw error;
      toast.success(`Semester ${semester} GPA (${gpa.toFixed(2)}) saved to your profile!`);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally { setIsSaving(false); }
  };

  if (!department) {
    return (
      <div className="glass rounded-2xl p-6 text-center py-8">
        <Calculator className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Select a department first to load subjects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Semester Selector + GPA Gauge */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Smart GPA Calculator</h3>
            </div>
            <p className="text-xs text-muted-foreground">University of Larkana • 4.0 Scale • Enter marks to auto-calculate</p>

            <div className="flex gap-3 items-end">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Semester</label>
                <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
                  <SelectTrigger className="rounded-xl w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Target GPA</label>
                <Input
                  value={targetGPA}
                  onChange={(e) => setTargetGPA(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="rounded-xl w-[100px]"
                />
              </div>
            </div>
          </div>

          {/* GPA Gauge */}
          <GPAGauge gpa={gpa} />
        </div>

        {/* Target analysis */}
        {targetAnalysis && (
          <div className={`mt-3 rounded-xl px-4 py-2 text-xs ${targetAnalysis.achievable ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
            {targetAnalysis.message}
          </div>
        )}
      </div>

      {/* Grading Scale Reference */}
      <div className="glass rounded-xl px-4 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-muted-foreground font-semibold">Scale:</span>
        {GRADING_SCALE.slice(0, -1).map((g) => (
          <span key={g.grade} className="text-[10px] text-muted-foreground">
            {g.min}+ = {g.grade} ({g.gp})
          </span>
        ))}
      </div>

      {/* Subjects Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="col-span-5">Subject</div>
          <div className="col-span-2 text-center">CH</div>
          <div className="col-span-2 text-center">Marks</div>
          <div className="col-span-1 text-center">Grade</div>
          <div className="col-span-2 text-center">GP</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {results.map((r: any, i: number) => {
            const gradeColor = r.grade === "A" || r.grade === "A-" ? "text-emerald-500" :
              r.grade === "B+" || r.grade === "B" ? "text-primary" :
              r.grade === "F" ? "text-destructive" : "text-foreground";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <span className="text-sm">{r.icon}</span>
                  <span className="text-xs font-medium text-foreground truncate">{r.name}</span>
                </div>
                <div className="col-span-2 text-center">
                  <Badge variant="secondary" className="text-[10px]">{r.creditHours}</Badge>
                </div>
                <div className="col-span-2 text-center">
                  <Input
                    value={subjects[i].marks}
                    onChange={(e) => updateMarks(i, e.target.value)}
                    placeholder="—"
                    className="rounded-lg h-8 text-xs text-center w-16 mx-auto"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <span className={`text-xs font-bold ${gradeColor}`}>{r.grade}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xs font-semibold text-foreground">{r.included ? r.gp.toFixed(2) : "—"}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Summary */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 items-center">
          <div className="col-span-5 text-xs font-bold text-foreground">Total / GPA</div>
          <div className="col-span-2 text-center">
            <Badge className="text-[10px]">{totalCredits} CH</Badge>
          </div>
          <div className="col-span-2" />
          <div className="col-span-1" />
          <div className="col-span-2 text-center">
            <span className="text-lg font-bold gradient-text">{gpa.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {gpa > 0 && (
        <Button onClick={saveGPA} disabled={isSaving} className="rounded-xl gap-2 gradient-primary w-full">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : `Save Semester ${semester} GPA (${gpa.toFixed(2)}) to Profile`}
        </Button>
      )}
    </div>
  );
};

export default SmartGPACalculator;
