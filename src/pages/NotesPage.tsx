import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileUp, Download, ThumbsUp, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  subject: string;
  semester: number;
  file_url: string;
  file_name: string;
  upvotes: number;
  user_id: string;
  uploader_name: string;
  created_at: string;
}

const NotesPage = () => {
  const { user } = useAuth();
  const { department } = useDepartment();
  const [semester, setSemester] = useState(1);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());

  const subjects = department ? getSubjects(department, semester) : [];

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notes" as any)
      .select("*")
      .eq("semester", semester)
      .order("upvotes", { ascending: false });

    if (data) setNotes(data as any);
    setLoading(false);
  };

  const fetchVotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("note_votes" as any)
      .select("note_id")
      .eq("user_id", user.id);
    if (data) setUserVotes(new Set((data as any).map((v: any) => v.note_id)));
  };

  useEffect(() => {
    fetchNotes();
    fetchVotes();
  }, [semester, user]);

  const uploadNote = async () => {
    if (!user || !file || !title.trim() || !subject) {
      toast.error("Fill all fields and select a PDF");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("notes").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("notes").getPublicUrl(path);

      const { error: insertErr } = await supabase.from("notes" as any).insert({
        title: title.trim(),
        subject,
        semester,
        file_url: urlData.publicUrl,
        file_name: file.name,
        user_id: user.id,
        uploader_name: user.user_metadata?.full_name || user.email || "Anonymous",
      } as any);

      if (insertErr) throw insertErr;
      toast.success("Notes uploaded!");
      setTitle("");
      setFile(null);
      setSubject("");
      fetchNotes();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const upvote = async (noteId: string) => {
    if (!user) { toast.error("Login to upvote"); return; }
    if (userVotes.has(noteId)) { toast.info("Already upvoted"); return; }

    await supabase.from("note_votes" as any).insert({ note_id: noteId, user_id: user.id } as any);
    await supabase.from("notes" as any).update({ upvotes: notes.find((n) => n.id === noteId)!.upvotes + 1 } as any).eq("id", noteId);

    setUserVotes((prev) => new Set([...prev, noteId]));
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, upvotes: n.upvotes + 1 } : n)));
  };

  return (
    <PageShell
      title="Notes Marketplace"
      subtitle="Share & download study notes"
      icon={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary-foreground" />
        </div>
      }
    >
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Upload */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <h3 className="font-display font-semibold text-foreground">Upload Notes</h3>

          <Input placeholder="Title (e.g., DSA Chapter 3 Notes)" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />

          <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.name}>{s.icon} {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary"
            />
          </div>

          <Button onClick={uploadNote} disabled={uploading} className="w-full rounded-xl gradient-primary text-primary-foreground gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload Notes"}
          </Button>
        </div>

        {/* Notes List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Semester {semester} Notes</h3>

          {loading ? (
            <div className="glass rounded-2xl p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            </div>
          ) : notes.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center space-y-2">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No notes yet. Be the first to upload!</p>
            </div>
          ) : (
            notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
                <button
                  onClick={() => upvote(note.id)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                    userVotes.has(note.id) ? "bg-primary/20 text-primary" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-xs font-bold">{note.upvotes}</span>
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {note.subject} • by {note.uploader_name} • {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>

                <a href={note.file_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-xs">
                    <Download className="w-3 h-3" /> Download
                  </Button>
                </a>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default NotesPage;
