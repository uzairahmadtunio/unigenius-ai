import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Bot, GraduationCap, Target, BookOpenCheck, Mic, FileText,
  CalendarDays, TrendingUp, Calendar, Layers, StickyNote, Code2, FileCode2,
  Presentation, Users, Trophy, FolderOpen, HelpCircle, Briefcase, ClipboardCheck,
  Shield, Crown, Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof Bot };
export const NAV_GROUPS: { label: string; items: Item[] }[] = [
  { label: "Learn", items: [
    { to: "/ai-tutor", label: "AI Tutor", icon: Bot },
    { to: "/practice", label: "Practice", icon: Target },
    { to: "/exam-prep", label: "Exam Prep", icon: BookOpenCheck },
    { to: "/viva-prep", label: "Viva Prep", icon: Mic },
    { to: "/past-papers", label: "Past Papers", icon: FileText },
  ]},
  { label: "Study", items: [
    { to: "/planner", label: "Study Planner", icon: CalendarDays },
    { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
    { to: "/progress", label: "Progress", icon: TrendingUp },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/flashcards", label: "Flashcards", icon: Layers },
    { to: "/notes", label: "Notes", icon: StickyNote },
  ]},
  { label: "Tools", items: [
    { to: "/code-lab", label: "Code Lab", icon: Code2 },
    { to: "/docs-gen", label: "Assignments & Labs", icon: FileCode2 },
    { to: "/presentations", label: "Presentations", icon: Presentation },
  ]},
  { label: "Community", items: [
    { to: "/study-materials", label: "Study Materials", icon: FolderOpen },
    { to: "/question-bank", label: "Question Bank", icon: HelpCircle },
    { to: "/groups", label: "Groups", icon: Users },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ]},
  { label: "Career", items: [{ to: "/career", label: "Career Hub", icon: Briefcase }] },
];

const HIDDEN_PREFIXES = ["/auth", "/forgot-password", "/reset-password", "/ai-tutor", "/chat", "/code-lab", "/admin", "/.lovable", "/u/"];

export const useSidebarVisible = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return !!user && !HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
};

export const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { isAdmin } = useAdmin();
  const { isTeacher } = useRole();
  const link = (it: Item) => (
    <NavLink
      key={it.to}
      to={it.to}
      end={it.to === "/"}
      onClick={onNavigate}
      className={({ isActive }) => cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] font-medium transition-colors focus-ring",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      {({ isActive }) => (<>
        <it.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden />
        <span className="truncate">{it.label}</span>
      </>)}
    </NavLink>
  );
  return (
    <nav aria-label="Main" className="space-y-5">
      <div className="space-y-0.5">
        {link({ to: "/", label: "Dashboard", icon: LayoutDashboard })}
        {isTeacher && !isAdmin && link({ to: "/teacher-dashboard", label: "Teacher Panel", icon: GraduationCap })}
        {isAdmin && link({ to: "/admin", label: "Admin", icon: Shield })}
      </div>
      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{g.label}</p>
          <div className="space-y-0.5">{g.items.map(link)}</div>
        </div>
      ))}
      <div className="space-y-0.5 pt-1 border-t border-sidebar-border">
        <div className="pt-3" />
        {link({ to: "/premium", label: "Pro Plan", icon: Crown })}
        {link({ to: "/profile", label: "Settings", icon: Settings })}
      </div>
    </nav>
  );
};

const AppSidebar = () => {
  if (!useSidebarVisible()) return null;
  return (
    <aside className="hidden lg:flex fixed left-0 bottom-0 top-16 z-30 w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavItems />
      </div>
    </aside>
  );
};

export default AppSidebar;
