import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ProPaywall = ({ feature = "this feature" }: { feature?: string }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-background/60 rounded-2xl"
    >
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="font-display font-bold text-xl text-foreground">
          Pro Feature Locked
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Upgrade to Pro to unlock {feature}.
        </p>
        <Button
          onClick={() => navigate("/premium")}
          className="rounded-xl gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 animate-pulse hover:animate-none"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade Now — ₹300/mo
        </Button>
      </div>
    </motion.div>
  );
};

export default ProPaywall;
