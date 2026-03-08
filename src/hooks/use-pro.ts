import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const usePro = () => {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    supabase
      .from("profiles")
      .select("is_pro")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setIsPro(!!(data as any)?.is_pro);
        setLoading(false);
      });
  }, [user]);

  return { isPro, loading };
};
