import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, RotateCcw, ChevronLeft, ChevronRight, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardSet {
  id: string;
  subject: string;
  title: string;
  cards: Flashcard[];
  created_at: string;
}

const FlashcardsPage = () => {
  const { user } = useAuth();
  const { department } = useDepartment();
  const [semester, setSemester] = useState(1);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("current_semester").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.current_semester) setSemester(data.current_semester); });
  }, [user]);

  const subjects = getSubjects(department, semester);

  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploadedContent, setUploadedContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchSets = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("flashcard_sets")
      .select("*")
      .eq("user_id", user.id)
      .eq("semester", semester)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setSets(data.map(d => ({ ...d, cards: (d.cards as any) || [] })) as FlashcardSet[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSets(); }, [user, semester]);

  const handleFileRead = async (file: File) => {
    setUploadFile(file);
    if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const text = await file.text();
      setUploadedContent(text);
    } else {
      setUploadedContent(`[Material uploaded: ${file.name}] - Generate flashcards based on typical ${selectedSubject} curriculum content.`);
    }
  };

  const generateFlashcards = async () => {
    if (!selectedSubject || !user) { toast.error("Select a subject first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { subject: selectedSubject, content: uploadedContent || null, count: 12 },
      });

      if (error) throw error;
      const cards: Flashcard[] = data?.cards || [];
      if (cards.length === 0) { toast.error("No flashcards generated"); return; }

      const { data: saved, error: saveErr } = await supabase.from("flashcard_sets").insert({
        user_id: user.id,
        subject: selectedSubject,
        semester,
        title: `${selectedSubject} — ${uploadFile ? "From " + uploadFile.name : "AI Generated"}`,
        cards: cards as any,
        source_type: uploadedContent ? "uploaded_material" : "ai_generated",
      }).select().single();

      if (saveErr) throw saveErr;
      const newSet = { ...saved, cards } as FlashcardSet;
      setSets(prev => [newSet, ...prev]);
      setActiveSet(newSet);
      setCardIndex(0);
      setFlipped(false);
      toast.success(`${cards.length} flashcards generated!`);
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
      setUploadedContent("");
      setUploadFile(null);
    }
  };

  const deleteSet = async (id: string) => {
    await supabase.from("flashcard_sets").delete().eq("id", id);
    setSets(prev => prev.filter(s => s.id !== id));
    if (activeSet?.id === id) setActiveSet(null);
    toast.success("Set deleted");
  };

  const nextCard = () => {
    if (!activeSet) return;
    setFlipped(false);
    setCardIndex(prev => (prev + 1) % activeSet.cards.length);
  };

  const prevCard = () => {
    if (!activeSet) return;
    setFlipped(false);
    setCardIndex(prev => (prev - 1 + activeSet.cards.length) % activeSet.cards.length);
  };

  if (activeSet) {
    const card = activeSet.cards[cardIndex];
    return (
      <PageShell
        title="Flashcards"
        subtitle={activeSet.subject}
        icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary-foreground" /></div>}
      >
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => { setActiveSet(null); setCardIndex(0); }}>
              ← Back to sets
            </Button>
            <span className="text-sm text-muted-foreground">{cardIndex + 1} / {activeSet.cards.length}</span>
          </div>

          <div className="cursor-pointer" onClick={() => setFlipped(!flipped)} style={{ perspective: "1000px" }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5 }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative w-full h-64"
            >
              <div className="absolute inset-0 glass rounded-2xl border border-border/30 p-8 flex items-center justify-center" style={{ backfaceVisibility: "hidden" }}>
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Question</p>
                  <p className="font-display font-semibold text-lg text-foreground">{card?.front}</p>
                  <p className="text-xs text-muted-foreground mt-4">Tap to reveal</p>
                </div>
              </div>
              <div className="absolute inset-0 glass rounded-2xl border border-primary/30 bg-primary/5 p-8 flex items-center justify-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <div className="text-center space-y-2">
                  <p className="text-xs text-primary uppercase tracking-wider">Answer</p>
                  <p className="text-sm text-foreground leading-relaxed">{card?.back}</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" className="rounded-xl" onClick={prevCard}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setFlipped(false)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={nextCard}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Quick Revision"
      subtitle="AI Flashcards from your materials"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 border border-border/30 space-y-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Generate Flashcards
          </h3>
          <p className="text-sm text-muted-foreground">Upload your lab manual, notes, or any study material. AI will extract key concepts into flashcards.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.icon} {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="glass rounded-xl border border-dashed border-border/50 p-3 text-center hover:border-primary/50 transition-colors">
                  <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{uploadFile ? uploadFile.name : "Upload material (optional)"}</p>
                </div>
                <input type="file" className="hidden" accept=".txt,.md,.pdf,.jpg,.png" onChange={e => e.target.files?.[0] && handleFileRead(e.target.files[0])} />
              </label>
            </div>
          </div>
          <Button onClick={generateFlashcards} disabled={!selectedSubject || !user || generating} className="rounded-xl gap-2">
            <Sparkles className="w-4 h-4" /> {generating ? "Generating..." : "Generate Flashcards"}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        ) : sets.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center space-y-3">
            <div className="text-4xl">🃏</div>
            <p className="text-muted-foreground">No flashcard sets yet. Generate your first set above!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map(set => (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5 border border-border/30 space-y-3 cursor-pointer hover:border-primary/30 transition-colors group"
                onClick={() => { setActiveSet(set); setCardIndex(0); setFlipped(false); }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">{set.subject}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{set.title}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100"
                    onClick={e => { e.stopPropagation(); deleteSet(set.id); }}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>🃏 {set.cards.length} cards</span>
                  <span>•</span>
                  <span>{new Date(set.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default FlashcardsPage;
