import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { Presentation, Sparkles, Download, Loader2, Edit3, Check, X, Plus, Minus, Trash2, Volume2, Square, Palette, ArrowUp, MessageSquareText, ImageIcon } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Dynamic Lucide icon
const DynamicIcon = ({ name, ...props }: { name: string } & Omit<LucideProps, "ref">) => {
  const iconName = name as keyof typeof dynamicIconImports;
  const safeName = dynamicIconImports[iconName] ? iconName : "presentation";
  const LucideIcon = lazy(dynamicIconImports[safeName as keyof typeof dynamicIconImports]);
  return <Suspense fallback={<div className="w-4 h-4" />}><LucideIcon {...props} /></Suspense>;
};

interface Slide {
  title: string;
  subtitle?: string;
  bullets: string[];
  imageSuggestion: string;
  icon: string;
  speakerNotes: string;
}

type ThemeKey = "academic" | "darkTech" | "minimalist";

interface ThemeConfig {
  label: string;
  desc: string;
  // Preview (WYSIWYG) — matches export
  slideBg: string;
  slideHeaderBg: string;
  slideTitleColor: string;
  slideSubtitleColor: string;
  slideBulletColor: string;
  slideBulletDot: string;
  slideNumberColor: string;
  slideHintBg: string;
  slideHintText: string;
  notesBg: string;
  // PPTX export hex
  pptxBg: string;
  pptxHeaderBg: string;
  pptxTitle: string;
  pptxSubtitle: string;
  pptxBullet: string;
  pptxHint: string;
  pptxSlideNum: string;
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  academic: {
    label: "🎓 Academic",
    desc: "Professional Blue & White",
    slideBg: "bg-white dark:bg-[#F0F4F8]",
    slideHeaderBg: "bg-gradient-to-r from-[#1E40AF] to-[#2563EB]",
    slideTitleColor: "text-white",
    slideSubtitleColor: "text-white/80",
    slideBulletColor: "text-[#1E293B] dark:text-[#1E293B]",
    slideBulletDot: "bg-[#2563EB]",
    slideNumberColor: "text-[#94A3B8]",
    slideHintBg: "bg-[#EFF6FF]",
    slideHintText: "text-[#6B7280]",
    notesBg: "bg-blue-50/60 dark:bg-blue-950/20",
    pptxBg: "F0F4F8",
    pptxHeaderBg: "1E40AF",
    pptxTitle: "FFFFFF",
    pptxSubtitle: "CBD5E1",
    pptxBullet: "1E293B",
    pptxHint: "6B7280",
    pptxSlideNum: "94A3B8",
  },
  darkTech: {
    label: "⚡ Dark Tech",
    desc: "Charcoal & Neon Blue",
    slideBg: "bg-[#0F172A]",
    slideHeaderBg: "bg-gradient-to-r from-[#0E7490] to-[#7C3AED]",
    slideTitleColor: "text-white",
    slideSubtitleColor: "text-cyan-200/80",
    slideBulletColor: "text-[#CBD5E1]",
    slideBulletDot: "bg-[#22D3EE]",
    slideNumberColor: "text-[#475569]",
    slideHintBg: "bg-[#1E293B]",
    slideHintText: "text-[#64748B]",
    notesBg: "bg-purple-950/30",
    pptxBg: "0F172A",
    pptxHeaderBg: "0E7490",
    pptxTitle: "FFFFFF",
    pptxSubtitle: "67E8F9",
    pptxBullet: "CBD5E1",
    pptxHint: "64748B",
    pptxSlideNum: "475569",
  },
  minimalist: {
    label: "📄 Minimalist",
    desc: "Clean Black & White",
    slideBg: "bg-[#FAFAFA] dark:bg-[#18181B]",
    slideHeaderBg: "bg-[#18181B] dark:bg-[#27272A]",
    slideTitleColor: "text-white",
    slideSubtitleColor: "text-white/70",
    slideBulletColor: "text-[#3F3F46] dark:text-[#A1A1AA]",
    slideBulletDot: "bg-[#71717A]",
    slideNumberColor: "text-[#A1A1AA]",
    slideHintBg: "bg-[#F4F4F5] dark:bg-[#27272A]",
    slideHintText: "text-[#A1A1AA]",
    notesBg: "bg-zinc-50/60 dark:bg-zinc-800/30",
    pptxBg: "FAFAFA",
    pptxHeaderBg: "18181B",
    pptxTitle: "FFFFFF",
    pptxSubtitle: "A1A1AA",
    pptxBullet: "3F3F46",
    pptxHint: "A1A1AA",
    pptxSlideNum: "A1A1AA",
  },
};

