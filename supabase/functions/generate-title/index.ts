import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "Generate a very short chat title (3-6 words max) summarizing the conversation topic. Return ONLY the title, no quotes, no punctuation at the end. Examples: 'C++ Linked List Help', 'Calculus Integration Practice', 'OOP Assignment Debugging'",
          },
          ...messages.slice(0, 4).map((m: any) => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content.slice(0, 200) : "File analysis request",
          })),
        ],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ title: "New Chat" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim() || "New Chat";

    return new Response(JSON.stringify({ title: title.slice(0, 60) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-title error:", e);
    return new Response(JSON.stringify({ title: "New Chat" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
