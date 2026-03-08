import { useState, useCallback } from "react";
import { Presentation, Sparkles, Download, Loader2, Edit3, Check, X, ImageIcon, Lightbulb, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import MarkdownMessage from "@/components/MarkdownMessage";

interface Slide {
  title: string;
  bullets: string[];
  imageSuggestion: string;
}

const SLIDES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-slides`;

const PresentationPage = () => {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSlide, setEditSlide] = useState<Slide | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const generateSlides = useCallback(async () => {
    if (!topic.trim()) { toast.error("Please enter a topic!"); return; }
    setIsGenerating(true);
    setSlides([]);
    try {
      const resp = await fetch(SLIDES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic: topic.trim(), slideCount }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate slides");
      }
      const data = await resp.json();
      if (!data.slides || !Array.isArray(data.slides)) throw new Error("Invalid response");
      setSlides(data.slides);
      toast.success(`${data.slides.length} slides generated!`);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [topic, slideCount]);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditSlide({ ...slides[index], bullets: [...slides[index].bullets] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editSlide) return;
    setSlides(prev => prev.map((s, i) => i === editingIndex ? editSlide : s));
    setEditingIndex(null);
    setEditSlide(null);
    toast.success("Slide updated!");
  };

  const cancelEdit = () => { setEditingIndex(null); setEditSlide(null); };

  const deleteSlide = (index: number) => {
    setSlides(prev => prev.filter((_, i) => i !== index));
    toast.success("Slide removed");
  };

  const downloadPPTX = useCallback(async () => {
    if (slides.length === 0) return;
    setIsDownloading(true);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "UniGenius AI";
      pptx.subject = topic;
      pptx.title = topic;

      slides.forEach((slide, idx) => {
        const s = pptx.addSlide();

        // Background gradient
        s.background = { fill: "0D1B2A" };

        // Slide number
        s.addText(`${idx + 1} / ${slides.length}`, {
          x: 11.5, y: 6.8, w: 1.5, fontSize: 10, color: "6B7280", align: "right",
        });

        if (idx === 0) {
          // Title slide
          s.addText(slide.title, {
            x: 1, y: 1.5, w: 11, h: 2, fontSize: 36, bold: true, color: "FFFFFF",
            align: "center", fontFace: "Arial",
          });
          s.addText(slide.bullets.join("\n"), {
            x: 2, y: 4, w: 9, h: 2, fontSize: 18, color: "94A3B8",
            align: "center", fontFace: "Arial", lineSpacing: 28,
          });
          s.addText(`💡 ${slide.imageSuggestion}`, {
            x: 1, y: 6.2, w: 11, fontSize: 11, color: "6B7280", italic: true, align: "center",
          });
        } else {
          // Content slide
          s.addShape(pptx.ShapeType.rect, {
            x: 0, y: 0, w: 13.33, h: 1.2, fill: { color: "1B2838" },
          });
          s.addText(slide.title, {
            x: 0.8, y: 0.2, w: 11, h: 0.8, fontSize: 28, bold: true, color: "FFFFFF",
            fontFace: "Arial",
          });
          slide.bullets.forEach((bullet, bIdx) => {
            s.addText(`•  ${bullet}`, {
              x: 1, y: 1.6 + bIdx * 0.9, w: 10, fontSize: 18, color: "E2E8F0",
              fontFace: "Arial", lineSpacing: 24,
            });
          });
          s.addText(`💡 ${slide.imageSuggestion}`, {
            x: 0.8, y: 6.2, w: 11, fontSize: 11, color: "6B7280", italic: true,
          });
        }
      });

      await pptx.writeFile({ fileName: `${topic.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_")}_presentation.pptx` });
      toast.success("PowerPoint downloaded!");
    } catch (err: any) {
      console.error("PPTX error:", err);
      toast.error("Failed to generate PowerPoint");
    } finally {
      setIsDownloading(false);
    }
  }, [slides, topic]);

  return (
    <PageShell
      title="AI Slide Maker"
      subtitle="Gamma-style AI Presentations"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Presentation className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-6">
        {/* Input Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Presentation Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Introduction to Object Oriented Programming in C++"
              className="rounded-xl text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && !isGenerating) generateSlides(); }}
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Slides:</label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSlideCount(Math.max(3, slideCount - 1))} disabled={slideCount <= 3}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold text-foreground">{slideCount}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSlideCount(Math.min(20, slideCount + 1))} disabled={slideCount >= 20}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Button onClick={generateSlides} disabled={isGenerating || !topic.trim()} className="rounded-xl gradient-primary text-primary-foreground gap-2 ml-auto">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? "Generating..." : "Generate Slides"}
            </Button>
          </div>
        </motion.div>

        {/* Download Bar */}
        {slides.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{slides.length} Slides Ready</p>
              <p className="text-xs text-muted-foreground">Edit any slide below, then download as PowerPoint</p>
            </div>
            <Button onClick={downloadPPTX} disabled={isDownloading} className="rounded-xl gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600">
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? "Creating..." : "Download PowerPoint"}
            </Button>
          </motion.div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
              <Presentation className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-foreground">Creating your presentation...</p>
              <p className="text-sm text-muted-foreground mt-1">AI is designing {slideCount} professional slides</p>
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:0.4s]" />
            </div>
          </motion.div>
        )}

        {/* Slide Cards */}
        <AnimatePresence>
          {slides.map((slide, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: idx * 0.05 }}
              className="glass rounded-2xl overflow-hidden border border-border/30"
            >
              {/* Slide Header */}
              <div className="bg-gradient-to-r from-[hsl(var(--primary)/0.15)] to-[hsl(var(--secondary)/0.1)] px-5 py-3 flex items-center justify-between border-b border-border/20">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Slide {idx + 1} of {slides.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {editingIndex === idx ? (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-green-400 hover:text-green-300" onClick={saveEdit}>
                        <Check className="w-3 h-3" /> Save
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={cancelEdit}>
                        <X className="w-3 h-3" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => startEdit(idx)}>
                        <Edit3 className="w-3 h-3" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteSlide(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Slide Body */}
              <div className="p-5 space-y-4">
                {editingIndex === idx && editSlide ? (
                  <div className="space-y-3">
                    <Input
                      value={editSlide.title}
                      onChange={(e) => setEditSlide({ ...editSlide, title: e.target.value })}
                      className="rounded-xl font-semibold"
                      placeholder="Slide title"
                    />
                    {editSlide.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex gap-2 items-start">
                        <span className="text-xs text-muted-foreground mt-2.5 w-4">{bIdx + 1}.</span>
                        <Textarea
                          value={bullet}
                          onChange={(e) => {
                            const newBullets = [...editSlide.bullets];
                            newBullets[bIdx] = e.target.value;
                            setEditSlide({ ...editSlide, bullets: newBullets });
                          }}
                          className="rounded-xl text-sm min-h-[40px] resize-none"
                          rows={1}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-destructive" onClick={() => {
                          const newBullets = editSlide.bullets.filter((_, i) => i !== bIdx);
                          setEditSlide({ ...editSlide, bullets: newBullets });
                        }}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1" onClick={() => setEditSlide({ ...editSlide, bullets: [...editSlide.bullets, ""] })}>
                      <Plus className="w-3 h-3" /> Add Point
                    </Button>
                    <Input
                      value={editSlide.imageSuggestion}
                      onChange={(e) => setEditSlide({ ...editSlide, imageSuggestion: e.target.value })}
                      className="rounded-xl text-sm"
                      placeholder="Image suggestion"
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="font-display font-bold text-lg text-foreground">{slide.title}</h3>
                    <ul className="space-y-2">
                      {slide.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Image Suggestion */}
                {editingIndex !== idx && (
                  <div className="flex items-start gap-2.5 bg-muted/50 rounded-xl p-3 mt-3">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Image Suggestion</span>
                      <p className="text-xs text-muted-foreground italic mt-0.5">{slide.imageSuggestion}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {!isGenerating && slides.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <Presentation className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">AI Presentation Maker</p>
              <p className="text-sm text-muted-foreground mt-1">Enter a topic above and generate professional slides instantly.</p>
              <p className="text-xs text-muted-foreground mt-2">✨ Edit any slide • 📥 Download as PowerPoint • 💡 AI image suggestions</p>
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
};

export default PresentationPage;
