// Shared payload size guard for AI edge functions.
// Returns a 413 Response when the request body exceeds maxBytes, else null.
export function enforceBodySize(
  req: Request,
  corsHeaders: Record<string, string>,
  maxBytes = 2_000_000, // 2 MB default
): Response | null {
  const len = Number(req.headers.get("content-length") || 0);
  if (len && len > maxBytes) {
    return new Response(
      JSON.stringify({ error: "Payload too large" }),
      {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  return null;
}

export function clampString(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.length > max ? s.slice(0, max) : s;
}

export function clampArray<T>(a: unknown, max: number): T[] {
  if (!Array.isArray(a)) return [];
  return a.length > max ? (a.slice(-max) as T[]) : (a as T[]);
}
