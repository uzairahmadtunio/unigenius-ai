import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Department = "se" | "cs" | "ai";

export const departmentInfo: Record<Department, { name: string; fullName: string; icon: string; color: string }> = {
  se: { name: "Software Engineering", fullName: "BS Software Engineering", icon: "⚙️", color: "from-blue-500 to-indigo-600" },
  cs: { name: "Computer Science", fullName: "BS Computer Science", icon: "💻", color: "from-emerald-500 to-teal-600" },
  ai: { name: "Artificial Intelligence", fullName: "BS Artificial Intelligence", icon: "🤖", color: "from-violet-500 to-purple-600" },
};

interface DepartmentContextType {
  department: Department | null;
  setDepartment: (dept: Department) => void;
  clearDepartment: () => void;
}

const DepartmentContext = createContext<DepartmentContextType>({
  department: null,
  setDepartment: () => {},
  clearDepartment: () => {},
});

export const useDepartment = () => useContext(DepartmentContext);

const STORAGE_KEY = "unigenius-department";

export const DepartmentProvider = ({ children }: { children: ReactNode }) => {
  const [department, setDepartmentState] = useState<Department | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Department) || null;
  });

  const setDepartment = useCallback((dept: Department) => {
    localStorage.setItem(STORAGE_KEY, dept);
    setDepartmentState(dept);
  }, []);

  const clearDepartment = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDepartmentState(null);
  }, []);

  return (
    <DepartmentContext.Provider value={{ department, setDepartment, clearDepartment }}>
      {children}
    </DepartmentContext.Provider>
  );
};
