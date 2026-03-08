import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

const PageShell = ({ title, subtitle, icon, children }: PageShellProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-10 py-4 md:py-6 space-y-4 md:space-y-6 pb-32 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
