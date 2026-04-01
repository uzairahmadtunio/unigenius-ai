import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

// Route hierarchy map for smart breadcrumb navigation
const routeLabels: Record<string, string> = {
  "/": "Home",
  "/ai-tutor": "AI Tutor",
  "/practice": "Practice",
  "/code-lab": "Code Lab",
  "/docs-gen": "Docs Generator",
  "/exam-prep": "Exam Prep",
  "/viva-prep": "Viva Prep",
  "/past-papers": "Past Papers",
  "/flashcards": "Flashcards",
  "/career": "Career",
  "/profile": "Profile",
  "/attendance": "Attendance",
  "/leaderboard": "Leaderboard",
  "/groups": "Groups",
  "/premium": "Premium",
  "/planner": "Planner",
  "/notes": "Notes",
  "/presentations": "Slides",
  "/admin": "Admin",
};

function getBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: "Home", path: "/" }];
  
  // Split path and build hierarchy
  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";
  
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = routeLabels[currentPath];
    if (label && currentPath !== "/") {
      crumbs.push({ label, path: currentPath });
    } else if (!label && currentPath !== "/") {
      // Dynamic segment (e.g., /groups/:id or /subject/:id)
      const parentPath = "/" + segments[0];
      if (!crumbs.find(c => c.path === parentPath) && routeLabels[parentPath]) {
        crumbs.push({ label: routeLabels[parentPath], path: parentPath });
      }
      crumbs.push({ label: segment.length > 12 ? segment.slice(0, 12) + "…" : segment, path: currentPath });
    }
  }
  
  return crumbs;
}

const PageShell = ({ title, subtitle, icon, children }: PageShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const parentPath = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].path : "/";

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-10 py-4 md:py-6 space-y-4 md:space-y-6 pb-32 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {/* Breadcrumb trail */}
          {breadcrumbs.length > 1 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto scrollbar-hide">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  ) : (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {i === 0 && <Home className="w-3 h-3" />}
                      {crumb.label}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Title row with smart back button */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(parentPath)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h1 className="font-display font-bold text-xl text-foreground">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {children}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default PageShell;
