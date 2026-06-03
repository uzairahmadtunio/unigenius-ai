import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  // Sync from profile on auth load, and persist any local choice back to profile.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("department")
        .eq("user_id", user.id)
        .maybeSingle();
      const remote = (data as any)?.department as Department | null;
      if (remote && remote !== department) {
        localStorage.setItem(STORAGE_KEY, remote);
        setDepartmentState(remote);
      } else if (!remote && department) {
        await supabase.from("profiles").update({ department } as any).eq("user_id", user.id);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDepartment = useCallback((dept: Department) => {
    localStorage.setItem(STORAGE_KEY, dept);
    setDepartmentState(dept);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ department: dept } as any).eq("user_id", user.id);
      }
    })();
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
