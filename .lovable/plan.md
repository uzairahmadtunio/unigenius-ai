## Reality-Check Audit — Founder Survival Report

A brutal, data-driven audit grading every UniGenius AI feature by **actual non-founder usage**, not by how cool it looks in the codebase. Output is one markdown file you can download, share, or hand to a co-founder.

### Approach

**1. Pull the real numbers (read-only, no code changes)**

For every table in the project, run two counts:
- Total rows
- Rows from users **other than** `uzairahmadtunio786@gmail.com` (the founder)

Plus signal-of-life queries:
- Distinct active users per feature (last 7 / 30 / all-time) from `chat_sessions`, `quiz_results`, `career_activity`, `notes`, `groups`, `group_messages`, `attendance`, `payment_requests`, `study_plans`, `flashcard_sets`, `past_papers`, `feedbacks`, `support_tickets`, `push_subscriptions`, `bookmarks`, `study_materials`, `user_badges`, `notifications`, `daily_streaks`.
- Edge function call volume from `function_edge_logs` (last 30 days) to see which AI functions are actually invoked.
- Auth signups vs. signups that did anything beyond viewing.
- Revenue signal: approved `payment_requests`, active `profiles.is_pro`, promo redemption rate.

**2. Map tables → features → pages**

Cross-reference each table with the route(s) and edge function(s) that read/write it (using the audit file already on disk plus a fresh sweep of `src/pages` and `supabase/functions`). A feature with a polished UI but a 0-row table = fake feature.

**3. Classify every feature into one of five buckets**

- **Must Keep** — has real non-founder usage AND is core to the value prop (AI chat, auth, profiles, etc.)
- **Revenue Generating** — directly tied to Pro upgrades (`payment_requests`, promo codes, `is_pro` gates)
- **Optional** — used a little, low maintenance, keep but don't invest
- **Remove** — built, shipped, zero non-founder rows, ongoing maintenance/cost — kill it
- **Fake / Vanity** — visible in UI but the underlying flow is broken, mocked, or never reached production usage

**4. Brutal verdict section**

- Top 5 features to delete this week (with the SQL evidence inline)
- Top 3 features pretending to work
- Real DAU / WAU / MAU based on `chat_sessions` + `quiz_results` activity
- Honest revenue line: how many paying users right now, conversion rate, MRR
- "If you had to ship to investors Monday, which 6 features do you keep on the demo?"
- One-page founder action list: cut, freeze, double-down

### Deliverable

**File:** `/mnt/documents/UniGeniusAI_Reality_Check.md`

Structured as:
1. Executive verdict (3 paragraphs, no sugar)
2. Real usage scoreboard (table: feature → rows total → non-founder rows → distinct users → verdict)
3. Must Keep Features
4. Revenue Generating Features
5. Optional Features
6. Remove Features (with delete order + estimated maintenance saved)
7. Fake / Vanity Features (with what's broken)
8. Dead pages & dead tables (literal kill list)
9. What's actually working (the small green column)
10. Founder action plan (this week / this month / before next funding conversation)

### What this plan does NOT do

- No code changes, no migrations, no deletions. Pure analysis.
- No re-grading of code quality, security, or architecture — that's already covered in `UniGeniusAI_Internal_Audit.md`. This audit only judges **adoption and value**.
- No assumptions about user intent — every "Remove" call is backed by a row count you can re-run yourself.

### Technical details

- Data source: `supabase--read_query` for row counts and DAU, `supabase--analytics_query` for edge function call volume, `supabase--slow_queries` only if needed to flag expensive-but-unused functions.
- Founder filter: `WHERE user_id <> (SELECT id FROM auth.users WHERE email = 'uzairahmadtunio786@gmail.com')` on every count.
- Estimated 15–30 queries, ~10 min exploration, ~20–30K char report.
- Re-uses feature inventory already documented in `UniGeniusAI_Internal_Audit.md` so we don't re-enumerate routes from scratch.

Approve to run it, or tell me to skip/add sections (e.g. skip founder action plan, add per-feature cost-to-maintain estimate, include a CSV export of the raw numbers).