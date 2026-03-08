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
import NotFound from "./pages/NotFound";
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
            <BrowserRouter>
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
                <Route path="/auth" element={<AuthPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DarkModeInit>
        </DepartmentProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
