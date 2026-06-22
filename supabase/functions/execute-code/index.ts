import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { enforceBodySize, clampString } from "../_shared/limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Wandbox: free public sandboxed code execution API (no auth, no whitelist).
// Docs: https://github.com/melpon/wandbox/blob/master/kennel/API.rst
const WANDBOX_URL = "https://wandbox.org/api/compile.json";

// Map our language tag → Wandbox compiler.
const LANG_MAP: Record<string, { compiler: string; label: string }> = {
  cpp: { compiler: "gcc-13.2.0", label: "C++ (gcc 13.2.0)" },
  python: { compiler: "cpython-3.12.7", label: "Python 3.12.7" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const tooBig = enforceBodySize(req, corsHeaders, 200_000);
  if (tooBig) return tooBig;

  try {
    const body = await req.json();
    const language = clampString(body.language, 16);
    const code = clampString(body.code, 50_000);
    const stdin = clampString(body.stdin, 20_000);

    const target = LANG_MAP[language];
    if (!target) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${language}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!code.trim()) {
      return new Response(
        JSON.stringify({ error: "Code is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const startedAt = Date.now();

    const resp = await fetch(WANDBOX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "UniGeniusAI/1.0 (+https://unigenius.lovable.app)",
      },
      body: JSON.stringify({
        code,
        compiler: target.compiler,
        stdin,
        save: false,
      }),
    });

    const elapsedMs = Date.now() - startedAt;

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Wandbox error", resp.status, text);
      return new Response(
        JSON.stringify({ error: `Execution service error (${resp.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    // data: { status, signal, compiler_output, compiler_error, program_output, program_error }

    const exitCode = Number.isFinite(Number(data.status)) ? Number(data.status) : null;

    return new Response(
      JSON.stringify({
        language,
        version: target.label,
        compile: (data.compiler_error || data.compiler_output)
          ? {
              stdout: data.compiler_output || "",
              stderr: data.compiler_error || "",
              code: data.compiler_error ? 1 : 0,
            }
          : null,
        run: {
          stdout: data.program_output || "",
          stderr: data.program_error || "",
          code: exitCode,
          signal: data.signal || null,
        },
        executionTimeMs: elapsedMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("execute-code error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
