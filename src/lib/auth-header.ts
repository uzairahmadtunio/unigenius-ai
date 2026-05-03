import { supabase } from "@/integrations/supabase/client";

/**
 * Returns an Authorization header using the current user's JWT, falling back to
 * the publishable anon key. Edge functions that call requireAuth() need the user JWT.
 */
export async function authHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
}
