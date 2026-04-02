import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "moderator" | "user";

export const useRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setRoles((data || []).map((r: any) => r.role as AppRole));
        setLoading(false);
      });
  }, [user]);

  return {
    roles,
    loading,
    isAdmin: roles.includes("admin"),
    isTeacher: roles.includes("teacher"),
    hasRole: (role: AppRole) => roles.includes(role),
  };
};
