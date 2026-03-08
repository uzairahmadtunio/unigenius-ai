import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Github, Linkedin, ExternalLink, ArrowLeft, Code, Briefcase, FileText, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PublicProfilePage = () => {
  const { rollNumber } = useParams<{ rollNumber: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [stats, setStats] = useState({ dsaSolved: 0, interviews: 0, quizzes: 0, cvScore: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!rollNumber) return;
    const fetchProfile = async () => {
      setLoading(true);
      // Find profile by roll number
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("roll_number", rollNumber)
        .maybeSingle();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      const userId = (profileData as any).user_id;

      // Fetch badges and activity stats in parallel
      const [badgesRes, activityRes, quizRes] = await Promise.all([
        supabase.from("user_badges").select("*").eq("user_id", userId),
        supabase.from("career_activity").select("activity_type, metadata").eq("user_id", userId),
        supabase.from("quiz_results").select("id").eq("user_id", userId),
      ]);

      setBadges(badgesRes.data || []);

      const activities = activityRes.data || [];
      const cvScores = activities.filter((a: any) => a.activity_type === "cv_score").map((a: any) => (a.metadata as any)?.score || 0);

      setStats({
        dsaSolved: activities.filter((a: any) => a.activity_type === "dsa_solve").length,
        interviews: activities.filter((a: any) => a.activity_type === "interview_complete").length,
        quizzes: quizRes.data?.length || 0,
        cvScore: cvScores.length > 0 ? Math.max(...cvScores) : 0,
      });

      setLoading(false);
    };
    fetchProfile();
  }, [rollNumber]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Card className="glass max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-4xl">🔍</p>
            <h2 className="font-display font-bold text-xl text-foreground">Profile Not Found</h2>
            <p className="text-sm text-muted-foreground">No student with roll number "{rollNumber}" was found.</p>
            <Link to="/">
              <Button variant="outline" className="rounded-xl gap-2">
                <ArrowLeft className="w-4 h-4" /> Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = profile as any;

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </Button>
          </Link>
          <Badge variant="secondary" className="text-[10px]">Public Portfolio</Badge>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-border/30 overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary/30 to-accent/30" />
            <CardContent className="p-6 -mt-10 space-y-4">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-2xl bg-muted border-4 border-background overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {(p.display_name || "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display font-bold text-xl text-foreground truncate flex items-center gap-2">
                    {p.display_name || "Student"}
                    {badges.length >= 3 && <span className="text-blue-500 text-sm">✓</span>}
                  </h1>
                  {p.headline && <p className="text-xs text-muted-foreground mt-0.5">{p.headline}</p>}
                  <p className="text-[11px] text-muted-foreground">{p.university || "University of Larkana"} • {p.roll_number}</p>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-2">
                {p.github_url && (
                  <a href={p.github_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                      <Github className="w-3.5 h-3.5" /> GitHub
                    </Button>
                  </a>
                )}
                {p.linkedin_url && (
                  <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </Button>
                  </a>
                )}
              </div>

              {/* Skills */}
              {p.skills?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass border-border/30">
              <CardContent className="p-6 space-y-3">
                <h2 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" /> Badges Earned
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {badges.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                      <span className="text-xl">{b.badge_icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{b.badge_name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(b.earned_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass border-border/30">
            <CardContent className="p-6">
              <h2 className="font-display font-semibold text-sm text-foreground mb-3">Achievement Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <Code className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                  <p className="text-xl font-bold text-foreground">{stats.dsaSolved}</p>
                  <p className="text-[10px] text-muted-foreground">DSA Solved</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <Briefcase className="w-4 h-4 mx-auto mb-1 text-sky-500" />
                  <p className="text-xl font-bold text-foreground">{stats.interviews}</p>
                  <p className="text-[10px] text-muted-foreground">Interviews</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <FileText className="w-4 h-4 mx-auto mb-1 text-violet-500" />
                  <p className="text-xl font-bold text-foreground">{stats.quizzes}</p>
                  <p className="text-[10px] text-muted-foreground">Quizzes</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <Award className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <p className="text-xl font-bold text-foreground">{stats.cvScore || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">CV Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="text-center pb-8">
          <p className="text-[10px] text-muted-foreground">
            Powered by <span className="font-bold text-foreground">UniGenius</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;
