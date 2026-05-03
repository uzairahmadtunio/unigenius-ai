import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { generateContentWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-ai-tier, x-ai-key-index",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { messages } = await req.json();

    const contents = messages.slice(0, 4).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content.slice(0, 200) : "File analysis request" }],
    }));

    const result = await generateContentWithFailover({
      modelPath: "gemini-2.5-flash-lite",
      geminiBody: {
        system_instruction: { parts: [{ text: "Generate a very short chat title (3-6 words max) summarizing the conversation topic. Return ONLY the title, no quotes, no punctuation at the end. Examples: 'C++ Linked List Help', 'Calculus Integration Practice', 'OOP Assignment Debugging'" }] },
        contents,
      },
      corsHeaders,
    });
    if (result instanceof Response) {
      // Graceful fallback: never block the UI on title generation
      return new Response(JSON.stringify({ title: "New Chat" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = result.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "New Chat";

    return new Response(JSON.stringify({ title: title.slice(0, 60) }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-ai-tier": result.tier,
        "x-ai-key-index": String(result.keyIndex),
      },
    });
  } catch (e) {
    console.error("generate-title error:", e);
    return new Response(JSON.stringify({ title: "New Chat" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
