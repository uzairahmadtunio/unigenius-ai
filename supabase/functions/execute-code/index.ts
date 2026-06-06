import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { enforceBodySize, clampString } from "../_shared/limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Piston: free public sandboxed code execution API.
// Docs: https://github.com/engineer-man/piston
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// Map our language tag → Piston language + a known-good runtime version.
const LANG_MAP: Record<string, { language: string; version: string; filename: string }> = {
  cpp: { language: "c++", version: "10.2.0", filename: "main.cpp" },
  python: { language: "python", version: "3.10.0", filename: "main.py" },
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

    const pistonResp = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: target.language,
        version: target.version,
        files: [{ name: target.filename, content: code }],
        stdin,
        compile_timeout: 10_000,
        run_timeout: 5_000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    const elapsedMs = Date.now() - startedAt;

    if (!pistonResp.ok) {
      const text = await pistonResp.text().catch(() => "");
      console.error("Piston error", pistonResp.status, text);
      return new Response(
        JSON.stringify({ error: `Execution service error (${pistonResp.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await pistonResp.json();
    // data: { language, version, run: {stdout, stderr, code, signal, output}, compile?: {...} }

    return new Response(
      JSON.stringify({
        language: data.language,
        version: data.version,
        compile: data.compile
          ? {
              stdout: data.compile.stdout || "",
              stderr: data.compile.stderr || "",
              code: data.compile.code,
            }
          : null,
        run: {
          stdout: data.run?.stdout || "",
          stderr: data.run?.stderr || "",
          code: data.run?.code,
          signal: data.run?.signal || null,
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
