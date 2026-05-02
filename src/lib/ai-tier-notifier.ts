import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "ai-last-tier";

/**
 * Inspect the response headers from an AI edge function.
 * - If a tier switch is detected and the user is admin, show a small toast.
 * - Always remember the last tier so we don't spam toasts on repeats.
 */
export function notifyAiTier(resp: Response, isAdmin: boolean) {
  try {
    const tier = resp.headers.get("x-ai-tier");
    const keyIndex = resp.headers.get("x-ai-key-index");
    if (!tier) return;

    const last = sessionStorage.getItem(STORAGE_KEY);
    const current = `${tier}:${keyIndex ?? "-1"}`;
    sessionStorage.setItem(STORAGE_KEY, current);

    if (!isAdmin) return;
    if (last === current) return;

    if (tier === "lovable") return; // primary, don't notify
    if (tier === "gemini") {
      toast({
        title: `Switched to Backup Key #${Number(keyIndex) + 1}`,
        description: "Direct Gemini key rotation engaged.",
      });
    } else if (tier === "groq") {
      toast({
        title: "Switched to Groq Backup",
        description: "All Gemini keys rate-limited — using Llama-3.3-70b.",
        variant: "destructive",
      });
    }
  } catch {
    /* no-op */
  }
}
