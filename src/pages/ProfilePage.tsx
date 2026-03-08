import { useState, useEffect, useRef } from "react";
import { User, Trophy, Camera, Save, Edit2, Calendar, Loader2, Github, Linkedin, BadgeCheck, X, Plus, Eye, EyeOff, Award, BookOpen, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment, departmentInfo, Department } from "@/contexts/DepartmentContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { checkProfileBadge } from "@/lib/career-points";
import SmartGPACalculator from "@/components/SmartGPACalculator";

interface QuizResult {
  id: string;
  subject: string;
  score: number;
  total: number;
  semester: number;
  quiz_type: string;
  created_at: string;
}

interface BadgeData {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_icon: string;
  earned_at: string;
}

interface AttendanceRecord {
  subject: string;
  status: string;
}

interface ProfileData {
  display_name: string;
  roll_number: string;
  current_semester: number;
  section: string;
  university: string;
  avatar_url: string;
  created_at: string;
  headline: string;
  github_url: string;
  linkedin_url: string;
  skills: string[];
  show_on_leaderboard: boolean;
}

const departments = [
  { value: "se", label: "Software Engineering" },
  { value: "cs", label: "Computer Science" },
  { value: "ai", label: "Artificial Intelligence" },
  { value: "it", label: "Information Technology" },
  { value: "ee", label: "Electrical Engineering" },
  { value: "me", label: "Mechanical Engineering" },
];

