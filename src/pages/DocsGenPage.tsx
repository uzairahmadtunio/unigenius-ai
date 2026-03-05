import { FileText, BookOpen, Download } from "lucide-react";
import PageShell from "@/components/PageShell";

const features = [
  { icon: FileText, title: "Lab Manuals", desc: "Auto-generate formatted lab reports from your code" },
  { icon: BookOpen, title: "Study Notes", desc: "AI-condensed notes from lectures and textbooks" },
  { icon: Download, title: "Export PDF", desc: "Download professional-quality documents instantly" },
];

const DocsGenPage = () => (
  <PageShell
    title="Docs Generator"
    subtitle="Lab Manuals & Notes"
    icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"><FileText className="w-5 h-5 text-primary-foreground" /></div>}
  >
    <div className="grid sm:grid-cols-3 gap-4">
      {features.map((f) => (
        <div key={f.title} className="glass rounded-2xl p-6 space-y-3">
          <f.icon className="w-8 h-8 text-primary" />
          <h3 className="font-display font-semibold text-foreground">{f.title}</h3>
          <p className="text-sm text-muted-foreground">{f.desc}</p>
        </div>
      ))}
    </div>
    <div className="glass rounded-2xl p-8 text-center mt-4">
      <p className="text-muted-foreground">🚧 Docs Gen coming soon — auto-generate lab manuals and study notes with AI.</p>
    </div>
  </PageShell>
);

export default DocsGenPage;
