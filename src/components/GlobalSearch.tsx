import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getSubjects } from "@/data/subjects";

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { department } = useDepartment();

  // Gather all subjects across semesters
  const allSubjects = department
    ? Array.from({ length: 8 }, (_, i) => getSubjects(department, i + 1).map(s => ({ ...s, semester: i + 1 }))).flat()
    : [];

  const filtered = query.trim()
    ? allSubjects.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full max-w-md"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search subjects...</span>
        <kbd className="hidden sm:inline text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
            onClick={() => setOpen(false)}
          >
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-2xl w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search subjects or topics..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button onClick={() => setOpen(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {filtered.length > 0 && (
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {filtered.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => { navigate(`/subject/${sub.id}`); setOpen(false); setQuery(""); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-lg">{sub.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">Semester {sub.semester}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {query.trim() && filtered.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No results found</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalSearch;
