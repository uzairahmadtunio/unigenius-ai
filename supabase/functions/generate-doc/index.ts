import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  try {
    const { type, subject, topic, additionalNotes, semester, studentInfo } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const extra = additionalNotes ? `\n\nAdditional instructions from student: ${additionalNotes}` : "";
    const sName = studentInfo?.name || "__________ (Enter Name)";
    const sRoll = studentInfo?.rollNumber || "__________ (Enter Roll No)";
    const sDept = studentInfo?.department || "Software Engineering";
    const sSemester = semester || "(Current Semester)";

    const prompt = type === "lab"
      ? `Generate a complete Lab Manual for the subject "${subject}" on the topic "${topic}" in the EXACT style of the University of Larkano lab manuals.

FORMAT — follow this EXACTLY:

# UNIVERSITY OF LARKANO
## Department of ${sDept}
### Subject: ${subject}
---

**Student Information:**
| Field | Details |
|-------|---------|
| **Name** | ${sName} |
| **Roll No** | ${sRoll} |
| **Department** | ${sDept} |
| **Semester** | ${sSemester} |

---

Then for EACH task:

## Task [Number]
**Problem Statement:** Write a clear, simple one-line problem.
**Objective:** One-line goal.
**Code:**
\`\`\`cpp
// beginner-friendly C++ code
\`\`\`
**Result/Output:**
\`\`\`
(expected console output)
\`\`\`

---

Generate 3-5 tasks. End with a ## Conclusion section.${extra}`
      : `Generate a complete Assignment for "${subject}" on "${topic}".

Write as an undergraduate student. Use simple English. Short paragraphs. Bullet points. Common vocabulary.

STRUCTURE:
1. **Title Page**
2. **Table of Contents**
3. **Introduction**
4. **Main Content**
5. **Examples**
6. **Summary / Conclusion**
7. **References**

Use markdown formatting.${extra}`;

    const systemText = type === "lab"
      ? `You are a lab manual generator for the University of Larkano. Generate lab manuals with header, student info table, and task-based structure. Use simple language. Markdown formatting.`
      : `You are a document generator that writes like an undergraduate student. Simple, clear, human-like tone. Markdown formatting.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI service error");
    }

    // Transform Gemini SSE to OpenAI-compatible SSE
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
                await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text }, index: 0 }] })}\n\n`));
              }
            } catch {}
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally { writer.close(); }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
