import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, slideCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const count = Math.min(Math.max(slideCount || 8, 3), 20);

    const prompt = `Create a professional presentation on the topic: "${topic}"

Generate exactly ${count} slides. For EACH slide, output in this EXACT JSON format (output ONLY the JSON array, no markdown, no code fences):

[
  {
    "title": "Slide title here",
    "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"],
    "imageSuggestion": "Describe a relevant, high-quality image for this slide"
  }
]

Rules:
- First slide should be a title/intro slide
- Last slide should be a summary/conclusion or Q&A slide
- Each slide should have 3-5 bullet points in professional English
- Image suggestions should be descriptive and specific (e.g., "A modern computer lab with students coding on laptops")
- Keep bullet points concise and informative
- Make content educational and well-structured`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional presentation designer. Generate slide content as a valid JSON array. Output ONLY raw JSON — no markdown code fences, no explanatory text. Each slide object has: title (string), bullets (string array of 3-5 items), imageSuggestion (string).",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response (handle potential markdown wrapping)
    let slides;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse slides JSON:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify({ slides }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-slides error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
