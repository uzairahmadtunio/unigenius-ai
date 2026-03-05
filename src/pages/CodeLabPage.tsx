import { Code, Bug, Zap } from "lucide-react";
import PageShell from "@/components/PageShell";

const features = [
  { icon: Code, title: "Code Review", desc: "Paste code and get AI-powered review and suggestions" },
  { icon: Bug, title: "Debug Helper", desc: "Find and fix bugs with step-by-step explanations" },
  { icon: Zap, title: "Optimize", desc: "Get performance improvements and clean code tips" },
];

const CodeLabPage = () => (
  <PageShell
    title="Code Lab"
    subtitle="Debug & Optimize Code"
    icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Code className="w-5 h-5 text-primary-foreground" /></div>}
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
      <p className="text-muted-foreground">🚧 Code Lab launching soon — paste your C++, Python, or JS code for instant AI analysis.</p>
    </div>
  </PageShell>
);

export default CodeLabPage;
