import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SemesterSelector from "@/components/SemesterSelector";
import SubjectGrid from "@/components/SubjectGrid";
import QuickActions from "@/components/QuickActions";
import DepartmentSelector from "@/components/DepartmentSelector";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [semester, setSemester] = useState(1);
  const { department } = useDepartment();

  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!department) {
    return <DepartmentSelector />;
  }

  const deptInfo = departmentInfo[department];

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI-Powered Study Assistant — {deptInfo.name}
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Learn Smarter. <span className="gradient-text">Score Higher.</span> Grow Faster.
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Your intelligent companion for {deptInfo.fullName} — from assignments to career prep.
          </p>
        </motion.section>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <QuickActions />
        </motion.section>

        {/* Semester Selector */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="font-display font-bold text-lg text-foreground">Select Semester</h2>
          <SemesterSelector selected={semester} onSelect={setSemester} />
        </motion.section>

        {/* Subject Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="font-display font-bold text-lg text-foreground">
            Semester {semester} Subjects
          </h2>
          <SubjectGrid semester={semester} />
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
