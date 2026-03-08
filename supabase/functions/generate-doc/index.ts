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
      ? `Generate a complete Lab Manual for the subject "${subject}" on the topic "${topic}" in the EXACT style of the University of Larkano lab manuals.

FORMAT — follow this EXACTLY:

Start with this header block (use markdown):

# UNIVERSITY OF LARKANO
## Department of Software Engineering
### Subject: ${subject}
---

**Student Information:**
| Field | Details |
|-------|---------|
| **Name** | Uzair Ahmad Tunio |
| **Roll No** | 14 |
| **Department** | Software Engineering |
| **Semester** | (Current Semester) |

---

Then for EACH task in the lab, follow this structure:

## Task [Number]
**Problem Statement:** Write a clear, simple one-line problem (e.g., "Write a program to calculate the area of a circle.")

**Objective:** One-line goal of this task.

**Code:**
\`\`\`cpp
#include <iostream>
using namespace std;
// ... beginner-friendly C++ code with simple comments
\`\`\`

**Result/Output:**
\`\`\`
(Show the exact expected console output here)
\`\`\`

---

IMPORTANT RULES:
- Generate 3-5 tasks per lab unless the topic only needs fewer.
- Keep code beginner-friendly. Use standard headers like #include <iostream> and using namespace std;
- Use simple variable names and straightforward logic.
- Avoid complex AI explanations. Write like a student: "This program takes input from the user..." or "The output will be..."
- If a flowchart is needed, describe it in simple numbered steps (not ASCII art).
- Bold all headings: **Task**, **Code**, **Result**, **Objective**.
- End with a ## Conclusion section summarizing what was learned in 3-4 simple sentences.${extra}`
      : `Generate a complete Assignment for the subject "${subject}" on the topic "${topic}".

IMPORTANT TONE & STYLE RULES — follow these strictly:
- Write as an undergraduate student, NOT a professor or researcher.
- Use simple, clear, everyday English. Avoid complex jargon or PhD-level theories.
- Keep paragraphs short (3-4 sentences max). No long, winding sentences.
- Use common words: say "Importance" not "Theoretical Underpinnings", say "Barriers" not "Cognitive Impediments", say "Types" not "Taxonomical Classifications".
- Add a personal touch occasionally: phrases like "In my opinion,", "As a student, I think...", "From what I've learned...", "I believe that..." to make it sound human-written.
- Use short bullet points and simple definitions (e.g., "Listening is more than just hearing sounds.").
- Give practical, everyday examples that a student would think of.
- If references are needed, keep them basic and standard (simple author-year format). Don't over-complicate citations.

STRUCTURE:
1. **Title Page** (Subject, Assignment Title, Student Info placeholder)
2. **Table of Contents**
3. **Introduction** (Brief context — why this topic matters, 3-4 sentences)
4. **Main Content** (Use clear subheadings, short paragraphs, bullet points, and simple definitions. Include practical examples.)
5. **Examples** (Real-world, everyday examples a student would use)
6. **Summary / Conclusion** (Brief personal reflection, what was learned)
7. **References** (Simple, standard format — keep it minimal)

Use markdown formatting with headers and bullet points.${extra}`;

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
            content: type === "lab"
              ? `You are a lab manual generator for the University of Larkano, Department of Software Engineering. Generate lab manuals in the exact university format with header, student info table, and task-based structure. Each task must have: Problem Statement, Objective, C++ Code (beginner-level), and Result/Output. Write like a student — simple language, no complex jargon. Always end with a Conclusion. Use markdown formatting.`
              : `You are a document generator that writes like an undergraduate university student. Write in a simple, clear, human-like student tone — short paragraphs, bullet points, common vocabulary, and occasional personal opinions. Never sound like a research paper or PhD thesis. Use markdown formatting.`,
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
