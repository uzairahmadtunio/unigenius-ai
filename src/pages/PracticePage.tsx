import { Brain, ListChecks, Clock, Target } from "lucide-react";
import PageShell from "@/components/PageShell";

const features = [
  { icon: ListChecks, title: "MCQ Quizzes", desc: "AI-generated multiple choice questions for every subject" },
  { icon: Clock, title: "Timed Tests", desc: "Simulate real exam pressure with countdown timers" },
  { icon: Target, title: "Weak Area Focus", desc: "Practice more on topics you struggle with" },
];

const PracticePage = () => (
  <PageShell
    title="Practice Mode"
    subtitle="Quizzes & Mock Tests"
    icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Brain className="w-5 h-5 text-primary-foreground" /></div>}
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
      <p className="text-muted-foreground">🚧 Practice quizzes coming soon — AI-generated questions for each semester subject.</p>
    </div>
  </PageShell>
);

export default PracticePage;
