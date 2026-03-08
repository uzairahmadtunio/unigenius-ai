import { motion } from "framer-motion";
import { Brain } from "lucide-react";

interface ThinkingAnimationProps {
  message?: string;
}

const ThinkingAnimation = ({ message = "UniGenius is thinking..." }: ThinkingAnimationProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-4 py-12"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
        >
          <Brain className="w-8 h-8 text-primary" />
        </motion.div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary"
            animate={{
              x: [0, 20, 0, -20, 0],
              y: [-20, 0, 20, 0, -20],
              opacity: [0.3, 1, 0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
            style={{ top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}
          />
        ))}
      </div>
      <div className="text-center space-y-1">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-sm font-display font-semibold text-foreground"
        >
          {message}
        </motion.p>
        <p className="text-[10px] text-muted-foreground">Yeh thoda waqt le sakta hai ✨</p>
      </div>
    </motion.div>
  );
};

export default ThinkingAnimation;
