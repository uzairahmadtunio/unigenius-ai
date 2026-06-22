import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GEMINI_KEYS } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Models to try in order. Nano Banana models support text->image via responseModalities.
const IMAGE_MODELS = [
  "gemini-2.5-flash-image",       // Nano Banana — widely available
  "gemini-2.0-flash-exp",         // legacy fallback
];

const RETRYABLE = new Set([400, 401, 403, 429, 500, 502, 503, 504]);

async function callGeminiImage(prompt: string): Promise<{ base64: string; mimeType: string; keyIndex: number; model: string }> {
  if (GEMINI_KEYS.length === 0) throw new Error("No Gemini API keys configured");

  let lastErr = "";
  for (const model of IMAGE_MODELS) {
    for (let i = 0; i < GEMINI_KEYS.length; i++) {
      const key = GEMINI_KEYS[i];
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
          },
        );

        if (!res.ok) {
          const txt = await res.text();
          lastErr = `[${model} key#${i + 1}] ${res.status}: ${txt.slice(0, 200)}`;
          console.warn(lastErr);
          if (RETRYABLE.has(res.status)) continue; // try next key
          break; // non-retryable: try next model
        }

        const data = await res.json();
        const part = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (!part) {
          lastErr = `[${model} key#${i + 1}] no image in response (safety block?)`;
          console.warn(lastErr, JSON.stringify(data).slice(0, 300));
          continue; // try next key
        }
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
          keyIndex: i + 1,
          model,
        };
      } catch (e) {
        lastErr = `[${model} key#${i + 1}] ${e instanceof Error ? e.message : String(e)}`;
        console.warn(lastErr);
      }
    }
  }
  throw new Error(`All Gemini image attempts failed. Last: ${lastErr}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { prompt, slideIndex, sessionId } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase not configured");

    const imagePrompt = `Professional presentation slide image: ${prompt}. Clean, modern, high-quality business/academic style. No text overlay. Suitable as a PowerPoint slide visual.`;

    const { base64, mimeType, keyIndex, model } = await callGeminiImage(imagePrompt);
    console.log(`generate-slide-image: used ${model} via key#${keyIndex}`);

    const ext = mimeType.includes("jpeg") ? "jpg" : "png";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const filePath = `${sessionId}/slide-${slideIndex}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("slide-images")
      .upload(filePath, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload image");
    }

    const { data: urlData } = supabase.storage.from("slide-images").getPublicUrl(filePath);

    return new Response(JSON.stringify({ imageUrl: urlData.publicUrl, model, keyIndex }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-slide-image error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Rate") || msg.includes("429") ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
