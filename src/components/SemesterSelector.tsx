import { motion } from "framer-motion";

interface SemesterSelectorProps {
  selected: number;
  onSelect: (sem: number) => void;
}

const SemesterSelector = ({ selected, onSelect }: SemesterSelectorProps) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
      {Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => (
        <motion.button
          key={sem}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(sem)}
          className={`relative rounded-xl py-3 px-2 font-display font-semibold text-sm transition-all duration-200 ${
            selected === sem
              ? "gradient-primary text-primary-foreground shadow-elevated"
              : "glass text-foreground hover:shadow-card"
          }`}
        >
          <span className="block text-xs opacity-70">Sem</span>
          <span className="text-lg">{sem}</span>
          {selected === sem && (
            <motion.div
              layoutId="semester-indicator"
              className="absolute inset-0 rounded-xl gradient-primary -z-10"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default SemesterSelector;
