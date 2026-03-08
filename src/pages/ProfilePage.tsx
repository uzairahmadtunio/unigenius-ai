import { useState, useEffect, useRef } from "react";
import { User, Trophy, Calculator, Camera, Save, Edit2, Calendar, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment, departmentInfo, Department } from "@/contexts/DepartmentContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";

interface QuizResult {
  id: string;
  subject: string;
  score: number;
  total: number;
  semester: number;
  quiz_type: string;
  created_at: string;
}

interface ProfileData {
  display_name: string;
  roll_number: string;
  current_semester: number;
  section: string;
  university: string;
  avatar_url: string;
  created_at: string;
}

const gradePoints: Record<string, number> = { "A+": 4.0, A: 4.0, "A-": 3.67, "B+": 3.33, B: 3.0, "B-": 2.67, "C+": 2.33, C: 2.0, "C-": 1.67, D: 1.0, F: 0.0 };

interface CourseGrade { grade: string; credits: number }

const departments = [
  { value: "se", label: "Software Engineering" },
  { value: "cs", label: "Computer Science" },
  { value: "ai", label: "Artificial Intelligence" },
  { value: "it", label: "Information Technology" },
  { value: "ee", label: "Electrical Engineering" },
  { value: "me", label: "Mechanical Engineering" },
];

const ProfilePage = () => {
  const { user } = useAuth();
  const { department, setDepartment } = useDepartment();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [courses, setCourses] = useState<CourseGrade[]>([{ grade: "A", credits: 3 }]);

  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    roll_number: "",
    current_semester: 1,
    section: "",
    university: "University of Larkana",
    avatar_url: "",
    created_at: "",
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const fetchData = async () => {
      const [profileRes, quizRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("quiz_results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (profileRes.data) {
        const p = profileRes.data as any;
        setProfile({
          display_name: p.display_name || "",
          roll_number: p.roll_number || "",
          current_semester: p.current_semester || 1,
          section: p.section || "",
          university: p.university || "University of Larkana",
          avatar_url: p.avatar_url || "",
          created_at: p.created_at || "",
        });
      }
      if (quizRes.data) setQuizResults(quizRes.data);
    };
    fetchData();
  }, [user, navigate]);

  const updateField = (field: keyof ProfileData, value: string | number) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
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
    } finally {
      setIsUploading(false);
    }
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
      } as any).eq("user_id", user.id);

      if (error) throw error;

      // Sync department context if it maps
      const deptMap: Record<string, Department> = {
        "Software Engineering": "se",
        "Computer Science": "cs",
        "Artificial Intelligence": "ai",
      };
      // Department is stored via context, not in profiles table directly

      toast.success("Profile saved successfully!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
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
      const points = gradePoints[c.grade] ?? 0;
      totalPoints += points * c.credits;
      totalCredits += c.credits;
    }
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  })();

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  if (!user) return null;

  return (
    <PageShell
      title="My Profile"
      subtitle="Manage your student information"
      icon={<div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><User className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-foreground">Student Profile</h3>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              className="rounded-xl gap-1.5 text-xs"
              onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </div>

          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="w-20 h-20 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {profile.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={profile.display_name}
                  onChange={(e) => updateField("display_name", e.target.value)}
                  placeholder="Full Name"
                  className="rounded-xl font-semibold"
                />
              ) : (
                <h2 className="font-display font-bold text-lg text-foreground truncate">
                  {profile.display_name || user.email}
                </h2>
              )}
              <p className="text-sm text-muted-foreground truncate mt-0.5">{user.email}</p>
              {memberSince && (
                <Badge variant="secondary" className="mt-1.5 gap-1 text-[10px]">
                  <Calendar className="w-3 h-3" /> Member since {memberSince}
                </Badge>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-3">
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
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

        {/* GPA Calculator */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">GPA Calculator (4.0 Scale)</h3>
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
            <h3 className="font-display font-semibold text-foreground">Recent Quiz Results</h3>
          </div>

          {quizResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No quiz results yet. Go to Practice Mode to take your first quiz!</p>
              <Button onClick={() => navigate("/practice")} className="mt-3 rounded-xl gradient-primary text-primary-foreground" size="sm">
                Start Practicing
              </Button>
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
                    <p className={`font-bold text-sm ${(r.score / r.total) * 100 >= 60 ? "text-emerald-500" : "text-destructive"}`}>
                      {r.score}/{r.total}
                    </p>
                    <p className="text-xs text-muted-foreground">{Math.round((r.score / r.total) * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </PageShell>
  );
};

export default ProfilePage;
