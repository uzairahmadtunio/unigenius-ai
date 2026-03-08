import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SemesterSelector from "@/components/SemesterSelector";
import { InviteButton } from "@/components/InviteModal";
import SubjectGrid from "@/components/SubjectGrid";
import QuickActions from "@/components/QuickActions";
import DepartmentSelector from "@/components/DepartmentSelector";
import GlobalSearch from "@/components/GlobalSearch";
import AttendanceAlert from "@/components/AttendanceAlert";
import CareerReadinessWidget from "@/components/CareerReadinessWidget";
import NoticeBoard from "@/components/NoticeBoard";
import ExamCountdown from "@/components/ExamCountdown";
import VivaReminder from "@/components/VivaReminder";
import DailyStreakWidget from "@/components/DailyStreakWidget";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";

const SPLASH_KEY = "unigenius-splash-shown";
const SEMESTER_KEY = "unigenius-semester";

const Index = () => {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem(SPLASH_KEY);
  });
  const [semester, setSemester] = useState(() => {
    const stored = localStorage.getItem(SEMESTER_KEY);
    return stored ? parseInt(stored, 10) : 1;
  });
  const { department } = useDepartment();

  const handleSemesterChange = useCallback((sem: number) => {
    localStorage.setItem(SEMESTER_KEY, String(sem));
    setSemester(sem);
  }, []);

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, "true");
    setShowSplash(false);
  }, []);

  if (showSplash) return <SplashScreen onComplete={handleSplashComplete} />;
  if (!department) return <DepartmentSelector />;

  const deptInfo = departmentInfo[department];

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <AttendanceAlert />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-10 py-6 md:py-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
        {/* Hero */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
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
          <div className="pt-1">
            <InviteButton variant="outline" />
          </div>
        </motion.section>

        {/* Daily Streak */}
        <DailyStreakWidget />

        {/* Global Search */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex justify-center">
          <GlobalSearch />
        </motion.section>

        {/* Viva Reminder */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <VivaReminder semester={semester} />
        </motion.section>

        {/* Notice Board */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <NoticeBoard />
        </motion.section>

        {/* Exam Countdown + Career Readiness */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExamCountdown semester={semester} />
          <CareerReadinessWidget />
        </motion.section>

        {/* Quick Actions */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <QuickActions />
        </motion.section>

        {/* Semester Selector */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <h2 className="font-display font-bold text-lg text-foreground">Select Semester</h2>
          <SemesterSelector selected={semester} onSelect={handleSemesterChange} />
        </motion.section>

        {/* Subject Grid */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
          <h2 className="font-display font-bold text-lg text-foreground">Semester {semester} Subjects</h2>
          <SubjectGrid semester={semester} />
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
