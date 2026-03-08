import { Linkedin, Github } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 py-6 pb-28 md:pb-6 text-center px-4">
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-0">
        <span className="text-xs md:text-sm text-muted-foreground">© 2026 UniGenius AI</span>
        <span className="hidden sm:inline text-muted-foreground mx-2">|</span>
        <span className="text-xs md:text-sm text-muted-foreground">
          Built by <span className="font-semibold text-foreground">Uzair Ahmad</span>
        </span>
        <span className="hidden sm:inline text-muted-foreground mx-2">|</span>
        <div className="flex items-center gap-3 mt-1 sm:mt-0">
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
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">All Rights Reserved</p>
    </div>
  </footer>
);

export default Footer;
