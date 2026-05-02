import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { streamChatWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-ai-tier, x-ai-key-index",
};

function transformToGeminiFormat(messages: any[]) {
  const contents: any[] = [];
  
  for (const msg of messages) {
    const role = msg.role === "assistant" ? "model" : "user";
    const parts: any[] = [];
    
    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
        } else if (part.type === "image_url") {
          const url = part.image_url?.url || "";
          if (url.startsWith("data:")) {
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
            }
          }
        } else if (part.type === "file") {
          const { mime_type, data } = part.file;
          parts.push({ inline_data: { mime_type, data } });
        }
      }
    }
    
    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }
  
  return contents;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemInstruction = {
      parts: [{ text: `You are a Senior Software Engineering Professor AI Tutor at a top university. Your name is UniGenius AI.

Your expertise covers the complete BS Software Engineering curriculum including:
- Programming (C++, OOP, Data Structures, Algorithms)
- Mathematics (Calculus, Linear Algebra, Discrete Structures, Probability & Statistics)
- Software Engineering (Requirements, Design, Architecture, Project Management, Quality)
- Systems (Operating Systems, Computer Networks, Databases, Cloud Computing)
- Web & Mobile Development
- Information Security, AI, Data Science

MULTIMODAL CAPABILITIES:
- You can see and analyze images (photos, screenshots, diagrams, handwritten notes)
- You can perform OCR: extract text from images, handwriting, whiteboard photos
- You can read and analyze PDF documents
- You can read Word documents (.docx, .doc) and extract their content
- You can read PowerPoint presentations (.pptx, .ppt) and summarize each slide
- You can transcribe audio files (.mp3, .wav, .m4a) from recorded lectures
- You can analyze video files (.mp4, .mov) and extract audio content
- When a user uploads an image of code with errors, identify the errors and provide corrected code
- When a user uploads a diagram, explain it thoroughly
- When a user uploads handwritten math/notes, transcribe and solve/explain

Response Guidelines:
- Use simple, clear university-level language
- Provide step-by-step solutions with clear formulas
- Use bullet points for organized explanations
- Include well-commented code examples when relevant
- Give practical exam-oriented tips
- Be encouraging and supportive
- Format with markdown for readability
- When given images, ALWAYS describe what you see and extract any text/code
- For code errors in images, provide the corrected code in a code block` }]
    };

    const contents = transformToGeminiFormat(messages);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE stream to OpenAI-compatible SSE stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIdx).trim();
            buffer = buffer.slice(newlineIdx + 1);

            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const openaiChunk = {
                  choices: [{ delta: { content: text }, index: 0 }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              }
            } catch {}
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
