import { GraduationCap, User, Moon, Sun, LogOut, RefreshCw, Settings, Bell, Shield, Share2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface NavbarProps {
  onMenuToggle?: () => void;
  showMenu?: boolean;
}

const Navbar = ({ onMenuToggle, showMenu }: NavbarProps) => {
  const [isDark, setIsDark] = useState(true);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isTeacher } = useRole();
  const { department, clearDepartment } = useDepartment();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Use cached profile query — shared across app
  const { data: avatarUrl = "" } = useQuery({
    queryKey: ["profile-avatar", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("user_id", user!.id).single();
      return data?.avatar_url || "";
    },
  });

  // Use shared notice queries — same cache keys as NoticeBoard
  const { data: allNotices = [] } = useQuery({
    queryKey: ["university-notices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("university_notices" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: readIds = new Set<string>() } = useQuery({
    queryKey: ["notice-reads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: reads } = await supabase
        .from("user_notice_reads" as any)
        .select("notice_id")
        .eq("user_id", user!.id);
      return new Set((reads || []).map((r: any) => r.notice_id));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const unreadNotices = allNotices.filter(
    (n: any) => !readIds.has(n.id) && (!n.expires_at || new Date(n.expires_at) > new Date())
  );
  const unreadCount = unreadNotices.length;

  const handleBellOpen = (open: boolean) => {
    if (open && unreadCount > 0 && user) {
      const toMark = [...unreadNotices];
      // Optimistic update
      queryClient.setQueryData(["notice-reads", user.id], (old: Set<string> | undefined) => {
        const next = new Set(old);
        toMark.forEach((n: any) => next.add(n.id));
        return next;
      });
      const inserts = toMark.map((n: any) => ({ user_id: user.id, notice_id: n.id }));
      if (inserts.length > 0) {
        supabase.from("user_notice_reads").insert(inserts as any);
      }
    }
  };

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          {onMenuToggle && (
            <Button variant="ghost" size="icon" className="rounded-xl md:hidden" onClick={onMenuToggle}>
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-display font-bold text-foreground">
                UniGenius <span className="gradient-text">AI</span>
              </span>
              {department && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  — {departmentInfo[department].name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isTeacher && !isAdmin && (
            <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1.5 hidden sm:flex text-primary" onClick={() => navigate("/teacher-dashboard")}>
              <GraduationCap className="w-3 h-3" /> Teacher Panel
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1.5 hidden sm:flex text-primary" onClick={() => navigate("/admin")}>
              <Shield className="w-3 h-3" /> Admin
            </Button>
          )}
          {department && (
            <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1.5 hidden sm:flex" onClick={clearDepartment}>
              <RefreshCw className="w-3 h-3" /> Change Dept
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className={`rounded-xl ${showMenu ? "hidden sm:flex" : ""}`}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {user && (
            <Popover onOpenChange={handleBellOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 rounded-xl" align="end">
                <div className="p-3 border-b border-border">
                  <p className="font-display font-semibold text-sm">Notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {unreadNotices.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">All caught up! 🎉</p>
                  ) : (
                    unreadNotices.slice(0, 5).map((n: any) => (
                      <div key={n.id} className="p-3 border-b border-border/30 hover:bg-muted/50 transition-colors">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {user ? (
            <div className="flex items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-xl ${showMenu ? "hidden sm:flex" : ""}`}
                      onClick={() => {
                        const msg = `Check out UniGenius AI – The ultimate assistant for Software Engineering students. Fix C++ code, generate lab manuals, track attendance, and more. Join here: ${window.location.origin} — Built by Uzair Ahmad`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Invite Friends</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="icon" className={`rounded-xl ${showMenu ? "hidden sm:flex" : ""}`} onClick={() => navigate("/profile")}>
                <Settings className="w-4 h-4" />
              </Button>
              <Avatar className={`w-8 h-8 cursor-pointer border border-primary/20 ${showMenu ? "hidden sm:flex" : ""}`} onClick={() => navigate("/profile")}>
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" className={`rounded-xl ${showMenu ? "hidden sm:flex" : ""}`} onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => navigate("/auth")}>
              <User className="w-4 h-4 mr-1" /> Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
