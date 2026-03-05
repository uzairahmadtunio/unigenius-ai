import { Briefcase, Code, FileText } from "lucide-react";
import PageShell from "@/components/PageShell";

const features = [
  { icon: Briefcase, title: "Interview Prep", desc: "Mock interviews with AI for tech roles" },
  { icon: Code, title: "DSA Practice", desc: "LeetCode-style problems with step-by-step solutions" },
  { icon: FileText, title: "CV Optimizer", desc: "AI-powered resume review and optimization tips" },
];

const CareerPage = () => (
  <PageShell
    title="Career Hub"
    subtitle="Interviews & Internships"
    icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"><Briefcase className="w-5 h-5 text-primary-foreground" /></div>}
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
      <p className="text-muted-foreground">🚧 Career Hub coming soon — interview prep, DSA practice, and CV optimization.</p>
    </div>
  </PageShell>
);

export default CareerPage;
