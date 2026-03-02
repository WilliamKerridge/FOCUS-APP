# Email Drop Zone — `documentation/06-email-dropzone.md`

## Overview

The Email Drop Zone is a paste-in tool inside Work Mode. William copies an email from Outlook and pastes it here. Claude reads it and extracts actionable items — tasks, waiting-fors, deadlines, and promises — which William confirms before they are saved.

This exists because direct Office 365 integration is blocked by Cosworth's corporate IT policies. No OAuth, no Graph API, no email access — just paste.

**This is a Phase 2 feature.** Do not build it during Phase 1.

---

## Data Model

No new table. Extracted items are saved to existing tables:

| Extracted item type | Saved to |
|--------------------|----------|
| Action for William | `tasks` table, `source = 'email_drop'` |
| Waiting for a person | `tasks` table, `context = 'waiting_for'`, `source = 'email_drop'` |
| Deadline or date-bound task | `tasks` table with `due_date` |
| Promise made in the email | `promises` table |

The original email text is **never stored**. Only the extracted structured items are persisted.

---

## User Flow

### Step 1 — Entry point

In Work Mode, a button: `"Process an email"`. Tapping opens the drop zone view.

### Step 2 — Paste

A large text area. Placeholder: `"Paste the email here — the whole thread if needed."`

A secondary optional field: `"Who is this from / what's the context?"` — helps Claude with ambiguous emails.

### Step 3 — Claude extracts

POST to `/api/claude` with the pasted email content and optional context note.

Claude returns a structured JSON:

```typescript
interface EmailExtraction {
  actions: {
    title: string
    priority: 'focus' | 'if_time' | 'must_today'
    due_date: string | null     // ISO date string or null
  }[]
  waiting_for: {
    title: string
    person: string              // Who William is waiting on
    time_sensitive: boolean
  }[]
  promises: {
    title: string
    made_to: string | null
    due_date: string | null
  }[]
  summary: string               // One sentence: what this email is about
}
```

### Step 4 — Confirmation screen

Show the extracted items as a review screen. William sees:

```
EMAIL: [summary]

ACTIONS FOR YOU
☑ [action title] — [priority] [due date if present]
☑ [action title]

WAITING FOR
☑ [person] — [what William is waiting on]

PROMISES
☑ [promise title]

[ Save all ]   [ Edit ]
```

All items are pre-checked. William can uncheck any item to exclude it, or tap an item to edit it before saving.

### Step 5 — Save

On confirm:
- All checked actions → `tasks` table
- All checked waiting-fors → `tasks` table with `context = 'waiting_for'`
- All checked promises → `promises` table

Clear the text area. Show: `"[N] items saved."` Return to Work Mode.

---

## Business Rules

- **Confirmation is mandatory**: Items must never be saved automatically without William reviewing them. Claude mis-extracts — the review step is the safety net.
- **Email text is not stored**: Once extraction is complete, the email text is discarded. Only the structured items persist.
- **One email at a time**: The drop zone processes one paste per session. There is no batch mode.
- **Email threads**: Claude can handle full email threads (multiple messages). It extracts from the most recent context but considers the history.
- **Time-sensitive waiting-fors**: If `time_sensitive = true`, the task is given `priority = 'must_today'` automatically.
- **Promises**: Only promises explicitly made by William are extracted (e.g. "I'll get back to you by Friday"). Things promised to William by others are extracted as waiting-fors, not promises.

---

## v2 — Forward/BCC Routing

In v2, William forwards or BCCs emails to a special FOCUS address. The email is parsed and items appear in FOCUS ready for review — no manual pasting required.

**Context is determined automatically by sender address:**
- Work email (any address not in the personal list) → `context: 'work'`
- `will1kerridge@gmail.com` → `context: 'home'`
- `will1kerridge@aol.com` → `context: 'home'`
- Unrecognised address → `context: 'work'`, flagged for review

Personal email addresses are configurable in Settings.

**Architecture:**
- **Resend** (free inbound tier) receives the email and POSTs parsed content to `api/email.ts`
- `api/email.ts` (Vercel serverless) checks sender, calls Claude extraction, writes to `email_inbox` table
- A badge appears on Work or Home mode when items are waiting for review
- Same mandatory confirmation flow applies — nothing saves automatically

**New table required:** `email_inbox` — see `docs/plans/2026-03-02-responsive-desktop-design.md` for schema.

**The forwarding address is shown in Settings** so William can save it as an Outlook contact.

Do not build v2 forwarding in Phase 2. It is Phase 2 work scheduled after the paste flow is live and the desktop layout is in place.

---

## Edge Cases

- **Email is too long**: No hard limit. Claude handles long threads. Do not truncate on the frontend.
- **Nothing extractable**: Claude returns empty arrays. Show: `"Nothing actionable found in this email."` Do not save anything.
- **Claude API unavailable**: Show: `"Claude is unavailable — copy the key actions manually."` Do not lose the pasted text — keep it in the text area so William can read it.
- **Pasted content is not an email**: Claude will return what it can. If the content is clearly not an email (e.g. a random paste), Claude returns a `summary` noting this, with empty extraction arrays. Show the summary and let William dismiss.
- **Duplicate with existing task**: No deduplication logic. If an action is already in the task list, it will appear again. William sees it in the confirmation screen and can uncheck it.
