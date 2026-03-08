import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, errorImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: any[] = [
      {
        role: "system",
        content: `You are a coding assistant. Be concise. Respond ONLY with:

1. **Error** — One short sentence explaining what's wrong (in simple English or Roman Urdu).
2. **Fixed Code** — The complete corrected code in a single fenced code block (\`\`\`${language}\n...\n\`\`\`).

Do NOT add explanations, line-by-line walkthroughs, tips, or anything else. Just the error and the fixed code.${errorImage ? "\n\nThe user shared an error screenshot. Analyze the error in the image and fix the code accordingly." : ""}`,
      },
    ];

    if (errorImage) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `Fix this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`` },
          { type: "image_url", image_url: { url: errorImage } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Fix this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      });
    }

    const model = errorImage ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
