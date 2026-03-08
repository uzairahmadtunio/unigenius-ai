import { ClipboardList, FileQuestion, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { motion } from "framer-motion";

const features = [
  { icon: ClipboardList, title: "Past Papers", desc: "Practice with previous years' midterm and final papers", path: "/past-papers", emoji: "📄", gradient: "from-blue-500 to-cyan-500" },
  { icon: FileQuestion, title: "Viva Prep", desc: "AI-simulated viva sessions for every subject", path: "/viva-prep", emoji: "🎤", gradient: "from-amber-500 to-orange-500" },
  { icon: BookOpen, title: "Quick Revision", desc: "AI flashcards from your notes and lab manuals", path: "/flashcards", emoji: "🃏", gradient: "from-emerald-500 to-teal-500" },
];

const ExamPrepPage = () => {
  const navigate = useNavigate();

  return (
    <PageShell
      title="Exam Prep"
      subtitle="Midterms & Finals"
      icon={<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-primary-foreground" /></div>}
    >
      <div className="grid sm:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(f.path)}
            className="glass rounded-2xl p-6 space-y-4 cursor-pointer hover:border-primary/30 border border-transparent transition-all hover:shadow-lg group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-2xl`}>
              {f.emoji}
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
            <div className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Open →
            </div>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
};

export default ExamPrepPage;
