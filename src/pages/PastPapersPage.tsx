import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Trash2, Download, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PastPaper {
  id: string;
  user_id: string;
  subject: string;
  semester: number;
  title: string;
  description: string | null;
  paper_type: string;
  year: number | null;
  file_url: string;
  file_name: string;
  created_at: string;
}

const PastPapersPage = () => {
  const { user } = useAuth();
  const { department } = useDepartment();
  const [semester, setSemester] = useState(1);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("current_semester").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.current_semester) setSemester(data.current_semester); });
  }, [user]);

  const subjects = getSubjects(department, semester);

  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadType, setUploadType] = useState("midterm");
  const [uploadYear, setUploadYear] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchPapers = async () => {
    let query = supabase.from("past_papers").select("*").eq("semester", semester).order("created_at", { ascending: false });
    if (filterSubject !== "all") query = query.eq("subject", filterSubject);
    if (filterType !== "all") query = query.eq("paper_type", filterType);
    const { data, error } = await query;
    if (!error && data) setPapers(data as PastPaper[]);
    setLoading(false);
  };

  useEffect(() => { fetchPapers(); }, [semester, filterSubject, filterType]);

  const handleUpload = async () => {
    if (!user || !uploadFile || !uploadTitle || !uploadSubject) {
      toast.error("Please fill all required fields");
      return;
    }
    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage.from("past-papers").upload(path, uploadFile);
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from("past-papers").getPublicUrl(path);

      const { error: dbError } = await supabase.from("past_papers").insert({
        user_id: user.id,
        subject: uploadSubject,
        semester,
        title: uploadTitle,
        paper_type: uploadType,
        year: uploadYear ? parseInt(uploadYear) : null,
        file_url: urlData.publicUrl,
        file_name: uploadFile.name,
      });
      if (dbError) throw dbError;

      toast.success("Paper uploaded successfully!");
      setShowUpload(false);
      setUploadTitle("");
      setUploadSubject("");
      setUploadFile(null);
      setUploadYear("");
      fetchPapers();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deletePaper = async (paper: PastPaper) => {
    const { error } = await supabase.from("past_papers").delete().eq("id", paper.id);
    if (error) { toast.error("Failed to delete"); return; }
    setPapers(prev => prev.filter(p => p.id !== paper.id));
    toast.success("Paper deleted");
  };

  const filtered = papers.filter(p =>
    search ? p.title.toLowerCase().includes(search.toLowerCase()) || p.subject.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <PageShell
      title="Past Paper Vault"
      subtitle="Community Past Papers"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><FileText className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search papers..." className="pl-9 rounded-xl" />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="midterm">Midterm</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="sessional">Sessional</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowUpload(true)} className="rounded-xl gap-2" disabled={!user}>
            <Upload className="w-4 h-4" /> Upload
          </Button>
        </div>

        {/* Upload form */}
        <AnimatePresence>
          {showUpload && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-6 border border-border/30 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Upload Past Paper</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Paper title (e.g., Midterm 2024)" className="rounded-xl" />
                <Select value={uploadSubject} onValueChange={setUploadSubject}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="sessional">Sessional</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={uploadYear} onChange={e => setUploadYear(e.target.value)} placeholder="Year (e.g., 2024)" type="number" className="rounded-xl" />
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="text-sm text-muted-foreground" />
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploading} className="rounded-xl">{uploading ? "Uploading..." : "Submit"}</Button>
                <Button variant="ghost" onClick={() => setShowUpload(false)} className="rounded-xl">Cancel</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Papers grid */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center space-y-3">
            <div className="text-4xl">📄</div>
            <p className="text-muted-foreground">No past papers yet. Be the first to contribute!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(paper => (
              <motion.div key={paper.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border border-border/30 space-y-3 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm text-foreground">{paper.title}</h4>
                      <p className="text-xs text-muted-foreground">{paper.subject}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{paper.paper_type}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {paper.year && <span>📅 {paper.year}</span>}
                  <span>Semester {paper.semester}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a href={paper.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-xl gap-1.5 text-xs">
                      <Download className="w-3 h-3" /> View / Download
                    </Button>
                  </a>
                  {user && paper.user_id === user.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive" onClick={() => deletePaper(paper)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default PastPapersPage;
