import { Linkedin, Github, MessageCircle, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Footer = () => {
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  // Minimal footer on all non-home pages
  if (!isDashboard) {
    return (
      <footer className="border-t border-border/40 mt-auto pb-20 md:pb-0">
        <div className="container mx-auto px-4 md:px-6 py-5">
          <p className="text-[11px] text-center text-muted-foreground/60 tracking-wide">
            © 2026 UniGenius AI. All rights reserved. Designed &amp; Developed by{" "}
            <span className="text-muted-foreground/80 font-medium">Uzair Ahmad</span>.
          </p>
        </div>
      </footer>
    );
  }

  const productLinks = [
    { label: "AI Tutor", to: "/ai-tutor" },
    { label: "Code Lab", to: "/code-lab" },
    { label: "Practice", to: "/practice" },
    { label: "Slides", to: "/presentations" },
  ];

  const companyLinks = [
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Premium", to: "/premium" },
  ];

  const legalLinks = [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ];

  return (
    <footer className="border-t border-border/40 mt-auto pb-28 md:pb-0">
      <div className="container mx-auto px-4 md:px-6 lg:px-10 py-8 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-card">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm text-foreground tracking-tight">UniGenius AI</span>
            </div>
            <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-[200px]">
              The smart study companion built to help university students learn, practice, and grow.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-xs text-muted-foreground/80 hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-xs text-muted-foreground/80 hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-xs text-muted-foreground/80 hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://www.linkedin.com/in/uzair-ahmad-tunio/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://github.com/uzairahmadtunio"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://wa.me/923064379361?text=Hi%20Uzair,%20I%20need%20help%20with%20UniGenius%20AI."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Support"
                className="text-muted-foreground/60 hover:text-[#25D366] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground/60 tracking-wide">
            © 2026 UniGenius AI. Designed &amp; Developed by{" "}
            <span className="text-muted-foreground/80 font-medium">Uzair Ahmad</span>.
          </p>
          <p className="text-[11px] text-muted-foreground/50">All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
