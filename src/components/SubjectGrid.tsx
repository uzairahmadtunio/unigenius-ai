import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getSubjects } from "@/data/subjects";
import { useDepartment } from "@/contexts/DepartmentContext";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

interface SubjectGridProps {
  semester: number;
}

const SubjectGrid = ({ semester }: SubjectGridProps) => {
  const { department } = useDepartment();
  const subjects = department ? getSubjects(department, semester) : [];
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${department}-${semester}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {subjects.map((subject, idx) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -4 }}
            onClick={() => navigate(`/subject/${subject.id}`)}
            className="glass rounded-2xl p-5 cursor-pointer transition-shadow hover:shadow-elevated group"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{subject.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                  {subject.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  {subject.hasLab && (
                    <Badge variant="secondary" className="text-xs rounded-lg">
                      Lab
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Study
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default SubjectGrid;
