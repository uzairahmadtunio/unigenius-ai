import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { GraduationCap, Code2, BookOpen, Award, Briefcase, FlaskConical } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const subtitles = [
  "The Future of University Learning",
  "Your Lab Manual Companion",
  "Bunk Smarter, Not Harder",
  "Build Your Portfolio",
];

const floatingIcons = [
  { Icon: BookOpen, x: "12%", y: "18%", size: 28, delay: 0 },
  { Icon: Code2, x: "78%", y: "22%", size: 32, delay: 0.5 },
  { Icon: Award, x: "85%", y: "65%", size: 26, delay: 1 },
  { Icon: Briefcase, x: "8%", y: "72%", size: 30, delay: 1.5 },
  { Icon: FlaskConical, x: "50%", y: "85%", size: 24, delay: 0.8 },
  { Icon: GraduationCap, x: "25%", y: "82%", size: 22, delay: 1.2 },
];

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [stage, setStage] = useState(0);
  const [subtitleIdx, setSubtitleIdx] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 2000),
      setTimeout(() => setStage(3), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Cycle subtitles every 3s after stage 1
  useEffect(() => {
    if (stage < 1) return;
    const interval = setInterval(() => {
      setSubtitleIdx((prev) => (prev + 1) % subtitles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [stage]);

  const handleGetStarted = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Typing animation text
  const headline = "Welcome to UniGenius AI";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          background: "linear-gradient(135deg, hsl(260 60% 12%), hsl(220 70% 14%), hsl(190 60% 16%))",
        }}
      >
        {/* Animated mesh gradient blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-3xl"
            style={{
              background: "radial-gradient(circle, hsl(270 70% 50% / 0.5), transparent 70%)",
              top: "-10%",
              left: "-5%",
            }}
            animate={{
              x: [0, 60, -30, 0],
              y: [0, 40, -20, 0],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full opacity-25 blur-3xl"
            style={{
              background: "radial-gradient(circle, hsl(200 80% 50% / 0.5), transparent 70%)",
              top: "40%",
              right: "-10%",
            }}
            animate={{
              x: [0, -40, 20, 0],
              y: [0, -30, 50, 0],
              scale: [1, 1.1, 1.05, 1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
            style={{
              background: "radial-gradient(circle, hsl(170 60% 45% / 0.4), transparent 70%)",
              bottom: "-5%",
              left: "30%",
            }}
            animate={{
              x: [0, 30, -40, 0],
              y: [0, -20, 30, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Floating transparent 3D icons */}
        {floatingIcons.map(({ Icon, x, y, size, delay }, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0.08, 0.18, 0.08],
              y: [0, -15, 0],
              rotate: [0, 10, -10, 0],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 6,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Icon
              style={{ width: size, height: size }}
              className="text-white/20"
              strokeWidth={1.2}
            />
          </motion.div>
        ))}

        {/* Logo with pulse animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="mb-8 relative"
        >
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(260 60% 60% / 0.4), hsl(200 80% 60% / 0.4))",
              filter: "blur(20px)",
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-white/10"
            style={{
              background: "linear-gradient(135deg, hsl(260 50% 30% / 0.6), hsl(200 60% 25% / 0.6))",
              backdropFilter: "blur(20px)",
            }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <GraduationCap className="w-10 h-10 text-white" />
          </motion.div>
        </motion.div>

        <div className="text-center space-y-5 relative z-10 px-4">
          {/* Typing headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={stage >= 0 ? { opacity: 1, y: 0 } : {}}
            className="text-4xl md:text-6xl font-display font-black text-white tracking-tight"
            style={{
              textShadow: "0 0 40px hsl(260 60% 60% / 0.3), 0 2px 10px hsl(0 0% 0% / 0.3)",
            }}
          >
            {headline.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 * i, duration: 0.05 }}
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>

          {/* Cycling subtitle */}
          <div className="h-8 relative flex items-center justify-center">
            <AnimatePresence mode="wait">
              {stage >= 1 && (
                <motion.p
                  key={subtitleIdx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5 }}
                  className="text-lg md:text-xl text-white/70 font-medium absolute"
                >
                  {subtitles[subtitleIdx]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Get Started CTA */}
          <AnimatePresence>
            {stage >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="pt-4 space-y-3"
              >
                <motion.button
                  onClick={handleGetStarted}
                  className="relative px-10 py-3.5 rounded-2xl font-display font-bold text-white text-base tracking-wide overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, hsl(260 60% 50%), hsl(200 70% 50%))",
                    boxShadow: "0 0 30px hsl(260 60% 50% / 0.4), 0 0 60px hsl(200 70% 50% / 0.2)",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  animate={{
                    boxShadow: [
                      "0 0 20px hsl(260 60% 50% / 0.3), 0 0 40px hsl(200 70% 50% / 0.15)",
                      "0 0 35px hsl(260 60% 50% / 0.5), 0 0 70px hsl(200 70% 50% / 0.25)",
                      "0 0 20px hsl(260 60% 50% / 0.3), 0 0 40px hsl(200 70% 50% / 0.15)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Glowing border overlay */}
                  <span
                    className="absolute inset-0 rounded-2xl opacity-60"
                    style={{
                      border: "1px solid hsl(200 80% 70% / 0.4)",
                    }}
                  />
                  Get Started →
                </motion.button>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-white/40"
                >
                  Join <span className="text-white/60 font-medium">Mudasir</span> and{" "}
                  <span className="text-white/60 font-medium">Wasi</span> who are already saving time!
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Founder credit at bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={stage >= 3 ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3"
        >
          <div className="w-16 h-px bg-white/15" />
          <p className="text-[11px] text-white/30 tracking-widest uppercase font-light">
            Designed & Founded by Uzair Ahmad
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
