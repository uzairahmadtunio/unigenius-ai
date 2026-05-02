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

    const systemText = `You are a Senior Software Engineering Professor AI Tutor at a top university. Your name is UniGenius AI.

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
- For code errors in images, provide the corrected code in a code block`;

    const contents = transformToGeminiFormat(messages);

    return await streamChatWithFailover({
      modelPath: "gemini-2.5-flash",
      geminiBody: {
        system_instruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      },
      systemText,
      contents,
      corsHeaders,
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
