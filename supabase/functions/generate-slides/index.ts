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

    const prompt = `Create a university-level presentation on: "${topic}"

Generate exactly ${count} slides following this STRICT structure:

SLIDE 1 (Title Slide):
- title: The main topic name (short, bold, max 5 words)
- subtitle: "Presented by: Uzair Ahmad & Group"
- bullets: [] (EMPTY array - absolutely NO bullets on title slide)

SLIDES 2 to ${count - 1} (Content Slides):
- title: One clear, bold heading (ALL CAPS, max 5 words)
- bullets: EXACTLY 3 short bullet points (each bullet MAX 8 words). NO paragraphs. NO long sentences. NO explanations.
- Keep it like a real PowerPoint: keywords only, not full sentences.

SLIDE ${count} (Closing Slide):
- title: "THANK YOU"
- bullets: ["Any Questions?"]

OUTPUT FORMAT — JSON array only, no markdown:
[
  {
    "title": "TOPIC NAME",
    "subtitle": "Presented by: Uzair Ahmad & Group",
    "bullets": [],
    "imageSuggestion": "A relevant image description",
    "icon": "lucide-icon-name",
    "speakerNotes": "2-3 sentence script for presenter"
  }
]

CRITICAL RULES:
- MAXIMUM 3 bullet points per content slide. NEVER 4. NEVER more.
- Each bullet point MUST be under 8 words. If longer, shorten it.
- Title slide: NO bullets, only title + subtitle
- Last slide: always "THANK YOU"
- icon: valid Lucide kebab-case name (book-open, code, brain, lightbulb, users, target, trophy, layers, ear, eye, message-circle, pen-tool, graduation-cap)
- subtitle field only for title slide
- speakerNotes: 2-3 sentences the presenter should say`;

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
            content: `You are a strict presentation designer. You make clean, minimal slides like Gamma.app.

ABSOLUTE RULES:
1. Each content slide has EXACTLY 3 bullet points. Never more, never less.
2. Each bullet is under 8 words — keywords only, NOT full sentences.
3. First slide = title only (empty bullets array, include subtitle "Presented by: Uzair Ahmad & Group").
4. Last slide = "THANK YOU" with ["Any Questions?"].
5. Headings: ALL CAPS, max 5 words, bold.
6. Output ONLY valid JSON array. No markdown, no code fences.

Each object: title (string), subtitle (string, optional), bullets (string[]), imageSuggestion (string), icon (string), speakerNotes (string).`,
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
    
    let slides;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse slides JSON:", content);
      throw new Error("Failed to parse AI response");
    }

    // Enforce max 4 bullets and trim long ones
    slides = slides.map((s: any) => ({
      title: s.title || "Untitled Slide",
      subtitle: s.subtitle || "",
      bullets: (Array.isArray(s.bullets) ? s.bullets : [])
        .slice(0, 3)
        .map((b: string) => b.split(" ").slice(0, 10).join(" ")),
      imageSuggestion: s.imageSuggestion || "",
      icon: s.icon || "presentation",
      speakerNotes: s.speakerNotes || "",
    }));

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
