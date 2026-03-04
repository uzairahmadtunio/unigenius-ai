import { GraduationCap, User, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isDark, setIsDark] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-foreground">
            UniGenius <span className="gradient-text">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
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
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user.email?.charAt(0).toUpperCase()}
              </div>
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
