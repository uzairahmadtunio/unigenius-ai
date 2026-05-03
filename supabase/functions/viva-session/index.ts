import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { streamChatWithFailover } from "../_shared/ai-failover.ts";

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
    const { messages, subject, difficulty } = await req.json();

    const systemText = `You are a strict but fair university examiner conducting a VIVA VOCE examination for the subject: "${subject}".

PERSONA & STYLE:
- You speak in a mix of English and Roman Urdu (like a Pakistani university professor)
- Be professional but sometimes use casual phrases like "Acha", "Bilkul", "Theek hai", "Samjhao mujhe"
- Start with easier questions and progressively increase difficulty
- Current difficulty level: ${difficulty || 'medium'}

VIVA RULES:
1. Ask ONE question at a time
2. Wait for the student's answer before proceeding
3. After each answer, give brief feedback: correct ✅, partially correct ⚠️, or incorrect ❌
4. Include a confidence score (1-10) for each answer
5. Ask follow-up questions to test depth of understanding
6. After 8-10 questions, provide a summary with Overall Score, Strengths, Areas to improve, Grade recommendation

FORMAT: Use markdown. Bold key terms. Use emojis for feedback.`;

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
    }));

    return await streamChatWithFailover({
      modelPath: "gemini-2.5-flash",
      geminiBody: {
        system_instruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      },
      systemText,
      contents,
      corsHeaders,
    });
  } catch (e) {
    console.error("viva error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
