import { Linkedin, Github, MessageCircle, Share2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";

const SHARE_MESSAGE = `Check out UniGenius AI – The ultimate assistant for Software Engineering students. Fix C++ code, generate lab manuals, track attendance, and more. Join here: ${window.location.origin} — Built by Uzair Ahmad`;

const Footer = () => {
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  const handleShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    toast.success("Share link opened!");
  };

  const footerLinks = [
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ];

  return (
    <footer className={`border-t border-border/50 py-6 text-center px-4 ${isDashboard ? "pb-32 md:pb-6" : "pb-20 md:pb-6"}`}>
      <div className="flex flex-col items-center gap-3">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {footerLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-0">
          <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
            Built with <Heart className="w-3 h-3 fill-destructive text-destructive" /> for students by{" "}
            <span className="font-semibold text-foreground">Uzair Ahmad</span>
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">Helping students study smarter with AI.</p>

        {isDashboard && (
          <div className="flex items-center gap-3">
            <a
              href="https://www.linkedin.com/in/uzair-ahmad-tunio/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors hover:drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/uzairahmadtunio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors hover:drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://wa.me/923064379361?text=Hi%20Uzair,%20I%20need%20help%20with%20UniGenius%20AI."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#25D366] hover:text-[#25D366]/80 transition-colors hover:drop-shadow-[0_0_6px_rgba(37,211,102,0.5)]"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-[10px] font-medium">Support</span>
            </a>
            <Button
              size="sm"
              onClick={handleShare}
              className="h-7 px-3 text-[10px] font-semibold rounded-full gradient-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] transition-shadow"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Invite Friends
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">© 2026 UniGenius AI · All Rights Reserved</p>
      </div>
    </footer>
  );
};

export default Footer;
