import { useState } from "react";
import { FileText, Download, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";
import PageShell from "@/components/PageShell";
import MarkdownMessage from "@/components/MarkdownMessage";
import { toast } from "sonner";
import jsPDF from "jspdf";

const DocsGenPage = () => {
  const { department } = useDepartment();
  const [semester, setSemester] = useState(1);
  const [docType, setDocType] = useState<"lab" | "assignment">("lab");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const subjects = department ? getSubjects(department, semester) : [];

  const generateDoc = async () => {
    if (!subject || !topic.trim()) { toast.error("Select a subject and enter a topic"); return; }
    setIsGenerating(true);
    setContent("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-doc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type: docType, subject, topic }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
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

  const exportPDF = () => {
    if (!content) { toast.error("Generate a document first"); return; }
    const doc = new jsPDF();
    const title = `${docType === "lab" ? "Lab Manual" : "Assignment"} — ${subject}`;
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.text(`Topic: ${topic}`, 20, 30);
    doc.setFontSize(9);

    // Simple text wrapping
    const plainText = content
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}\w*\n?/g, ""))
      .replace(/`/g, "");

    const lines = doc.splitTextToSize(plainText, 170);
    let y = 40;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 5;
    }

    doc.save(`${subject.replace(/\s+/g, "_")}_${docType}.pdf`);
    toast.success("PDF downloaded!");
  };

  return (
    <PageShell
      title="Docs Generator"
      subtitle="Lab Manuals & Assignments"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><FileText className="w-5 h-5 text-primary-foreground" /></div>}
    >
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
              <label className="text-xs text-muted-foreground">Topic / Experiment</label>
              <Input
                placeholder="e.g., Linked List Implementation"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <Button
              onClick={generateDoc}
              disabled={isGenerating}
              className="w-full rounded-xl gradient-primary text-primary-foreground gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {isGenerating ? "Generating..." : "Generate Document"}
            </Button>

            {content && (
              <Button onClick={exportPDF} variant="outline" className="w-full rounded-xl gap-2">
                <Download className="w-4 h-4" /> Download as PDF
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 overflow-y-auto" style={{ maxHeight: "600px" }}>
          {content ? (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-sm text-foreground leading-relaxed min-w-0">
                <MarkdownMessage content={content} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <FileText className="w-12 h-12 text-muted-foreground/30" />
              <div>
                <p className="font-display font-semibold text-foreground">Document Preview</p>
                <p className="text-sm text-muted-foreground mt-1">Configure your document and click Generate to create a professional lab manual or assignment.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default DocsGenPage;