const skillOptions = ["C++", "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "HTML/CSS", "C#", "Go", "Rust", "PHP", "Swift", "Kotlin", "R", "MATLAB", "Assembly"];

// Circular progress component
const CircularProgress = ({ percentage, size = 100, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 75 ? "hsl(var(--primary))" : "hsl(var(--destructive))";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--muted))" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={color} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-foreground">{percentage}%</span>
        <span className="text-[9px] text-muted-foreground">Attendance</span>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();
  const { department, setDepartment } = useDepartment();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [attendancePercent, setAttendancePercent] = useState(0);
  const [courses, setCourses] = useState<CourseGrade[]>([{ grade: "A", credits: 3 }]);
  const [newSkill, setNewSkill] = useState("");

  const [profile, setProfile] = useState<ProfileData>({
    display_name: "", roll_number: "", current_semester: 1, section: "",
    university: "University of Larkana", avatar_url: "", created_at: "",
    headline: "", github_url: "", linkedin_url: "", skills: [], show_on_leaderboard: true,
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const fetchData = async () => {
      const [profileRes, quizRes, badgeRes, attendanceRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("quiz_results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_badges").select("*").eq("user_id", user.id).order("earned_at", { ascending: false }),
        supabase.from("attendance").select("subject, status").eq("user_id", user.id),
      ]);
      if (profileRes.data) {
        const p = profileRes.data as any;
        setProfile({
          display_name: p.display_name || "", roll_number: p.roll_number || "",
          current_semester: p.current_semester || 1, section: p.section || "",
          university: p.university || "University of Larkana", avatar_url: p.avatar_url || "",
          created_at: p.created_at || "", headline: p.headline || "",
          github_url: p.github_url || "", linkedin_url: p.linkedin_url || "",
          skills: p.skills || [], show_on_leaderboard: p.show_on_leaderboard ?? true,
        });
      }
      if (quizRes.data) setQuizResults(quizRes.data);
      if (badgeRes.data) setBadges(badgeRes.data);
      if (attendanceRes.data && attendanceRes.data.length > 0) {
        const total = attendanceRes.data.length;
        const present = attendanceRes.data.filter((a: any) => a.status === "present").length;
        setAttendancePercent(Math.round((present / total) * 100));
      }
    };
    fetchData();
  }, [user, navigate]);

  const updateField = (field: keyof ProfileData, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (!s || profile.skills.includes(s)) return;
    updateField("skills", [...profile.skills, s]);
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    updateField("skills", profile.skills.filter((s) => s !== skill));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Avatar uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally { setIsUploading(false); }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!profile.display_name.trim()) { toast.error("Name is required"); return; }
    if (!profile.roll_number.trim()) { toast.error("Roll number is required"); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: profile.display_name.trim(),
        roll_number: profile.roll_number.trim(),
        current_semester: profile.current_semester,
        section: profile.section.trim() || null,
        university: profile.university.trim() || "University of Larkana",
        headline: profile.headline.trim() || null,
        github_url: profile.github_url.trim() || null,
        linkedin_url: profile.linkedin_url.trim() || null,
        skills: profile.skills,
        show_on_leaderboard: profile.show_on_leaderboard,
      } as any).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile saved successfully!");
      setIsEditing(false);
      // Check if profile is now 100% complete for Profile Pro badge
      checkProfileBadge(user.id);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally { setIsSaving(false); }
  };

  const addCourse = () => setCourses([...courses, { grade: "A", credits: 3 }]);
  const removeCourse = (i: number) => setCourses(courses.filter((_, idx) => idx !== i));
  const updateCourse = (i: number, field: keyof CourseGrade, value: string | number) => {
    const updated = [...courses];
    updated[i] = { ...updated[i], [field]: value };
    setCourses(updated);
  };

  const gpa = (() => {
    let totalPoints = 0, totalCredits = 0;
    for (const c of courses) {
      totalPoints += (gradePoints[c.grade] ?? 0) * c.credits;
      totalCredits += c.credits;
    }
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  })();

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  // Profile completeness
  const completenessFields = [profile.display_name, profile.roll_number, profile.avatar_url, profile.headline, profile.github_url || profile.linkedin_url, department, profile.section, profile.university, profile.skills.length > 0 ? "yes" : ""];
  const filledCount = completenessFields.filter(Boolean).length;
  const completeness = Math.round((filledCount / completenessFields.length) * 100);
  const isVerified = completeness === 100;

  if (!user) return null;

  return (
    <PageShell
      title="My Profile"
      subtitle="Student Portfolio & Dashboard"
      icon={<div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><User className="w-5 h-5 text-primary-foreground" /></div>}
    >
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar */}
          <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-lg">
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {profile.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h2 className="font-display font-bold text-xl text-foreground truncate">
                {profile.display_name || user.email}
              </h2>
              {isVerified && <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />}
            </div>
            {profile.headline && (
              <p className="text-sm text-muted-foreground mt-0.5">{profile.headline}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
              {department && (
                <Badge variant="outline" className="text-[10px]">
                  {departmentInfo[department]?.name || department}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1 text-[10px]">
                Semester {profile.current_semester}
              </Badge>
              {memberSince && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Calendar className="w-3 h-3" /> Since {memberSince}
                </Badge>
              )}
              {!isVerified && (
                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                  {completeness}% Complete
                </Badge>
              )}
            </div>
            {/* Social links */}
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="w-4 h-4" />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Stats + Edit */}
          <div className="flex flex-col items-center gap-3">
            <CircularProgress percentage={attendancePercent} size={90} strokeWidth={7} />
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              className="rounded-xl gap-1.5 text-xs w-full"
              onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : isEditing ? "Save" : "Edit Profile"}
            </Button>
          </div>
        </div>

        {/* Skills Tags */}
        {profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border/50">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] gap-1">
                {skill}
                {isEditing && (
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeSkill(skill)} />
                )}
              </Badge>
            ))}
          </div>
        )}
      </motion.div>

      {/* Tabbed Content */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="personal" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-background">
            <User className="w-3.5 h-3.5" /> Personal Info
          </TabsTrigger>
          <TabsTrigger value="academic" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-background">
            <BookOpen className="w-3.5 h-3.5" /> Academic Progress
          </TabsTrigger>
          <TabsTrigger value="career" className="rounded-lg gap-1.5 text-xs data-[state=active]:bg-background">
            <TrendingUp className="w-3.5 h-3.5" /> Career & Links
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Personal Info */}
        <TabsContent value="personal">
          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-semibold text-foreground text-sm">Student Information</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Full Name</label>
                  {isEditing ? (
                    <Input value={profile.display_name} onChange={(e) => updateField("display_name", e.target.value)} placeholder="Full Name" className="rounded-xl" />
                  ) : (
                    <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2">{profile.display_name || "—"}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Academic Headline</label>
                  {isEditing ? (
                    <Input value={profile.headline} onChange={(e) => updateField("headline", e.target.value)} placeholder="e.g. Aspiring Software Engineer" className="rounded-xl" />
                  ) : (
                    <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2">{profile.headline || "—"}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Roll Number</label>
                    {isEditing ? (
                      <Input value={profile.roll_number} onChange={(e) => updateField("roll_number", e.target.value)} placeholder="e.g. 14" className="rounded-xl" />
                    ) : (
                      <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2">{profile.roll_number || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Semester</label>
                    {isEditing ? (
                      <Select value={String(profile.current_semester)} onValueChange={(v) => updateField("current_semester", Number(v))}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2">Semester {profile.current_semester}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Department</label>
                  {isEditing ? (
                    <Select value={department || ""} onValueChange={(v) => setDepartment(v as Department)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2">
                      {department ? departmentInfo[department]?.fullName || department : "—"}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Section</label>
                    {isEditing ? (
                      <Input value={profile.section} onChange={(e) => updateField("section", e.target.value)} placeholder="e.g. Section A" className="rounded-xl" />
                    ) : (
                      <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2">{profile.section || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">University</label>
                    {isEditing ? (
                      <Input value={profile.university} onChange={(e) => updateField("university", e.target.value)} className="rounded-xl" />
                    ) : (
                      <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2 truncate">{profile.university}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Privacy & Settings */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-5">
              <h3 className="font-display font-semibold text-foreground text-sm">Privacy & Preferences</h3>
              <div className="flex items-center justify-between bg-muted rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {profile.show_on_leaderboard ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Show on Global Leaderboard</p>
                    <p className="text-xs text-muted-foreground">Others can see your rank and score</p>
                  </div>
                </div>
                <Switch
                  checked={profile.show_on_leaderboard}
                  onCheckedChange={(v) => updateField("show_on_leaderboard", v)}
                  disabled={!isEditing}
                />
              </div>

              {/* Profile Completeness */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Profile Completeness</span>
                  <span className="font-semibold text-foreground">{completeness}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${completeness}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                {!isVerified && (
                  <p className="text-[10px] text-muted-foreground">Complete all fields to earn the <BadgeCheck className="w-3 h-3 inline text-primary" /> verification badge</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{quizResults.length}</p>
                  <p className="text-xs text-muted-foreground">Quizzes</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">
                    {quizResults.length > 0 ? Math.round(quizResults.reduce((a, r) => a + (r.score / r.total) * 100, 0) / quizResults.length) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-xl font-bold gradient-text">{gpa}</p>
                  <p className="text-xs text-muted-foreground">GPA</p>
                </div>
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* TAB 2: Academic Progress */}
        <TabsContent value="academic">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Achievement Gallery */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground text-sm">Achievement Gallery</h3>
              </div>
              {badges.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No badges earned yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Complete quizzes and career activities to earn badges!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {badges.map((b) => (
                    <motion.div key={b.id} whileHover={{ scale: 1.05 }} className="bg-muted rounded-xl p-3 text-center space-y-1">
                      <span className="text-2xl">{b.badge_icon}</span>
                      <p className="text-xs font-semibold text-foreground leading-tight">{b.badge_name}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(b.earned_at).toLocaleDateString()}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* GPA Calculator */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground text-sm">GPA Calculator (4.0 Scale)</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {courses.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={c.grade} onValueChange={(v) => updateCourse(i, "grade", v)}>
                      <SelectTrigger className="rounded-lg w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(gradePoints).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={String(c.credits)} onValueChange={(v) => updateCourse(i, "credits", Number(v))}>
                      <SelectTrigger className="rounded-lg w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((cr) => <SelectItem key={cr} value={String(cr)}>{cr} CH</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removeCourse(i)} className="text-xs text-destructive">✕</Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addCourse} className="rounded-xl text-xs">+ Add Course</Button>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Semester GPA</p>
                  <p className="text-2xl font-bold gradient-text">{gpa}</p>
                </div>
              </div>
            </motion.div>

            {/* Quiz History */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-foreground text-sm">Recent Quiz Results</h3>
              </div>
              {quizResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">No quiz results yet.</p>
                  <Button onClick={() => navigate("/practice")} className="mt-3 rounded-xl gradient-primary text-primary-foreground" size="sm">Start Practicing</Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  {quizResults.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{r.subject}</p>
                        <p className="text-xs text-muted-foreground">Sem {r.semester} • {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${(r.score / r.total) * 100 >= 60 ? "text-emerald-500" : "text-destructive"}`}>{r.score}/{r.total}</p>
                        <p className="text-xs text-muted-foreground">{Math.round((r.score / r.total) * 100)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </TabsContent>

        {/* TAB 3: Career & Links */}
        <TabsContent value="career">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Social Links */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-semibold text-foreground text-sm">Social & Portfolio Links</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><Github className="w-3 h-3" /> GitHub URL</label>
                  {isEditing ? (
                    <Input value={profile.github_url} onChange={(e) => updateField("github_url", e.target.value)} placeholder="https://github.com/username" className="rounded-xl" />
                  ) : (
                    <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2 truncate">
                      {profile.github_url ? <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{profile.github_url}</a> : "—"}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><Linkedin className="w-3 h-3" /> LinkedIn URL</label>
                  {isEditing ? (
                    <Input value={profile.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/username" className="rounded-xl" />
                  ) : (
                    <p className="text-sm font-medium text-foreground bg-muted rounded-xl px-3 py-2 truncate">
                      {profile.linkedin_url ? <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{profile.linkedin_url}</a> : "—"}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Technical Skills */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4">
              <h3 className="font-display font-semibold text-foreground text-sm">Technical Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs gap-1">
                    {skill}
                    {isEditing && <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeSkill(skill)} />}
                  </Badge>
                ))}
                {profile.skills.length === 0 && !isEditing && (
                  <p className="text-sm text-muted-foreground">No skills added yet.</p>
                )}
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill..." className="rounded-xl"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(newSkill); } }} />
                    <Button variant="outline" size="icon" className="rounded-xl flex-shrink-0" onClick={() => addSkill(newSkill)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skillOptions.filter((s) => !profile.skills.includes(s)).slice(0, 8).map((s) => (
                      <button key={s} onClick={() => addSkill(s)} className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default ProfilePage;
