import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { generateContentWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-ai-tier, x-ai-key-index",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { subject, content, count } = await req.json();

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

    const result = await generateContentWithFailover({
      modelPath: "gemini-2.5-flash",
      geminiBody: {
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: content ? `Generate flashcards from this material for ${subject}` : `Generate flashcards for ${subject}` }] }],
        tools: [toolDecl],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["suggest_flashcards"] } },
      },
      corsHeaders,
    });
    if (result instanceof Response) return result;

    const fc = result.data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
    const headers = {
      ...corsHeaders,
      "Content-Type": "application/json",
      "x-ai-tier": result.tier,
      "x-ai-key-index": String(result.keyIndex),
    };
    if (fc) {
      return new Response(JSON.stringify(fc.functionCall.args), { headers });
    }
    return new Response(JSON.stringify({ cards: [] }), { headers });
  } catch (e) {
    console.error("flashcard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
