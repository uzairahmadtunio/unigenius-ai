import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, department, count = 30, fileData, fileType, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const numQuestions = Math.min(Math.max(count, 5), 30);

    // Build messages based on whether file content is provided
    const messages: any[] = [];
    
    if (fileData && fileType) {
      // Vision-powered: analyze uploaded file content for MCQs
      const isImage = fileType.startsWith("image/");
      
      messages.push({
        role: "system",
        content: `You are a university exam question generator for ${department || "Software Engineering"} students. You MUST analyze the uploaded file content carefully and generate exactly ${numQuestions} MCQs based SPECIFICALLY on the content of this file. Do NOT use general knowledge — every question must be directly derived from the material in the uploaded file.

Questions must:
- Be directly based on the specific content in the uploaded file
- Cover different sections/topics found in the file
- Range from basic recall to analytical questions
- Each have 4 options (A, B, C, D), one correct answer, and a brief explanation referencing the file content`,
      });

      const userParts: any[] = [];
      
      if (isImage) {
        userParts.push({ type: "image_url", image_url: { url: fileData.startsWith("data:") ? fileData : `data:${fileType};base64,${fileData}` } });
        userParts.push({ type: "text", text: `This is an uploaded image (${fileName || "image"}). Read and analyze ALL text, diagrams, and content visible in this image. Then generate exactly ${numQuestions} MCQs based ONLY on this content.${subject ? ` Subject context: ${subject}.` : ""}` });
      } else {
        // PDF, Word, PPT etc.
        const base64 = fileData.startsWith("data:") ? fileData.split(",")[1] : fileData;
        userParts.push({ type: "file", file: { name: fileName || "document", mime_type: fileType, data: base64 } });
        userParts.push({ type: "text", text: `Analyze this uploaded document thoroughly. Generate exactly ${numQuestions} MCQs based ONLY on the specific content of this file.${subject ? ` Subject context: ${subject}.` : ""}` });
      }
      
      messages.push({ role: "user", content: userParts });
    } else {
      // Standard subject-based quiz generation
      messages.push({
        role: "system",
        content: `You are a university exam question generator for ${department} students. Generate exactly ${numQuestions} diverse multiple choice questions about "${subject}". 

Questions must:
- Cover different topics within the subject
- Range from basic to advanced difficulty
- Include conceptual, applied, and analytical questions
- Each have 4 options (A, B, C, D), one correct answer, and a brief explanation of why the correct answer is right

Make questions university-level and exam-relevant.`,
      });
      messages.push({
        role: "user",
        content: `Generate ${numQuestions} diverse MCQs for the subject "${subject}" covering all important topics.`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: fileData ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "return_mcqs",
              description: `Return ${numQuestions} MCQs with options, correct answers, and explanations.`,
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "object",
                          properties: {
                            A: { type: "string" },
                            B: { type: "string" },
                            C: { type: "string" },
                            D: { type: "string" },
                          },
                          required: ["A", "B", "C", "D"],
                          additionalProperties: false,
                        },
                        correct: { type: "string", enum: ["A", "B", "C", "D"] },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correct", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_mcqs" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const questions = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(questions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
