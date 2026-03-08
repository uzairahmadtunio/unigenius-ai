import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert multimodal content parts to Gemini-compatible format
function transformMessages(messages: any[]) {
  return messages.map((msg: any) => {
    // If content is a string, pass as-is
    if (typeof msg.content === "string") return msg;

    // If content is an array of parts, transform for OpenAI-compatible API
    if (Array.isArray(msg.content)) {
      const transformedParts: any[] = [];

      for (const part of msg.content) {
        if (part.type === "text") {
          transformedParts.push(part);
        } else if (part.type === "image_url") {
          // Images: pass through as image_url (Gemini supports base64 data URLs)
          transformedParts.push(part);
        } else if (part.type === "file") {
          // PDFs/DOCX: convert to image_url format with proper mime type
          // The Lovable AI gateway / Gemini supports inline base64 data
          const { name, mime_type, data } = part.file;
          if (mime_type === "application/pdf") {
            // Send PDF as image_url with data URL (Gemini handles PDFs natively)
            transformedParts.push({
              type: "image_url",
              image_url: { url: `data:${mime_type};base64,${data}` },
            });
          } else {
            // For DOCX and other binary docs, add instruction text
            transformedParts.push({
              type: "text",
              text: `[File attached: ${name} (${mime_type})] — The user uploaded this document. Please help analyze its content based on the context provided.`,
            });
          }
        }
      }

      return { ...msg, content: transformedParts };
    }

    return msg;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const transformedMessages = transformMessages(messages);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Senior Software Engineering Professor AI Tutor at a top university. Your name is UniGenius AI.

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
- For code errors in images, provide the corrected code in a code block`,
          },
          ...transformedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
