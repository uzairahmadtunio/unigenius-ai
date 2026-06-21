## Deliverable

One file: `/mnt/documents/UniGeniusAI_Internal_Audit.md` (downloadable from chat), written as a real startup due-diligence report — brutal, specific, evidence-backed with file paths, table names, and policy references. No filler, no "looks good."

## How I'll produce it

Plan-mode is read-only, so I cannot create the file yet. Once you approve this plan and I switch to build mode, I will:

1. **Inventory pass (read-only exploration)**
   - Enumerate routes from `src/App.tsx`, every file under `src/pages`, `src/components`, `src/hooks`, `src/lib`.
   - Enumerate all edge functions under `supabase/functions/*`.
   - Query the live DB for: every table's columns, every RLS policy, every index, every trigger, every RPC. Cross-check against `src/integrations/supabase/types.ts`.
   - Enumerate storage buckets, secrets (names only), external APIs (Gemini keys 1–10, Groq, Firebase, Lovable AI).
   - Pull `pg_stat_statements` slow queries and the Supabase linter output.

2. **Targeted deep dives (parallel sub-agents)** for the heaviest sections so my own context stays focused:
   - DB + RLS + indexes audit
   - Edge functions + AI cost/abuse audit
   - Frontend perf + bundle + React anti-patterns
   - Auth/roles/admin/teacher privilege model
   - PWA + Push notifications end-to-end
   - Payments + premium + promo + monetization

3. **Write the report** in the exact 16 sections you listed, with:
   - Concrete file:line / table.policy references
   - Severity tags (🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low)
   - Numeric scores in Section 15
   - A blunt verdict in Section 16 — what's real, what's fake progress, what scales, what doesn't, would-I-invest, what I'd ship first as CTO

4. **Emit** the file with a `<presentation-artifact>` tag so you can open/download it directly.

## Scope boundaries

- Read-only. I will not change code, schema, or settings during the audit.
- Any fixes get listed in Sections 13/14 with priority and effort; actual implementation is a separate follow-up turn you approve.
- Estimated size: 25k–40k characters of report. Expect 8–15 minutes of exploration before the file appears.

## What I need from you

Just approve. If you want any section dropped or expanded (e.g. "skip investor section", "go harder on security"), say so now and I'll fold it in before writing.