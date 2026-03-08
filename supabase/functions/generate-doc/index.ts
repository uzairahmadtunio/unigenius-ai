import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, subject, topic, additionalNotes } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const extra = additionalNotes ? `\n\nAdditional instructions from student: ${additionalNotes}` : "";
    const docType = type === "lab" ? "Lab Manual" : "Assignment";
    const prompt = type === "lab"
      ? `Generate a complete ${docType} for the subject "${subject}" on the experiment/topic "${topic}". Structure it EXACTLY with these sections:\n\n1. **Title Page** (Subject, Experiment Name, Date)\n2. **Objective** (Clear, concise aim)\n3. **Apparatus / Software Required** (List all tools)\n4. **Theory** (Detailed theoretical background, 300+ words)\n5. **Algorithm** (Step-by-step pseudocode)\n6. **Procedure** (Detailed step-by-step lab procedure)\n7. **Code** (Complete working code with inline comments)\n8. **Output / Results** (Expected output, screenshots description)\n9. **Conclusion** (What was learned)\n\nUse proper academic formatting with markdown.${extra}`
      : `Generate a complete ${docType} document for the subject "${subject}" on the topic "${topic}". Structure it with:\n\n1. **Title Page** (Subject, Assignment Title, Student Info placeholder)\n2. **Table of Contents**\n3. **Introduction** (Context and importance)\n4. **Literature Review / Background** (Detailed, 400+ words)\n5. **Main Content** (In-depth analysis with subheadings)\n6. **Examples & Illustrations** (Practical examples)\n7. **Practice Questions** (5 questions for self-assessment)\n8. **Summary / Conclusion**\n9. **References** (APA format placeholders)\n\nUse high-detail academic formatting with proper markdown. Make it submission-ready.${extra}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an academic document generator for university students. Generate professional, well-structured documents with proper academic formatting. Use markdown with headers, bullet points, and code blocks where appropriate.`,
          },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
