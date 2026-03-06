import { motion } from "framer-motion";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Department, departmentInfo, useDepartment } from "@/contexts/DepartmentContext";

const departments: Department[] = ["se", "cs", "ai"];

const DepartmentSelector = () => {
  const { setDepartment } = useDepartment();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gradient-hero">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsla(230, 80%, 60%, 0.4), transparent)", top: "-10%", left: "-5%" }}
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsla(280, 60%, 60%, 0.4), transparent)", bottom: "-5%", right: "-5%" }}
          animate={{ scale: [1, 1.3, 1], y: [0, -30, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 relative z-10"
      >
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5">
          <GraduationCap className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
          Choose Your <span className="gradient-text">Department</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Select your program to get personalized subjects, AI tutoring, and study resources tailored to your curriculum.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 max-w-3xl w-full relative z-10">
        {departments.map((dept, idx) => {
          const info = departmentInfo[dept];
          return (
            <motion.button
              key={dept}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setDepartment(dept)}
              className="glass rounded-2xl p-6 text-left group transition-all hover:shadow-elevated"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-4`}>
                <span className="text-2xl">{info.icon}</span>
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{info.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{info.fullName}</p>
              <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                Select <ArrowRight className="w-3 h-3" />
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xs text-muted-foreground mt-8 relative z-10"
      >
        You can change this anytime from your profile settings.
      </motion.p>
    </div>
  );
};

export default DepartmentSelector;
