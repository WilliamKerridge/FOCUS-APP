# CLAUDE.md — FOCUS App

Read this file at the start of every session before writing any code.

---

## What This App Is

FOCUS is a Claude-powered personal operating system for William — a single user with ADHD — to manage attention, follow-through, and presence across Work, Transition, and Home contexts. It is not a general task manager. Every design decision has a specific reason. Read the spec (`SPEC.md`) if you need the full context for any feature.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| Hosting | Vercel |
| API calls | Vercel serverless functions only |
| Intelligence | Anthropic API (Claude Sonnet 4) |

**TypeScript is mandatory.** No `any` types. No implicit any. Every function has typed parameters and return types.

---

## Folder Structure

```
/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # shadcn/ui components (do not modify)
│   │   └── focus/         # FOCUS-specific components
│   ├── pages/             # Top-level route pages
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities, Supabase client, helpers
│   ├── types/             # TypeScript type definitions
│   └── api/               # API call helpers (calls to /api/*)
├── api/                   # Vercel serverless functions
│   └── claude.ts          # THE ONLY file that calls the Anthropic API
├── documentation/         # Feature-level documentation (read before building)
├── supabase/
│   └── migrations/        # SQL migration files
└── CLAUDE.md              # This file
```

---

## Non-Negotiable Rules

### Security — enforce always, no exceptions

1. **The Anthropic API key never touches the browser.** All Claude API calls go through `/api/claude.ts` only. If you find yourself importing the Anthropic SDK in any `src/` file, stop and reroute through the serverless function.

2. **Row Level Security is always on.** Every Supabase table has RLS enabled. Every query is scoped to `auth.uid()`. Never query without the user context. Never disable RLS to make a query work.

3. **No secrets in code.** API keys, service role keys, and VAPID keys live in Vercel environment variables only. If a key needs to be in a file, stop and use env vars instead.

4. **Auth gate on every route.** No page or component renders without a valid Supabase session. The `useAuth` hook handles this — use it on every protected page.

### Code quality

5. **Read the relevant documentation file before building any feature.** See the lookup table below. This is not optional — the docs contain business rules Claude cannot infer from the code.

6. **One component, one responsibility.** If a component is doing two things, split it.

7. **No inline Supabase queries in components.** Data fetching lives in hooks (`/src/hooks/`) or in dedicated service files (`/src/lib/`).

8. **Errors surface to the user plainly.** No raw error objects shown to the user. No silent failures. If a Supabase write fails after retries, show a plain message. Log the technical error to the console.

9. **Mobile first.** Every component is built for iPhone screen width first, then desktop. Use Tailwind responsive prefixes (`md:`, `lg:`) to scale up, not down.

10. **Minimal friction always.** Every user-facing interaction should take the minimum number of taps. If something requires three taps, ask whether it can be done in one.

---

## Documentation Lookup Table

Before touching any feature, read the corresponding doc first.

| Working on... | Read this first |
|---------------|----------------|
| Login, session, auth flows | `documentation/01-auth.md` |
| Mode switching (Work/Transition/Home) | `documentation/02-modes.md` |
| Morning kickstart or end-of-day handoff | `documentation/03-morning-kickstart.md` |
| Promises (capture, surface, close) | `documentation/04-promises.md` |
| Focus sessions | `documentation/05-focus-sessions.md` |
| Email Drop Zone | `documentation/06-email-dropzone.md` |
| Notifications (Apple Reminders/Calendar or PWA) | `documentation/07-notifications.md` |
| Claire quality time layer | `documentation/08-claire-layer.md` |
| Streak counters | `documentation/09-streaks.md` |
| Settings page | `documentation/10-settings.md` |

---

## Claude API Usage

All requests to Anthropic go through `/api/claude.ts`. The serverless function:
- Reads `ANTHROPIC_API_KEY` from Vercel environment variables
- Accepts a `{ messages, system }` payload from the frontend
- Returns the Claude response
- Never logs message content

When calling Claude from a feature, pass a system prompt that sets the tone: **direct and brief**. No warm preamble. No filler. Output is structured and actionable.

Example system prompt pattern:
```
You are FOCUS, a personal assistant for William. Be direct and brief. 
No preamble. Return structured output only. [Feature-specific instructions follow.]
```

---

## Database Rules

- All tables: UUID primary keys, `user_id` UUID FK, `created_at` timestamptz, `updated_at` timestamptz
- All migrations live in `/supabase/migrations/` with sequential numbering
- Never alter a migration file after it has been applied — create a new one
- RLS policies follow this pattern: `USING (user_id = auth.uid())`
- The `profiles` table extends Supabase Auth — never store sensitive auth data there

---

## Phase Awareness

We are currently in **Phase 2 (complete)**. Beginning Phase 3.

**Phase 1 — Complete:**
- Project scaffold with auth
- Three mode buttons (Work / Transition / Home)
- Morning kickstart flow (brain dump → Claude → sorted plan card)
- End-of-day handoff (park work, set tomorrow's start)
- Kickstart streak counter (flame icon)
- Notifications via Apple Reminders + Google Calendar MCP

**Phase 2 — Complete:**
- Responsive layout: MobileLayout / DesktopLayout (768px breakpoint)
- Desktop Work mode: two-column layout (plan left, focus right)
- Focus sessions: `SessionPanel` (reusable), `SessionCloseModal`, `AbandonedSessionBanner`, `ReEntryPrompt`
  - Claude generates `start_context` on start (falls back to raw topic if unavailable)
  - Auto-completion fires `SessionCloseModal` when `elapsedSeconds >= plannedSeconds`
  - Abandoned session detection on app load (sessions with no `ended_at` from before today)
  - "Where was I?" re-entry prompt with two-line Claude output
  - Custom duration (25–120 min cap)
- Email Drop Zone (paste email → Claude extracts → confirm → save to tasks)
- Email forwarding via Resend webhook → `email_inbox` table → review screen
- Settings: forwarding address + personal emails config
- Unit tests: Vitest + @testing-library/react (82 tests across 7 files)

**Phase 3 — Next:**
- Promises system (promises table, capture, surface in kickstart)
- Claire quality time layer (Section 19 of spec)
- Web Push / PWA notifications
- Transition ritual notification

---

## Tone — Claude Responses Inside the App

When writing system prompts for Claude API calls within FOCUS features:
- **Direct and brief** — lead with the answer
- No "Great!" or "Sure!" or any affirmation
- No bullet points for single items
- Structured output: main focus first, then context
- Use William's language: "putting Claire first", "parking this", "open loops"

Example of correct tone: `"Focus: Chase Kartech for migration timeline. Behind it: RMA backlog and the Porsche warranty reply."`

Example of incorrect tone: `"Great news! Here's your focus for today: You should probably look at the Kartech situation first as it seems quite important..."`

---

## Before Every Commit

- [ ] TypeScript compiles with no errors (`tsc --noEmit`)
- [ ] All tests pass (`npm test`)
- [ ] No `console.log` left in production code (use `console.error` for genuine errors only)
- [ ] No hardcoded secrets or API keys
- [ ] RLS is enabled on any new table
- [ ] The relevant documentation file has been updated if the feature behaviour changed
- [ ] Mobile layout tested (use browser DevTools iPhone view)
