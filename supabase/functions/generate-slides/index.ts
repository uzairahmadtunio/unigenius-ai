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

    const prompt = `Create a university-level presentation on: "${topic}"

Generate exactly ${count} slides. Output ONLY a valid JSON array, no markdown.

SLIDE 1: title slide with subtitle "Presented by: Uzair Ahmad & Group", empty bullets array.
SLIDES 2-${count - 1}: content slides with EXACTLY 3 short bullet points (max 8 words each).
SLIDE ${count}: "THANK YOU" with ["Any Questions?"].

Each object: { "title": string, "subtitle": string (optional), "bullets": string[], "imageSuggestion": string, "icon": string (lucide kebab-case), "speakerNotes": string }`;

    const systemText = `You are a strict presentation designer. Make clean, minimal slides. Each content slide has EXACTLY 3 bullet points under 8 words. First slide = title only. Last slide = THANK YOU. Output ONLY valid JSON array.`;

    const result = await generateContentWithFailover({
      modelPath: "gemini-2.5-flash",
      geminiBody: {
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
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
      bullets: (Array.isArray(s.bullets) ? s.bullets : []).slice(0, 3).map((b: string) => b.split(" ").slice(0, 10).join(" ")),
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
