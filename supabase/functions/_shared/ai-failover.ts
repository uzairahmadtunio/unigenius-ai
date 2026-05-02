// Multi-Tier AI Failover Provider
// Tier 1: Lovable AI Gateway (managed, uses LOVABLE_API_KEY) — saves user's own quota
// Tier 2: Direct Gemini API with rotation across 10 user-provided keys
// Tier 3: Groq Cloud (Llama-3.3-70b) — last-resort backup

export const GEMINI_KEYS = [
  "AIzaSyBHJxwtB0HeuRO21NyGcVzmBnbsXXQ2BVQ",
  "AIzaSyCzFZ0xHqoRx4AbxCYNF_eIDDE73Fq2QC4",
  "AIzaSyDtWF21jj4nhnLRcNbXoZuulmb38OhsRb8",
  "AIzaSyDmMpx2nalmN-8zKOaWQ9Yjdlr0LsHn-P8",
  "AIzaSyASGMkCUHM3XAd69P79r6UnrixJ38N1p1E",
  "AIzaSyC29Um1jcursKIdK02JY5oz4YiDTRa16JM",
  "AIzaSyAU6FN3fYZmGmeB-zo3_DDzk_7HYyFAb4o",
  "AIzaSyBphHmi7ntSnw36gpRtDQ7cffWXm92wl-U",
  "AIzaSyAugp2WOUbTKM5Hjq9csBy3ebrxc-2EB68",
  "AIzaSyBHcG5oxdiM5U7i3zVAGMsDTFeFMgax1AQ",
];

// Module-level memory of the last-working key index. Persists per worker instance.
let lastWorkingKeyIndex = 0;

export function getLastWorkingKeyIndex() {
  return lastWorkingKeyIndex;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

interface CallResult {
  response: Response;
  tier: "lovable" | "gemini" | "groq";
  keyIndex: number; // -1 for lovable/groq
}

/**
 * Call Gemini's REST API directly, rotating across the 10 keys on rate-limit / server errors.
 * Returns the first OK response along with the key index that succeeded.
 */
async function callGeminiWithRotation(
  modelPath: string,
  body: unknown,
  isStream: boolean,
): Promise<{ response: Response; keyIndex: number } | null> {
  const totalKeys = GEMINI_KEYS.length;
  const startIdx = lastWorkingKeyIndex % totalKeys;
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
  const action = isStream
    ? `${modelPath}:streamGenerateContent?alt=sse&key=`
    : `${modelPath}:generateContent?key=`;

  for (let i = 0; i < totalKeys; i++) {
    const idx = (startIdx + i) % totalKeys;
    const key = GEMINI_KEYS[idx];
    try {
      const resp = await fetch(`${baseUrl}/${action}${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        lastWorkingKeyIndex = idx;
        return { response: resp, keyIndex: idx };
      }
      if (!RETRYABLE_STATUSES.has(resp.status)) {
        // Non-retryable error (e.g. 400). Surface it.
        return { response: resp, keyIndex: idx };
      }
      console.warn(`Gemini key #${idx} returned ${resp.status}, rotating...`);
    } catch (e) {
      console.warn(`Gemini key #${idx} threw:`, e);
    }
  }
  return null;
}

/**
 * Try Lovable AI Gateway (OpenAI-compatible) first. Only suitable for text-only payloads.
 * Returns null if the gateway fails or is unavailable.
 */
async function callLovableGateway(
  openaiPayload: Record<string, unknown>,
): Promise<Response | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });
    if (resp.ok) return resp;
    console.warn("Lovable Gateway returned", resp.status);
    return null;
  } catch (e) {
    console.warn("Lovable Gateway threw:", e);
    return null;
  }
}

/**
 * Tier 3: Groq (Llama-3.3-70b). OpenAI-compatible streaming.
 */
async function callGroq(
  openaiPayload: Record<string, unknown>,
): Promise<Response | null> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return null;
  try {
    const body = { ...openaiPayload, model: "llama-3.3-70b-versatile" };
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (resp.ok) return resp;
    console.warn("Groq returned", resp.status, await resp.text().catch(() => ""));
    return null;
  } catch (e) {
    console.warn("Groq threw:", e);
    return null;
  }
}

/**
 * Convert Gemini-native messages back into OpenAI chat-completion form (text-only).
 * Used when falling back to Lovable Gateway / Groq.
 */
