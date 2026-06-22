import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { streamChatWithFailover } from "../_shared/ai-failover.ts";
import { enforceBodySize, clampString } from "../_shared/limits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-ai-tier, x-ai-key-index",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  // Allow up to ~12 MB so users can attach a few image / PDF brief pages.
  const tooBig = enforceBodySize(req, corsHeaders, 12_000_000);
  if (tooBig) return tooBig;

  try {
    const body = await req.json();
    const type = clampString(body.type, 32);
    const subject = clampString(body.subject, 200);
    const topic = clampString(body.topic, 500);
    const additionalNotes = clampString(body.additionalNotes, 2_000);
    const semester = clampString(body.semester, 50);
    const studentInfo = body.studentInfo && typeof body.studentInfo === "object" ? body.studentInfo : {};

    // Optional media attachments (images / PDFs of teacher's brief).
    // Shape: [{ mimeType: "image/png", data: "<base64>" }, ...]
    const rawMedia = Array.isArray(body.media) ? body.media : [];
    const media = rawMedia
      .slice(0, 6) // cap to 6 files
      .filter((m: any) => m && typeof m.mimeType === "string" && typeof m.data === "string")
      .map((m: any) => ({
        mimeType: String(m.mimeType).slice(0, 100),
        data: String(m.data),
      }));

    const extra = additionalNotes ? `\n\nAdditional instructions from student: ${additionalNotes}` : "";
    const hasMedia = media.length > 0;

    const mediaClause = hasMedia
      ? `\n\nCRITICAL — TEACHER'S BRIEF ATTACHED: The teacher's original lab/assignment brief is attached as ${media.length} file(s) above (images/PDF). Read EVERY page from top to bottom. Identify EVERY numbered task (Task 1, Task 2, Task 3, ... right up to the last one). You MUST generate one full section for EACH AND EVERY task found in the brief — DO NOT stop after Task 1, DO NOT merge tasks, DO NOT skip any task even if it looks similar to another. Use the teacher's exact wording and the same task numbers (Task 1, Task 2, ...). Count the tasks first, then write that many sections.`
      : "";

    const prompt = type === "lab"
      ? `Generate a complete Lab Manual on the topic "${topic}" for the subject "${subject}".${mediaClause}

STRICT FORMATTING RULES:
- DO NOT write the university name, department, subject header, or any student info table — the document cover page already has them.
- DO NOT use markdown tables (no pipe characters | at all).
- DO NOT use horizontal rules (---).
- DO NOT wrap normal keywords like do-while, for, while, if in backticks. Only use \`\`\`cpp ... \`\`\` fenced blocks for actual code, and \`\`\` ... \`\`\` for output. Never inline-backtick single words.
- Use plain prose. Short, clear sentences. Beginner-friendly.
- Keep each task's code concise (15-30 lines) so all tasks fit. Do NOT pad with comments.

STRUCTURE — start directly with:

## Lab Objectives
A short paragraph (2-3 sentences) describing what the student will learn${hasMedia ? " (paraphrase the objectives from the attached brief)" : ""}.

${hasMedia
  ? `Then generate ONE \"## Task N: ...\" section for EVERY task in the attached brief — if the brief has 6 tasks, output 6 task sections. Do not stop early.`
  : `Then generate 3 to 5 tasks.`} Each task in this EXACT format:

## Task 1: <short descriptive title>

**Problem Statement:** One clear sentence describing what to build${hasMedia ? " (use the teacher's exact wording)" : ""}.

**Objective:** One sentence describing the learning goal.

**Code:**
\`\`\`cpp
// complete, runnable, beginner-friendly C++ code (keep it short, 15-30 lines)
\`\`\`

**Expected Output:**
\`\`\`
(sample console output)
\`\`\`

**Explanation:** A short 2-3 sentence plain-English explanation of how the code works.

After ALL tasks (not after Task 1), end with:

## Conclusion
A 3-4 sentence wrap-up of what was learned across all tasks.${extra}`

      : `Generate a complete academic Assignment on the topic "${topic}" for the subject "${subject}".${mediaClause}

STRICT FORMATTING RULES:
- DO NOT write the university name, department, subject header, or any student info table — the cover page already has them.
- DO NOT use markdown tables (no pipe characters |).
- DO NOT use horizontal rules (---).
- DO NOT wrap normal English words in backticks. Use \`\`\`cpp ... \`\`\` only for real code blocks.
- Write as a final-year undergraduate. Clear, simple, human English. Short paragraphs.

STRUCTURE — start directly with:

${hasMedia
  ? `## Introduction
A short paragraph introducing the topic.

Then answer EVERY question / task from the attached brief, in the SAME order the teacher used. For each question use:

## Question 1: <restate the teacher's question>

Detailed answer in clear prose. Use \`\`\`cpp blocks for any code. Use bullet points where helpful.`
  : `## Introduction
2-3 paragraphs introducing the topic and its importance.

## Main Concepts
Detailed explanation of the key concepts. Use ### sub-headings for each concept. Use bullet points where helpful.

## Practical Examples
Worked examples. Use \`\`\`cpp blocks for code samples.

## Applications
Real-world uses (bullet points).`}

## Conclusion
A 3-4 sentence wrap-up.

## References
A short numbered list of 3-5 plausible academic references.${extra}`;

    const systemText = type === "lab"
      ? `You are a professional lab manual writer for a Pakistani university. Output clean markdown. Never use pipe characters, never use horizontal rules, never inline-backtick single keywords. Never repeat the cover page header. Be precise, beginner-friendly, and complete.${hasMedia ? " When a brief is attached, follow it literally — every task, every constraint." : ""}`
      : `You are a professional academic writer. Output clean markdown. Never use pipe characters, never use horizontal rules, never inline-backtick single words. Never repeat the cover page header. Write in clear, human, undergraduate English.${hasMedia ? " When a brief is attached, answer every question from it in order." : ""}`;

    // Build Gemini parts: media first (so the model sees the brief), then the prompt.
    const userParts: any[] = [];
    for (const m of media) {
      userParts.push({ inline_data: { mime_type: m.mimeType, data: m.data } });
    }
    userParts.push({ text: prompt });

    const contents = [{ role: "user", parts: userParts }];

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
