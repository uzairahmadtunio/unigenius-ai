import { useState, useEffect } from "react";
import { FileText, Download, Loader2, Bot, FileDown, File, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getSubjects } from "@/data/subjects";
import PageShell from "@/components/PageShell";
import MarkdownMessage from "@/components/MarkdownMessage";
import { toast } from "sonner";
import { authHeader } from "@/lib/auth-header";
import { notifyAiTier } from "@/lib/ai-tier-notifier";
import { useAdmin } from "@/hooks/use-admin";
import { generateProfessionalPDF, generateDOCX } from "@/lib/pdf-generator";
import ThinkingAnimation from "@/components/ThinkingAnimation";

import { usePro } from "@/hooks/use-pro";
import ProPaywall from "@/components/ProPaywall";

const DocsGenPage = () => {
  const { isAdmin } = useAdmin();
  const { isPro, loading: proLoading } = usePro();
  const { department } = useDepartment();
  const { user } = useAuth();
  const [semester, setSemester] = useState(1);
  const [docType, setDocType] = useState<"lab" | "assignment">("lab");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; mimeType: string; data: string; size: number }>>([]);

  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentDept, setStudentDept] = useState("");
  const [studentSection, setStudentSection] = useState("");
  const [studentUniversity, setStudentUniversity] = useState("University of Larkana");

  const subjects = department ? getSubjects(department, semester) : [];

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, roll_number, current_semester, section, university")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const p = data as any;
        setStudentName(p.display_name || "");
        setRollNumber(p.roll_number || "");
        setStudentSection(p.section || "");
        setStudentUniversity(p.university || "University of Larkana");
        if (p.current_semester) setSemester(p.current_semester);
      }
    };
    fetchProfile();
    if (department) {
      setStudentDept(departmentInfo[department]?.fullName || "");
    }
  }, [user, department]);

  const handleFilePick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const MAX_TOTAL = 8 * 1024 * 1024; // ~8 MB combined
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/jpg", "application/pdf"];
    const next = [...attachments];
    let total = next.reduce((s, a) => s + a.size, 0);

    for (const f of Array.from(files)) {
      if (next.length >= 6) { toast.error("Max 6 files"); break; }
      if (!allowed.includes(f.type)) { toast.error(`${f.name}: only images or PDF`); continue; }
      if (total + f.size > MAX_TOTAL) { toast.error("Total attachment size exceeds 8 MB"); break; }
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const result = String(r.result || "");
          const idx = result.indexOf(",");
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      next.push({ name: f.name, mimeType: f.type, data, size: f.size });
      total += f.size;
    }
    setAttachments(next);
  };

  const removeAttachment = (i: number) => setAttachments(attachments.filter((_, idx) => idx !== i));

  const generateDoc = async () => {
    if (!subject || !topic.trim()) { toast.error("Select a subject and enter a topic"); return; }
    setIsGenerating(true);
    setContent("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-doc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${await authHeader()}`,
        },
        body: JSON.stringify({
          type: docType,
          subject,
          topic,
          additionalNotes,
          semester,
          media: attachments.map(a => ({ mimeType: a.mimeType, data: a.data })),
          studentInfo: {
            name: studentName || "",
            rollNumber: rollNumber || "",
            department: studentDept || "",
            section: studentSection || "",
            university: studentUniversity || "University of Larkana",
          },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
      notifyAiTier(resp, isAdmin);
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { result += c; setContent(result); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const pdfOpts = {
    subject, topic, teacherName, semester, docType: docType as "assignment" | "lab",
    studentInfo: { name: studentName, rollNumber, department: studentDept, section: studentSection, university: studentUniversity },
  };

  const handlePDF = () => {
    if (!content) { toast.error("Generate a document first"); return; }
    generateProfessionalPDF(content, pdfOpts);
    toast.success("Professional PDF downloaded!");
  };

  const handleDOCX = () => {
    if (!content) { toast.error("Generate a document first"); return; }
    generateDOCX(content, pdfOpts);
    toast.success("Word document downloaded!");
  };

  return (
    <PageShell
      title="Docs Generator"
      subtitle="Lab Manuals & Assignments"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><FileText className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="relative min-h-[400px]">
        {!isPro && !proLoading && <ProPaywall feature="professional lab manuals and AI document generation" />}
        <div className="grid lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Configure Document</h3>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Document Type</label>
              <Select value={docType} onValueChange={(v: "lab" | "assignment") => setDocType(v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab">Lab Manual</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Semester</label>
              <Select value={String(semester)} onValueChange={(v) => { setSemester(Number(v)); setSubject(""); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.icon} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                {docType === "lab" ? "Experiment / Topic" : "Assignment Topic"}
              </label>
              <Input
                placeholder={docType === "lab" ? "e.g., Linked List Implementation" : "e.g., OOP Concepts Report"}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Teacher Name (optional)</label>
              <Input
                placeholder="e.g., Prof. Ahmed Ali"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Student Info */}
            <div className="space-y-2 border-t border-border/50 pt-4">
              <label className="text-xs text-muted-foreground font-medium">Student Information</label>
              <Input placeholder="Your Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="rounded-xl" />
              <Input placeholder="Roll Number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="rounded-xl" />
              <Input placeholder="Department" value={studentDept} onChange={(e) => setStudentDept(e.target.value)} className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Additional Instructions (optional)</label>
              <Textarea
                placeholder="Any specific requirements, page count, formatting notes..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="rounded-xl min-h-[60px]"
                rows={2}
              />
            </div>

            {/* Teacher brief upload (image / PDF) */}
            <div className="space-y-2 border-t border-border/50 pt-4">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Teacher's Brief (optional)
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground text-center leading-tight">
                  Upload teacher's assignment / lab manual<br />
                  <span className="text-[10px] opacity-70">Images or PDF · up to 6 files · 8 MB total</span>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleFilePick(e.target.files); e.target.value = ""; }}
                />
              </label>
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40">
                      <File className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">{a.name}</span>
                      <span className="text-[10px] text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>


            <Button
              onClick={generateDoc}
              disabled={isGenerating}
              className="w-full rounded-xl gradient-primary text-primary-foreground gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {isGenerating ? "Generating..." : `Generate ${docType === "lab" ? "Lab Manual" : "Assignment"}`}
            </Button>

            {content && (
              <div className="flex gap-2">
                <Button onClick={handlePDF} variant="outline" className="flex-1 rounded-xl gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10">
                  <FileDown className="w-4 h-4" /> PDF
                </Button>
                <Button onClick={handleDOCX} variant="outline" className="flex-1 rounded-xl gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10">
                  <File className="w-4 h-4" /> DOCX
                </Button>
              </div>
            )}
          </div>

          {/* Mode info */}
          <div className="glass rounded-2xl p-4 space-y-2">
            <h4 className="font-display font-semibold text-foreground text-sm">
              {docType === "lab" ? "🔬 Lab Manual Mode" : "📝 Assignment Mode"}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {docType === "lab"
                ? "Generates: Cover Page → TOC → Tasks (Code + Output) → Originality Report"
                : "Generates: Cover Page → TOC → Content with Code Blocks → References → Originality Report"}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["Cover Page", "Table of Contents", "Page Numbers", "Code Formatting", "Originality Report"].map(f => (
                <span key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 overflow-y-auto" style={{ maxHeight: "700px" }}>
          {isGenerating && !content ? (
            <ThinkingAnimation message="UniGenius document generate kar raha hai..." />
          ) : content ? (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-sm text-foreground leading-relaxed min-w-0 flex-1">
                <MarkdownMessage content={content} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <FileText className="w-12 h-12 text-muted-foreground/30" />
              <div>
                <p className="font-display font-semibold text-foreground">Document Preview</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {docType === "lab"
                    ? "Configure your lab manual — generates a professional document with cover page, university header, student info, code blocks, and auto page numbering."
                    : "Configure your assignment — generates a professional document with cover page, TOC, academic formatting, references, and originality report."}
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </PageShell>
  );
};

export default DocsGenPage;
