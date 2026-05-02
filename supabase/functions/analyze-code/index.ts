import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { streamChatWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-ai-tier, x-ai-key-index",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, errorImage } = await req.json();

    const systemText = `You are a coding assistant for Pakistani university students. Be extremely concise. Respond ONLY with:

1. **Galti:** — One short sentence in Roman Urdu explaining kya galti hai.
2. **Sahi Code:** — The complete corrected code in a single fenced code block (\`\`\`${language}\n...\n\`\`\`).

Do NOT add explanations, walkthroughs, tips, or extra text. ONLY galti + sahi code.${errorImage ? "\n\nThe user shared an error screenshot. Analyze the error in the image and fix the code accordingly." : ""}`;

    const parts: any[] = [];
    parts.push({ text: `Fix this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`` });

    if (errorImage) {
      const base64 = errorImage.startsWith("data:") ? errorImage.split(",")[1] : errorImage;
      const mimeMatch = errorImage.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    }

    const contents = [{ role: "user", parts }];

    return await streamChatWithFailover({
      modelPath: "gemini-2.5-flash",
      geminiBody: {
        system_instruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      },
      systemText,
      contents,
      corsHeaders,
    });
  } catch (e) {
    console.error("analyze-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
