import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DepartmentProvider } from "@/contexts/DepartmentContext";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PracticePage from "./pages/PracticePage";
import CodeLabPage from "./pages/CodeLabPage";
import DocsGenPage from "./pages/DocsGenPage";
import ExamPrepPage from "./pages/ExamPrepPage";
import VivaPage from "./pages/VivaPage";
import PastPapersPage from "./pages/PastPapersPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import CareerPage from "./pages/CareerPage";
import SubjectHubPage from "./pages/SubjectHubPage";
import ProfilePage from "./pages/ProfilePage";
import AttendancePage from "./pages/AttendancePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import AdminDashboard from "./pages/AdminDashboard";
import PremiumPage from "./pages/PremiumPage";
import PlannerPage from "./pages/PlannerPage";
import ProgressPage from "./pages/ProgressPage";
import CalendarPage from "./pages/CalendarPage";
import NotesPage from "./pages/NotesPage";
import PresentationPage from "./pages/PresentationPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudyMaterialsPage from "./pages/StudyMaterialsPage";
import QuestionBankPage from "./pages/QuestionBankPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";
import GlobalAlertBanner from "./components/GlobalAlertBanner";
import SupportChatWidget from "./components/SupportChatWidget";
import MobileBottomNav from "./components/MobileBottomNav";
import ScrollToTop from "./components/ScrollToTop";
import { useEffect } from "react";

const queryClient = new QueryClient();

const DarkModeInit = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DepartmentProvider>
          <DarkModeInit>
            <Toaster />
            <Sonner />
            <GlobalAlertBanner />
            <SupportChatWidget />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/ai-tutor" element={<ChatPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/code-lab" element={<CodeLabPage />} />
                <Route path="/docs-gen" element={<DocsGenPage />} />
                <Route path="/exam-prep" element={<ExamPrepPage />} />
                <Route path="/viva-prep" element={<VivaPage />} />
                <Route path="/past-papers" element={<PastPapersPage />} />
                <Route path="/flashcards" element={<FlashcardsPage />} />
                <Route path="/career" element={<CareerPage />} />
                <Route path="/subject/:subjectId" element={<SubjectHubPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/:groupId" element={<GroupDetailPage />} />
                <Route path="/u/:rollNumber" element={<PublicProfilePage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/premium" element={<PremiumPage />} />
                <Route path="/planner" element={<PlannerPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/presentations" element={<PresentationPage />} />
                <Route path="/study-materials" element={<StudyMaterialsPage />} />
                <Route path="/question-bank" element={<QuestionBankPage />} />
                <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <MobileBottomNav />
            </BrowserRouter>
          </DarkModeInit>
        </DepartmentProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