export function geminiContentsToOpenAI(
  contents: any[],
  systemText?: string,
): { role: string; content: string }[] {
  const msgs: { role: string; content: string }[] = [];
  if (systemText) msgs.push({ role: "system", content: systemText });
  for (const c of contents || []) {
    const role = c.role === "model" ? "assistant" : "user";
    const text = (c.parts || [])
      .map((p: any) => p.text)
      .filter(Boolean)
      .join("\n");
    if (text) msgs.push({ role, content: text });
  }
  return msgs;
}

/**
 * Detects whether Gemini contents include non-text parts (images / files).
 */
export function hasMultimodal(contents: any[]): boolean {
  for (const c of contents || []) {
    for (const p of c.parts || []) {
      if (p.inline_data || p.inlineData || p.file_data || p.fileData) return true;
    }
  }
  return false;
}

/**
 * Streaming chat helper. Tries Tier 1 → Tier 2 → Tier 3.
 * Returns an SSE-compatible Response in OpenAI delta format,
 * tagged with x-ai-tier and x-ai-key-index headers.
 */
export async function streamChatWithFailover({
  modelPath,
  geminiBody,
  systemText,
  contents,
  allowLovable = true,
  allowGroq = true,
  corsHeaders,
}: {
  modelPath: string;
  geminiBody: Record<string, unknown>;
  systemText?: string;
  contents: any[];
  allowLovable?: boolean;
  allowGroq?: boolean;
  corsHeaders: Record<string, string>;
}): Promise<Response> {
  const multimodal = hasMultimodal(contents);

  // Tier 1: Lovable Gateway (text-only fallback path)
  if (allowLovable && !multimodal) {
    const openaiMessages = geminiContentsToOpenAI(contents, systemText);
    const lovableResp = await callLovableGateway({
      model: "google/gemini-2.5-flash",
      messages: openaiMessages,
      stream: true,
    });
    if (lovableResp && lovableResp.body) {
      return new Response(lovableResp.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "x-ai-tier": "lovable",
          "x-ai-key-index": "-1",
        },
      });
    }
  }

  // Tier 2: Direct Gemini with key rotation
  const geminiResult = await callGeminiWithRotation(modelPath, geminiBody, true);
  if (geminiResult && geminiResult.response.ok) {
    const transformed = transformGeminiSSEToOpenAI(geminiResult.response);
    return new Response(transformed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "x-ai-tier": "gemini",
        "x-ai-key-index": String(geminiResult.keyIndex),
      },
    });
  }

  // Tier 3: Groq backup
  if (allowGroq) {
    const openaiMessages = geminiContentsToOpenAI(contents, systemText);
    const groqResp = await callGroq({ messages: openaiMessages, stream: true });
    if (groqResp && groqResp.body) {
      return new Response(groqResp.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "x-ai-tier": "groq",
          "x-ai-key-index": "-1",
        },
      });
    }
  }

  // All tiers failed
  return new Response(
    JSON.stringify({ error: "All AI providers are temporarily unavailable. Please try again." }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

/**
 * Non-streaming JSON helper (for tool-calling / structured output).
 * Tries Gemini key rotation only — Lovable Gateway / Groq don't share Gemini's
 * function_declarations format, so we keep the existing tool-calling shape intact.
 */
export async function generateContentWithFailover({
  modelPath,
  geminiBody,
  corsHeaders,
}: {
  modelPath: string;
  geminiBody: Record<string, unknown>;
  corsHeaders: Record<string, string>;
}): Promise<{ data: any; tier: "gemini"; keyIndex: number } | Response> {
  const result = await callGeminiWithRotation(modelPath, geminiBody, false);
  if (!result) {
    return new Response(
      JSON.stringify({ error: "All AI keys are rate-limited. Please try again shortly." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!result.response.ok) {
    const t = await result.response.text();
    console.error("Gemini final error:", result.response.status, t);
    if (result.response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded across all keys." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: "AI service error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const data = await result.response.json();
  return { data, tier: "gemini", keyIndex: result.keyIndex };
}

/**
 * Pipe Gemini SSE stream → OpenAI-compatible delta stream.
 */
function transformGeminiSSEToOpenAI(geminiResp: Response): ReadableStream<Uint8Array> {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = geminiResp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({ choices: [{ delta: { content: text }, index: 0 }] })}\n\n`,
                ),
              );
            }
          } catch {}
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("SSE transform error:", e);
    } finally {
      writer.close();
    }
  })();

  return readable;
}
