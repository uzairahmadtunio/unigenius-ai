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
    const { type, subject, topic, additionalNotes, semester, studentInfo } = await req.json();

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

    const contents = [{ role: "user", parts: [{ text: prompt }] }];

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
    console.error("generate-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