const SLIDES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-slides`;

const PresentationPage = () => {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSlide, setEditSlide] = useState<Slide | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("darkTech");
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const slidesContainerRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const t = THEMES[theme];

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (slides.length > 0 && slidesContainerRef.current) {
      setTimeout(() => slidesContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [slides.length]);

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth" });
  const toggleNotes = (idx: number) => {
    setExpandedNotes(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };

  const generateSlides = useCallback(async () => {
    if (!topic.trim()) { toast.error("Please enter a topic!"); return; }
    setIsGenerating(true);
    setSlides([]);
    setExpandedNotes(new Set());
    try {
      const resp = await fetch(SLIDES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ topic: topic.trim(), slideCount }),
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || "Failed to generate slides"); }
      const data = await resp.json();
      if (!data.slides || !Array.isArray(data.slides)) throw new Error("Invalid response");
      const enriched = data.slides.map((s: any) => ({
        title: s.title || "Untitled",
        subtitle: s.subtitle || "",
        bullets: (Array.isArray(s.bullets) ? s.bullets : []).slice(0, 4),
        imageSuggestion: s.imageSuggestion || "",
        icon: s.icon || "presentation",
        speakerNotes: s.speakerNotes || "",
      }));
      setSlides(enriched);
      toast.success(`${enriched.length} slides generated!`);
    } catch (err: any) { toast.error(err.message || "Generation failed"); }
    finally { setIsGenerating(false); }
  }, [topic, slideCount]);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditSlide({ ...slides[index], bullets: [...slides[index].bullets] });
  };
  const saveEdit = () => {
    if (editingIndex === null || !editSlide) return;
    setSlides(prev => prev.map((s, i) => i === editingIndex ? editSlide : s));
    setEditingIndex(null); setEditSlide(null);
    toast.success("Slide updated!");
  };
  const cancelEdit = () => { setEditingIndex(null); setEditSlide(null); };
  const deleteSlide = (index: number) => { setSlides(prev => prev.filter((_, i) => i !== index)); toast.success("Slide removed"); };

  const handleReadSlide = useCallback((idx: number) => {
    if (speakingIdx === idx) { window.speechSynthesis.cancel(); setSpeakingIdx(null); return; }
    window.speechSynthesis.cancel();
    const slide = slides[idx];
    const text = slide.speakerNotes ? `${slide.title}. ${slide.speakerNotes}` : `${slide.title}. ${slide.bullets.join(". ")}`;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith("en"));
    const best = enVoices.find(v => v.name.includes("Google") || v.name.includes("Natural")) || enVoices[0] || voices[0];
    if (best) utterance.voice = best;
    utterance.lang = "en-US"; utterance.rate = 0.95; utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  }, [speakingIdx, slides]);

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
        s.background = { fill: t.pptxBg };
        if (slide.speakerNotes) s.addNotes(slide.speakerNotes);

        // Slide number bottom-right
        s.addText(`${idx + 1} / ${slides.length}`, {
          x: 11.5, y: 6.8, w: 1.5, fontSize: 9, color: t.pptxSlideNum, align: "right",
        });

        const isTitle = idx === 0;
        const isThankYou = idx === slides.length - 1 && slide.title.toUpperCase().includes("THANK");

        if (isTitle || isThankYou) {
          // Full header background for title/thank you
          s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: t.pptxHeaderBg } });
          s.addText(slide.title, {
            x: 1, y: isTitle ? 2 : 2.5, w: 11.33, h: 1.5, fontSize: 40, bold: true,
            color: t.pptxTitle, align: "center", fontFace: "Arial",
          });
          if (isTitle && slide.subtitle) {
            s.addText(slide.subtitle, {
              x: 2, y: 4, w: 9.33, h: 1, fontSize: 18, color: t.pptxSubtitle,
              align: "center", fontFace: "Arial",
            });
          }
          if (isThankYou && slide.bullets.length > 0) {
            s.addText(slide.bullets[0], {
              x: 2, y: 4.2, w: 9.33, h: 1, fontSize: 22, color: t.pptxSubtitle,
              align: "center", fontFace: "Arial",
            });
          }
        } else {
          // Content slide: header bar top
          s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.4, fill: { color: t.pptxHeaderBg } });
          s.addText(slide.title, {
            x: 0.8, y: 0.25, w: 11.73, h: 0.9, fontSize: 28, bold: true,
            color: t.pptxTitle, fontFace: "Arial",
          });
          // Bullets with proper spacing
          slide.bullets.forEach((bullet, bIdx) => {
            s.addText(`•   ${bullet}`, {
              x: 1.2, y: 2 + bIdx * 1.1, w: 10.5, fontSize: 20, color: t.pptxBullet,
              fontFace: "Arial", lineSpacing: 26,
            });
          });
          // Image hint in bottom corner
          if (slide.imageSuggestion) {
            s.addText(`💡 ${slide.imageSuggestion}`, {
              x: 0.8, y: 6.4, w: 8, fontSize: 9, color: t.pptxHint, italic: true,
            });
          }
        }
      });

      await pptx.writeFile({ fileName: `${topic.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_")}_presentation.pptx` });
      toast.success("PowerPoint downloaded!");
    } catch (err: any) { console.error("PPTX error:", err); toast.error("Failed to generate PowerPoint"); }
    finally { setIsDownloading(false); }
  }, [slides, topic, t]);

  // Render a single slide preview (WYSIWYG — matches PPTX output)
  const renderSlidePreview = (slide: Slide, idx: number) => {
    const isTitle = idx === 0;
    const isThankYou = idx === slides.length - 1 && slide.title.toUpperCase().includes("THANK");

    if (isTitle || isThankYou) {
      return (
        <div className={`${t.slideHeaderBg} w-full aspect-video rounded-t-none rounded-b-xl flex flex-col items-center justify-center p-8 relative`}>
          <h2 className={`font-display font-bold text-2xl sm:text-3xl ${t.slideTitleColor} text-center`}>
            {slide.title}
          </h2>
          {isTitle && slide.subtitle && (
            <p className={`mt-3 text-sm sm:text-base ${t.slideSubtitleColor} text-center`}>{slide.subtitle}</p>
          )}
          {isThankYou && slide.bullets.length > 0 && (
            <p className={`mt-4 text-base sm:text-lg ${t.slideSubtitleColor} text-center`}>{slide.bullets[0]}</p>
          )}
          {/* Slide number */}
          <span className="absolute bottom-3 right-4 text-[10px] text-white/30">{idx + 1} / {slides.length}</span>
        </div>
      );
    }

    return (
      <div className={`${t.slideBg} w-full rounded-t-none rounded-b-xl relative`}>
        {/* Header bar */}
        <div className={`${t.slideHeaderBg} px-5 py-3`}>
          <div className="flex items-center gap-2.5">
            <DynamicIcon name={slide.icon} className={`w-5 h-5 ${t.slideTitleColor}`} />
            <h3 className={`font-display font-bold text-base sm:text-lg ${t.slideTitleColor}`}>{slide.title}</h3>
          </div>
        </div>
        {/* Bullets */}
        <div className="px-6 py-5 space-y-3">
          {slide.bullets.map((bullet, bIdx) => (
            <div key={bIdx} className={`flex items-start gap-3 ${t.slideBulletColor}`}>
              <span className={`w-2 h-2 rounded-full ${t.slideBulletDot} mt-1.5 flex-shrink-0`} />
              <span className="text-sm sm:text-base leading-relaxed">{bullet}</span>
            </div>
          ))}
        </div>
        {/* Image hint — corner box */}
        {slide.imageSuggestion && (
          <div className={`mx-5 mb-4 ${t.slideHintBg} rounded-lg px-3 py-2 flex items-start gap-2`}>
            <span className="text-sm flex-shrink-0">💡</span>
            <p className={`text-[11px] italic ${t.slideHintText} leading-snug`}>
              Recommended Image: {slide.imageSuggestion}
            </p>
          </div>
        )}
        {/* Slide number */}
        <span className={`absolute bottom-2.5 right-4 text-[10px] ${t.slideNumberColor}`}>{idx + 1} / {slides.length}</span>
      </div>
    );
  };

  return (
    <PageShell
      title="AI Slide Maker"
      subtitle="Gamma-style AI Presentations"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Presentation className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="space-y-6" ref={topRef}>
        {/* Input Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Presentation Topic</label>
            <Input
              value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Listening Skills & Reading Skills"
              className="rounded-xl text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && !isGenerating) generateSlides(); }}
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <Select value={theme} onValueChange={(v) => setTheme(v as ThemeKey)}>
                <SelectTrigger className="w-[180px] rounded-xl text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      <span className="text-xs font-medium">{THEMES[key].label}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">{THEMES[key].desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Slides:</label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSlideCount(Math.max(3, slideCount - 1))} disabled={slideCount <= 3}><Minus className="w-3 h-3" /></Button>
                <span className="w-8 text-center text-sm font-semibold text-foreground">{slideCount}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSlideCount(Math.min(20, slideCount + 1))} disabled={slideCount >= 20}><Plus className="w-3 h-3" /></Button>
              </div>
            </div>

            <Button onClick={generateSlides} disabled={isGenerating || !topic.trim()} className="rounded-xl gradient-primary text-primary-foreground gap-2 ml-auto">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? "Generating..." : "Generate Slides"}
            </Button>
          </div>

          {/* Theme bar preview */}
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Theme:</span>
            <div className={`flex-1 h-7 rounded-lg ${t.slideHeaderBg} flex items-center px-3`}>
              <span className="text-[10px] text-white font-medium">{THEMES[theme].desc}</span>
            </div>
          </div>
        </motion.div>

        {/* Download Bar */}
        {slides.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 sticky top-2 z-30">
            <div>
              <p className="text-sm font-semibold text-foreground">{slides.length} Slides — {THEMES[theme].label}</p>
              <p className="text-xs text-muted-foreground">WYSIWYG preview • Speaker notes included in export</p>
            </div>
            <Button onClick={downloadPPTX} disabled={isDownloading} className="rounded-xl gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600">
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? "Creating..." : "Download .pptx"}
            </Button>
          </motion.div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
              <Presentation className="w-8 h-8 text-white" />
            </div>
            <p className="font-display font-semibold text-foreground">Creating {slideCount} slides...</p>
            <div className="flex gap-1">
              {[0, 0.2, 0.4].map((d) => <span key={d} className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${d}s` }} />)}
            </div>
          </motion.div>
        )}

        {/* Slide Cards — WYSIWYG Preview */}
        <div ref={slidesContainerRef} className="space-y-6">
          <AnimatePresence>
            {slides.map((slide, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl overflow-hidden border border-white/10 shadow-elevated backdrop-blur-sm bg-card/30"
              >
                {/* Toolbar above slide */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50">
                  <span className="text-xs font-medium text-muted-foreground">Slide {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs gap-1 ${speakingIdx === idx ? "text-primary animate-pulse" : "text-muted-foreground hover:text-foreground"}`} onClick={() => handleReadSlide(idx)}>
                      {speakingIdx === idx ? <><Square className="w-3 h-3" /> Stop</> : <><Volume2 className="w-3 h-3" /> Listen</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => toggleNotes(idx)}>
                      <MessageSquareText className="w-3 h-3" />
                      {expandedNotes.has(idx) ? "Hide" : "Notes"}
                    </Button>
                    {editingIndex === idx ? (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-emerald-500" onClick={saveEdit}><Check className="w-3 h-3" /> Save</Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={cancelEdit}><X className="w-3 h-3" /></Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => startEdit(idx)}><Edit3 className="w-3 h-3" /> Edit</Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive/70 hover:text-destructive" onClick={() => deleteSlide(idx)}><Trash2 className="w-3 h-3" /></Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Slide Preview or Edit Mode */}
                {editingIndex === idx && editSlide ? (
                  <div className="p-5 space-y-3 bg-card">
                    <Input value={editSlide.title} onChange={(e) => setEditSlide({ ...editSlide, title: e.target.value })} className="rounded-xl font-bold text-lg" placeholder="Slide title" />
                    {editSlide.subtitle !== undefined && (
                      <Input value={editSlide.subtitle || ""} onChange={(e) => setEditSlide({ ...editSlide, subtitle: e.target.value })} className="rounded-xl text-sm" placeholder="Subtitle (e.g., Presented by...)" />
                    )}
                    {editSlide.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-4">{bIdx + 1}.</span>
                        <Input value={bullet} onChange={(e) => { const b = [...editSlide.bullets]; b[bIdx] = e.target.value; setEditSlide({ ...editSlide, bullets: b }); }} className="rounded-xl text-sm" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setEditSlide({ ...editSlide, bullets: editSlide.bullets.filter((_, i) => i !== bIdx) })}><X className="w-3 h-3" /></Button>
                      </div>
                    ))}
                    {editSlide.bullets.length < 4 && (
                      <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1" onClick={() => setEditSlide({ ...editSlide, bullets: [...editSlide.bullets, ""] })}><Plus className="w-3 h-3" /> Add Point</Button>
                    )}
                    <Textarea value={editSlide.speakerNotes} onChange={(e) => setEditSlide({ ...editSlide, speakerNotes: e.target.value })} className="rounded-xl text-sm" placeholder="Speaker notes..." rows={2} />
                    <Input value={editSlide.imageSuggestion} onChange={(e) => setEditSlide({ ...editSlide, imageSuggestion: e.target.value })} className="rounded-xl text-sm" placeholder="Image suggestion" />
                  </div>
                ) : (
                  renderSlidePreview(slide, idx)
                )}

                {/* Speaker Notes (collapsible) */}
                {editingIndex !== idx && slide.speakerNotes && expandedNotes.has(idx) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`${t.notesBg} px-5 py-3 border-t border-border/30`}>
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquareText className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Speaker Notes</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{slide.speakerNotes}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {!isGenerating && slides.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <Presentation className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="font-display font-semibold text-foreground">AI Presentation Maker</p>
            <p className="text-sm text-muted-foreground">Enter a topic and generate clean, professional slides — max 4 bullets per slide.</p>
            <p className="text-xs text-muted-foreground">🎨 3 Themes • ✏️ Edit • 🎤 Speaker Notes • 🔊 Listen • 📥 Export PPTX</p>
          </motion.div>
        )}
      </div>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-20 right-5 z-50 w-11 h-11 rounded-full gradient-primary text-white shadow-elevated flex items-center justify-center hover:scale-110 transition-transform"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default PresentationPage;
