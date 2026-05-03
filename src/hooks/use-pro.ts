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
      .select("is_pro, streak_pro_until")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const row = data as any;
        const streakActive = !!row?.streak_pro_until && new Date(row.streak_pro_until) > new Date();
        setIsPro(!!row?.is_pro || streakActive);
        setLoading(false);
      });
  }, [user]);

  return { isPro, loading };
};
