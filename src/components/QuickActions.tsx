import { motion } from "framer-motion";
import { MessageSquare, Brain, Code, FileText, Briefcase, ClipboardList, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { icon: MessageSquare, label: "AI Tutor", desc: "Chat with your SE Professor", path: "/ai-tutor", color: "from-blue-500 to-indigo-500" },
  { icon: Brain, label: "Practice", desc: "Quizzes & Mock Tests", path: "/practice", color: "from-violet-500 to-purple-500" },
  { icon: Code, label: "Code Lab", desc: "Debug & Optimize Code", path: "/code-lab", color: "from-emerald-500 to-teal-500" },
  { icon: FileText, label: "Docs Gen", desc: "Lab Manuals & Notes", path: "/docs-gen", color: "from-amber-500 to-orange-500" },
  { icon: CalendarCheck, label: "Attendance", desc: "Track & Monitor", path: "/attendance", color: "from-cyan-500 to-blue-500" },
  { icon: ClipboardList, label: "Exam Prep", desc: "Midterms & Finals", path: "/exam-prep", color: "from-rose-500 to-pink-500" },
  { icon: Briefcase, label: "Career", desc: "Interviews & Internships", path: "/career", color: "from-sky-500 to-indigo-500" },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((action, idx) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06 }}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(action.path)}
          className="glass rounded-2xl p-4 text-center group transition-shadow hover:shadow-elevated"
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mx-auto mb-2`}>
            <action.icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="font-display font-semibold text-sm text-foreground">{action.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
        </motion.button>
      ))}
    </div>
  );
};

export default QuickActions;
