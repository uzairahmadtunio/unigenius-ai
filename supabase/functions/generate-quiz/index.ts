import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, department, count = 30, fileData, fileType, fileName } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const numQuestions = Math.min(Math.max(count, 5), 30);

    const parts: any[] = [];
    let systemText = "";

    if (fileData && fileType) {
      const isImage = fileType.startsWith("image/");
      systemText = `You are a university exam question generator for ${department || "Software Engineering"} students. Analyze the uploaded file content carefully and generate exactly ${numQuestions} MCQs based SPECIFICALLY on the content of this file.`;

      if (isImage) {
        const base64 = fileData.startsWith("data:") ? fileData.split(",")[1] : fileData;
        parts.push({ inline_data: { mime_type: fileType, data: base64 } });
        parts.push({ text: `This is an uploaded image (${fileName || "image"}). Read and analyze ALL text, diagrams, and content visible in this image. Then generate exactly ${numQuestions} MCQs based ONLY on this content.${subject ? ` Subject context: ${subject}.` : ""}` });
      } else {
        const base64 = fileData.startsWith("data:") ? fileData.split(",")[1] : fileData;
        parts.push({ inline_data: { mime_type: fileType, data: base64 } });
        parts.push({ text: `Analyze this uploaded document thoroughly. Generate exactly ${numQuestions} MCQs based ONLY on the specific content of this file.${subject ? ` Subject context: ${subject}.` : ""}` });
      }
    } else {
      systemText = `You are a university exam question generator for ${department} students. Generate exactly ${numQuestions} diverse multiple choice questions about "${subject}".`;
      parts.push({ text: `Generate ${numQuestions} diverse MCQs for the subject "${subject}" covering all important topics. Each question must have 4 options (A, B, C, D), one correct answer, and a brief explanation.` });
    }

    const toolDecl = {
      function_declarations: [{
        name: "return_mcqs",
        description: `Return ${numQuestions} MCQs with options, correct answers, and explanations.`,
        parameters: {
          type: "OBJECT",
          properties: {
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING" },
                  options: {
                    type: "OBJECT",
                    properties: {
                      A: { type: "STRING" },
                      B: { type: "STRING" },
                      C: { type: "STRING" },
                      D: { type: "STRING" },
                    },
                    required: ["A", "B", "C", "D"],
                  },
                  correct: { type: "STRING" },
                  explanation: { type: "STRING" },
                },
                required: ["question", "options", "correct", "explanation"],
              },
            },
          },
          required: ["questions"],
        },
      }],
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts }],
        tools: [toolDecl],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["return_mcqs"] } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service error");
    }

    const data = await response.json();
    const fc = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
    if (!fc) throw new Error("No function call in response");

    const questions = fc.functionCall.args;
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
