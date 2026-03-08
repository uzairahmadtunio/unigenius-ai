import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, ExternalLink, Sparkles, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SkillProfile {
  skills: string[];
  dsaSolved: number;
  interviewsDone: number;
  bestCvScore: number;
  quizzesTaken: number;
}

interface GigRecommendation {
  title: string;
  description: string;
  requiredSkill: string;
  readiness: number; // 0-100
  platform: string;
}

const generateGigs = (profile: SkillProfile): GigRecommendation[] => {
  const gigs: GigRecommendation[] = [];
  const skillsLower = profile.skills.map(s => s.toLowerCase());

  // DSA-based gigs
  if (profile.dsaSolved >= 5) {
    gigs.push({
      title: "C++ Debugging & Problem Solving Expert",
      description: "I will debug and optimize your C++ code, fix runtime errors, and improve algorithm efficiency with proper Big-O analysis.",
      requiredSkill: "DSA",
      readiness: Math.min(100, profile.dsaSolved * 10),
      platform: "Fiverr",
    });
  }
  if (profile.dsaSolved >= 3) {
    gigs.push({
      title: "Data Structures & Algorithms Tutor",
      description: "I will teach you DSA concepts with step-by-step C++ implementations, including arrays, linked lists, trees, and sorting algorithms.",
      requiredSkill: "DSA",
      readiness: Math.min(100, profile.dsaSolved * 15),
      platform: "Fiverr",
    });
  }

  // Skill-based gigs
  if (skillsLower.some(s => s.includes("react") || s.includes("javascript") || s.includes("web"))) {
    gigs.push({
      title: "Modern React Web Application Developer",
      description: "I will build responsive React web applications with Tailwind CSS, TypeScript, and modern best practices for your startup or project.",
      requiredSkill: "React / Web Dev",
      readiness: 75,
      platform: "Fiverr",
    });
  }
  if (skillsLower.some(s => s.includes("python") || s.includes("machine learning") || s.includes("ai"))) {
    gigs.push({
      title: "Python Data Analysis & ML Model Builder",
      description: "I will build machine learning models, analyze datasets, and create data visualizations using Python, Pandas, and Scikit-learn.",
      requiredSkill: "Python / ML",
      readiness: 70,
      platform: "Upwork",
    });
  }
  if (skillsLower.some(s => s.includes("sql") || s.includes("database") || s.includes("postgres"))) {
    gigs.push({
      title: "Database Design & SQL Query Optimizer",
      description: "I will design normalized database schemas, write optimized SQL queries, and set up PostgreSQL/MySQL for your application.",
      requiredSkill: "SQL / Database",
      readiness: 65,
      platform: "Fiverr",
    });
  }
  if (skillsLower.some(s => s.includes("java") || s.includes("oop"))) {
    gigs.push({
      title: "Java OOP Assignment & Project Help",
      description: "I will complete Java assignments, build OOP-based projects with clean design patterns, and provide well-documented code.",
      requiredSkill: "Java / OOP",
      readiness: 70,
      platform: "Fiverr",
    });
  }

  // CV-based gigs
  if (profile.bestCvScore >= 70) {
    gigs.push({
      title: "Professional Resume & CV Writer for Tech Roles",
      description: "I will craft ATS-optimized resumes and CVs tailored for software engineering and tech positions with modern formatting.",
      requiredSkill: "CV Writing",
      readiness: profile.bestCvScore,
      platform: "Fiverr",
    });
  }

  // Default if nothing matches
  if (gigs.length === 0) {
    gigs.push({
      title: "Unlock Freelance Gigs",
      description: "Add skills to your profile, solve DSA problems, and complete mock interviews to unlock personalized freelance gig recommendations!",
      requiredSkill: "Getting Started",
      readiness: 10,
      platform: "—",
    });
  }

  return gigs.slice(0, 5);
};

const SkillAnalyzer = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [profileRes, activityRes, quizRes] = await Promise.all([
        supabase.from("profiles").select("skills").eq("user_id", user.id).single(),
        supabase.from("career_activity").select("activity_type, metadata").eq("user_id", user.id),
        supabase.from("quiz_results").select("id").eq("user_id", user.id),
      ]);

      const skills = ((profileRes.data as any)?.skills as string[]) || [];
      const activities = activityRes.data || [];
      const dsaSolved = activities.filter((a: any) => a.activity_type === "dsa_solve").length;
      const interviewsDone = activities.filter((a: any) => a.activity_type === "interview_complete").length;
      const cvScores = activities
        .filter((a: any) => a.activity_type === "cv_score")
        .map((a: any) => (a.metadata as any)?.score || 0);
      const bestCvScore = cvScores.length > 0 ? Math.max(...cvScores) : 0;

      setProfile({
        skills,
        dsaSolved,
        interviewsDone,
        bestCvScore,
        quizzesTaken: quizRes.data?.length || 0,
      });
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading || !profile) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const gigs = generateGigs(profile);
  const overallReadiness = Math.round(
    (Math.min(profile.dsaSolved, 10) * 3 +
      Math.min(profile.interviewsDone, 5) * 4 +
      (profile.bestCvScore / 100) * 20 +
      Math.min(profile.skills.length, 5) * 4 +
      Math.min(profile.quizzesTaken, 10) * 2) 
  );

  return (
    <div className="space-y-6">
      {/* Skill Overview */}
      <Card className="glass border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Your Skill Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{profile.dsaSolved}</p>
              <p className="text-[10px] text-muted-foreground">DSA Solved</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{profile.interviewsDone}</p>
              <p className="text-[10px] text-muted-foreground">Interviews</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{profile.bestCvScore || "—"}</p>
              <p className="text-[10px] text-muted-foreground">CV Score</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-2xl font-bold text-foreground">{profile.skills.length}</p>
              <p className="text-[10px] text-muted-foreground">Skills</p>
            </div>
          </div>

          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{skill}</Badge>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Freelance Readiness</span>
              <span className="font-semibold text-foreground">{Math.min(overallReadiness, 100)}%</span>
            </div>
            <Progress value={Math.min(overallReadiness, 100)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Recommended Gigs */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" /> Recommended Freelance Gigs
        </h3>
        {gigs.map((gig, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="glass border-border/30 hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{gig.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{gig.description}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{gig.platform}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    <Target className="w-3 h-3 mr-1" /> {gig.requiredSkill}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Progress value={gig.readiness} className="h-1.5 w-16" />
                    <span className="text-[10px] text-muted-foreground">{gig.readiness}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SkillAnalyzer;
