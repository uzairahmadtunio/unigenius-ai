import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 1600),
      setTimeout(() => setStage(3), 2600),
      setTimeout(() => onComplete(), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gradient-primary"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-96 h-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, hsla(200, 80%, 70%, 0.4), transparent)", top: "10%", left: "10%" }}
            animate={{ scale: [1, 1.3, 1], x: [0, 30, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, hsla(280, 60%, 70%, 0.4), transparent)", bottom: "10%", right: "10%" }}
            animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          />
        </div>

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-8"
        >
          <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
        </motion.div>

        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={stage >= 0 ? { opacity: 1, y: 0 } : {}}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground"
          >
            Welcome to UniGenius AI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={stage >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-lg md:text-xl text-primary-foreground/80"
          >
            The Future of University Learning
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={stage >= 2 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-sm text-primary-foreground/60"
          >
            Designed & Founded by Uzair Ahmad
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={stage >= 3 ? { opacity: 1 } : {}}
            className="pt-6"
          >
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
