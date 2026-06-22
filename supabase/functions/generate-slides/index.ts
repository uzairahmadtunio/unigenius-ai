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
    const { topic, slideCount } = await req.json();

    const count = Math.min(Math.max(slideCount || 8, 3), 20);

    const prompt = `Create a rich, Gamma-style university-level presentation on: "${topic}"

Generate exactly ${count} slides. Output ONLY a valid JSON array, no markdown fences.

STRUCTURE:
- SLIDE 1: title slide. Set "title" to the main topic, "subtitle" to "Presented by: Uzair Ahmad & Group", empty "bullets" array, short "paragraph" (1 sentence hook).
- SLIDES 2..${count - 1}: content slides. Each MUST contain:
    - "title": punchy 2-5 word section title
    - "paragraph": 1-2 sentence intro/context (25-45 words) that frames the topic of the slide
    - "bullets": 4 to 6 substantive bullet points, each 8-16 words, factual and specific (no fluff like "important" or "useful"). Include real-world examples, numbers, names, or comparisons where possible.
    - "imageSuggestion": vivid visual description for an AI image generator (style + subject)
    - "icon": one lucide-react icon name in kebab-case relevant to the slide
    - "speakerNotes": 2-3 sentences expanding the slide for the presenter
- SLIDE ${count}: "THANK YOU" with bullets ["Any Questions?"], short paragraph thanking the audience.

Make slides feel like a polished Gamma.app deck: dense but readable, varied topics across slides (history, concepts, applications, comparisons, future), never repeating points.

Each object schema: { "title": string, "subtitle"?: string, "paragraph": string, "bullets": string[], "imageSuggestion": string, "icon": string, "speakerNotes": string }`;

    const systemText = `You are a world-class presentation designer who builds Gamma.app-quality decks. Slides are content-rich: every content slide has an intro paragraph PLUS 4-6 detailed, specific bullet points (8-16 words each). Avoid generic filler. Output ONLY a valid JSON array.`;

    const result = await generateContentWithFailover({
      modelPath: "gemini-2.5-flash",
      geminiBody: {
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
      },
      corsHeaders,
    });
    if (result instanceof Response) return result;

    const content = result.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let slides;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse slides JSON:", content);
      throw new Error("Failed to parse AI response");
    }

    slides = slides.map((s: any) => ({
      title: s.title || "Untitled Slide",
      subtitle: s.subtitle || "",
      paragraph: s.paragraph || "",
      bullets: (Array.isArray(s.bullets) ? s.bullets : []).slice(0, 6).map((b: string) => String(b).split(" ").slice(0, 22).join(" ")),
      imageSuggestion: s.imageSuggestion || "",
      icon: s.icon || "presentation",
      speakerNotes: s.speakerNotes || "",
    }));

    return new Response(JSON.stringify({ slides }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-ai-tier": result.tier,
        "x-ai-key-index": String(result.keyIndex),
      },
    });
  } catch (e) {
    console.error("generate-slides error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
