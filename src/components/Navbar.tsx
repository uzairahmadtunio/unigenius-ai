import { GraduationCap, User, Moon, Sun, LogOut, RefreshCw, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment, departmentInfo } from "@/contexts/DepartmentContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isDark, setIsDark] = useState(true);
  const { user, signOut } = useAuth();
  const { department, clearDepartment } = useDepartment();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    });

    // Fetch notices and read state
    const fetchNotices = async () => {
      const { data: allNotices } = await supabase
        .from("university_notices" as any)
        .select("*")
        .order("created_at", { ascending: false });

      const { data: reads } = await supabase
        .from("user_notice_reads" as any)
        .select("notice_id")
        .eq("user_id", user.id);

      const readSet = new Set((reads || []).map((r: any) => r.notice_id));
      const active = (allNotices || []).filter(
        (n: any) => !readSet.has(n.id) && (!n.expires_at || new Date(n.expires_at) > new Date())
      );
      setNotices(active.slice(0, 5));
      setUnreadCount(active.length);
    };
    fetchNotices();
  }, [user]);

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
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

        <div className="flex items-center gap-2">
          {department && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs gap-1.5 hidden sm:flex"
              onClick={clearDepartment}
            >
              <RefreshCw className="w-3 h-3" />
              Change Dept
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="rounded-xl"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          {user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => navigate("/profile")}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Avatar
                className="w-8 h-8 cursor-pointer border border-primary/20"
                onClick={() => navigate("/profile")}
              >
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={signOut}>
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
