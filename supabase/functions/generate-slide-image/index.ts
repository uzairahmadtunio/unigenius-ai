import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway — uses auto-provisioned LOVABLE_API_KEY.
// Try Nano Banana 2 first (best quality + fast), fall back to 2.5-flash-image.
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const IMAGE_MODELS = [
  "google/gemini-3.1-flash-image", // Nano Banana 2
  "google/gemini-2.5-flash-image", // Nano Banana 1
];

async function generateImageViaGateway(prompt: string, apiKey: string): Promise<{ base64: string; mimeType: string; model: string }> {
  let lastErr = "";
  for (const model of IMAGE_MODELS) {
    try {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "edge-fetch",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          size: "1792x1024",
          response_format: "b64_json",
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        lastErr = `[${model}] ${res.status}: ${txt.slice(0, 300)}`;
        console.warn(lastErr);
        // 4xx on this model -> try next model; 5xx -> also try next model
        continue;
      }
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        lastErr = `[${model}] no b64_json in response: ${JSON.stringify(data).slice(0, 300)}`;
        console.warn(lastErr);
        continue;
      }
      return { base64: b64, mimeType: "image/png", model };
    } catch (e) {
      lastErr = `[${model}] ${e instanceof Error ? e.message : String(e)}`;
      console.warn(lastErr);
    }
  }
  throw new Error(`All Lovable AI image attempts failed. Last: ${lastErr}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { prompt, slideIndex, sessionId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase not configured");

    const imagePrompt = `A professional, polished presentation slide illustration depicting: ${prompt}. Modern editorial style, clean composition, vibrant but tasteful colors, photorealistic or premium 3D render, suitable as a hero image inside a corporate/academic slide. No embedded text, no captions, no watermarks. 16:9 friendly framing.`;

    const { base64, mimeType, model } = await generateImageViaGateway(imagePrompt, LOVABLE_API_KEY);
    console.log(`generate-slide-image: used ${model}`);

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

    return new Response(JSON.stringify({ imageUrl: urlData.publicUrl, model }), {
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
