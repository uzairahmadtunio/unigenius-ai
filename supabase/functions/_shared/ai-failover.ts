// Multi-Tier AI Failover Provider
// Tier 1: Lovable AI Gateway (managed, uses LOVABLE_API_KEY) — saves user's own quota
// Tier 2: Direct Gemini API with rotation across 10 user-provided keys
// Tier 3: Groq Cloud (Llama-3.3-70b) — last-resort backup

export const GEMINI_KEYS: string[] = (() => {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = Deno.env.get(`GEMINI_KEY_${i}`);
    if (k) keys.push(k);
  }
  // Backward compat: fall back to single key if no rotated keys configured
  if (keys.length === 0) {
    const fallback = Deno.env.get("GEMINI_API_KEY");
    if (fallback) keys.push(fallback);
  }
  return keys;
})();

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
  if (totalKeys === 0) return null;
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
 * Recursively lowercases Gemini's schema "type" fields (OBJECT/ARRAY/STRING ...)
 * so the schema is valid JSON Schema for OpenAI-compatible tool calling.
 */
function geminiSchemaToOpenAI(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(geminiSchemaToOpenAI);
  const out: any = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "type" && typeof v === "string") {
      out.type = v.toLowerCase();
    } else if (k === "properties" && v && typeof v === "object") {
      out.properties = {};
      for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
        out.properties[pk] = geminiSchemaToOpenAI(pv);
      }
    } else if (k === "items") {
      out.items = geminiSchemaToOpenAI(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Translate a Gemini-style body (system_instruction + contents + tools/function_declarations)
 * into an OpenAI chat-completions body suitable for the Lovable AI Gateway.
 */
function geminiBodyToOpenAI(geminiBody: any): Record<string, unknown> {
  const systemText: string | undefined =
    geminiBody?.system_instruction?.parts?.map((p: any) => p.text).filter(Boolean).join("\n");
  const messages: any[] = [];
  if (systemText) messages.push({ role: "system", content: systemText });

  for (const c of geminiBody?.contents || []) {
    const role = c.role === "model" ? "assistant" : "user";
    const blocks: any[] = [];
    for (const p of c.parts || []) {
      if (p.text) blocks.push({ type: "text", text: p.text });
      const inline = p.inline_data || p.inlineData;
      if (inline?.data && inline?.mime_type) {
        if (String(inline.mime_type).startsWith("image/")) {
          blocks.push({
            type: "image_url",
            image_url: { url: `data:${inline.mime_type};base64,${inline.data}` },
          });
        }
      }
    }
    if (blocks.length === 1 && blocks[0].type === "text") {
      messages.push({ role, content: blocks[0].text });
    } else if (blocks.length > 0) {
      messages.push({ role, content: blocks });
    }
  }

  const tools: any[] = [];
  let toolChoice: any;
  for (const t of geminiBody?.tools || []) {
    for (const fd of t.function_declarations || []) {
      tools.push({
        type: "function",
        function: {
          name: fd.name,
          description: fd.description || "",
          parameters: geminiSchemaToOpenAI(fd.parameters) || { type: "object", properties: {} },
        },
      });
    }
  }
  const allowed: string[] | undefined =
    geminiBody?.tool_config?.function_calling_config?.allowed_function_names;
  if (allowed && allowed.length === 1) {
    toolChoice = { type: "function", function: { name: allowed[0] } };
  } else if (tools.length > 0) {
    toolChoice = "auto";
  }

  return {
    model: "google/gemini-2.5-flash",
    messages,
    ...(tools.length > 0 ? { tools, tool_choice: toolChoice } : {}),
  };
}

/**
 * Call Lovable AI Gateway and reshape the response to match Gemini's
 * candidates[0].content.parts[].functionCall shape that existing callers expect.
 */
async function callLovableGatewayAsGemini(
  geminiBody: Record<string, unknown>,
): Promise<any | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const payload = geminiBodyToOpenAI(geminiBody);
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      console.warn("Lovable Gateway (gen) returned", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const json = await resp.json();
    const msg = json?.choices?.[0]?.message;
    const parts: any[] = [];
    if (msg?.content) parts.push({ text: String(msg.content) });
    for (const tc of msg?.tool_calls || []) {
      let args: any = {};
      try { args = JSON.parse(tc?.function?.arguments || "{}"); } catch { args = {}; }
      parts.push({ functionCall: { name: tc?.function?.name, args } });
    }
    return { candidates: [{ content: { parts } }] };
  } catch (e) {
    console.warn("Lovable Gateway (gen) threw:", e);
    return null;
  }
}

/**
 * Non-streaming JSON helper (for tool-calling / structured output).
 * Order: Gemini key rotation → Lovable AI Gateway fallback (LOVABLE_API_KEY).
 * The Lovable fallback is critical when Gemini keys are revoked/leaked.
 */
export async function generateContentWithFailover({
  modelPath,
  geminiBody,
  corsHeaders,
}: {
  modelPath: string;
  geminiBody: Record<string, unknown>;
  corsHeaders: Record<string, string>;
}): Promise<{ data: any; tier: "gemini" | "lovable"; keyIndex: number } | Response> {
  const result = await callGeminiWithRotation(modelPath, geminiBody, false);

  // Success on Gemini
  if (result && result.response.ok) {
    const data = await result.response.json();
    return { data, tier: "gemini", keyIndex: result.keyIndex };
  }

  // Gemini failed (rate-limit, leaked key 403, server error, etc.) — try Lovable Gateway
  if (result && !result.response.ok) {
    const errText = await result.response.text().catch(() => "");
    console.error("Gemini final error:", result.response.status, errText);
  }

  const lovableData = await callLovableGatewayAsGemini(geminiBody);
  if (lovableData) {
    return { data: lovableData, tier: "lovable", keyIndex: -1 };
  }

  // Both providers failed
  const status = result?.response.status === 429 ? 429 : 503;
  const message = status === 429
    ? "Rate limit exceeded. Please try again shortly."
    : "AI service temporarily unavailable. Please try again.";
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
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
