import { ClipboardList, FileQuestion, BookOpen } from "lucide-react";
import PageShell from "@/components/PageShell";

const features = [
  { icon: ClipboardList, title: "Past Papers", desc: "Practice with previous years' midterm and final papers" },
  { icon: FileQuestion, title: "Viva Prep", desc: "AI-simulated viva sessions for every subject" },
  { icon: BookOpen, title: "Quick Revision", desc: "Last-minute revision cards and key formulas" },
];

const ExamPrepPage = () => (
  <PageShell
    title="Exam Prep"
    subtitle="Midterms & Finals"
    icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-primary-foreground" /></div>}
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
      <p className="text-muted-foreground">🚧 Exam Prep launching soon — past papers, viva prep, and revision cards powered by AI.</p>
    </div>
  </PageShell>
);

export default ExamPrepPage;
