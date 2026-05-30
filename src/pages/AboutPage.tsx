import { motion } from "framer-motion";
import { Sparkles, Target, Eye, Trophy, Linkedin, Github, Heart } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import founderImg from "@/assets/founder-uzair.png";

const highlights = [
  "AI Study Chat",
  "Quiz Generator",
  "Viva Simulation",
  "Code Lab",
  "Smart GPA Calculator",
  "Attendance Tracker",
  "Teacher Panel",
  "Study Planner",
  "Career Hub",
];

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay, duration: 0.5 },
});

const AboutPage = () => {
  return (
    <PageShell title="About UniGenius AI" subtitle="Empowering students through AI" icon={<Sparkles className="w-5 h-5 text-primary" />}>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Hero */}
        <motion.section {...fade(0)} className="glass rounded-2xl p-8 md:p-12 text-center border border-primary/20">
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Empowering Students Through <span className="gradient-text">AI</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            UniGenius AI is an AI-powered academic platform designed to help university students study smarter,
            prepare better, and improve their academic performance through intelligent tools and personalized learning experiences.
          </p>
        </motion.section>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-4">
          <motion.div {...fade(0.1)}>
            <Card className="glass p-6 h-full border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Our Mission</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To make quality academic assistance accessible to every student through modern AI technology.
              </p>
            </Card>
          </motion.div>
          <motion.div {...fade(0.15)}>
            <Card className="glass p-6 h-full border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-bold">Our Vision</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To become Pakistan's leading AI-powered student platform that helps learners succeed in academics,
                careers, and lifelong learning.
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Founder */}
        <motion.section {...fade(0.2)}>
          <Card className="glass p-6 md:p-10 border-primary/20">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Meet the Founder</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full gradient-primary blur-2xl opacity-40" />
                <img
                  src={founderImg}
                  alt="Uzair Ahmad — Founder of UniGenius AI"
                  className="relative w-40 h-40 md:w-48 md:h-48 rounded-full object-cover border-4 border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-display text-2xl font-bold">Uzair Ahmad</h3>
                <p className="text-sm text-primary font-medium mt-1">Software Engineering Student</p>
                <p className="text-xs text-muted-foreground">University of Larkana</p>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                  UniGenius AI was created by Uzair Ahmad to solve real problems faced by university students
                  including assignments, quizzes, viva preparation, coding practice, attendance tracking, and exam preparation.
                </p>
                <p className="mt-4 font-display italic text-base gradient-text">"From a student, for students."</p>
                <div className="flex items-center justify-center md:justify-start gap-3 mt-5">
                  <a
                    href="https://www.linkedin.com/in/uzair-ahmad-tunio/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-xs hover:bg-primary/10 transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                  </a>
                  <a
                    href="https://github.com/uzairahmadtunio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-xs hover:bg-primary/10 transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" /> GitHub
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Achievements */}
        <motion.section {...fade(0.25)}>
          <Card className="glass p-6 md:p-8 border-primary/10">
            <div className="flex items-center gap-2 mb-5 justify-center">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Platform Highlights</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {highlights.map((h, i) => (
                <motion.div
                  key={h}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i }}
                  className="px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 text-sm font-medium text-center hover:bg-primary/10 transition-colors"
                >
                  {h}
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.section>

        <motion.p {...fade(0.3)} className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          Built with <Heart className="w-3 h-3 fill-destructive text-destructive" /> for students by Uzair Ahmad
        </motion.p>
      </div>
    </PageShell>
  );
};

export default AboutPage;
