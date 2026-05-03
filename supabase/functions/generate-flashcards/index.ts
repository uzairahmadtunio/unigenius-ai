import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { subject, content, count } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemText = `You are a flashcard generator for university students. Generate exactly ${count || 10} flashcards for the subject "${subject}".
${content ? `Use the following uploaded material as the PRIMARY source:\n${content}\n\nExtract key definitions, formulas, concepts, and important points from this material.` : `Generate flashcards covering the most important concepts, definitions, and formulas for "${subject}".`}`;

    const toolDecl = {
      function_declarations: [{
        name: "suggest_flashcards",
        description: "Return flashcards with front (question) and back (answer)",
        parameters: {
          type: "OBJECT",
          properties: {
            cards: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  front: { type: "STRING" },
                  back: { type: "STRING" },
                },
                required: ["front", "back"],
              },
            },
          },
          required: ["cards"],
        },
      }],
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: content ? `Generate flashcards from this material for ${subject}` : `Generate flashcards for ${subject}` }] }],
        tools: [toolDecl],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["suggest_flashcards"] } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service error");
    }

    const data = await response.json();
    const fc = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
    if (fc) {
      return new Response(JSON.stringify(fc.functionCall.args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ cards: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("flashcard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
