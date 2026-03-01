# FOCUS

A Personal Operating System for Work, Home & Presence

*Application Specification*

DRAFT v1.6 | February 2026

**Version History**

|             |                                                                                                                                                                                                                                                                                                             |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Version** | **Changes**                                                                                                                                                                                                                                                                                                 |
| v1.0        | Initial specification — purpose, modes, daily rhythm, promises, focus sessions, technology, build sequence                                                                                                                                                                                                  |
| v1.1        | Added: Competitive landscape (Section 11), Gamification layer (Section 12)                                                                                                                                                                                                                                  |
| v1.2        | Added: Email Drop Zone (Section 13), Security & Auth (Section 14), PWA & Notifications (Section 15), Database Schema (Section 16), Onboarding (Section 17), Offline Behaviour (Section 18). Rewrote Section 7 (technology stack changed for multi-device access). All open questions answered and recorded. |
| v1.3        | Phase 1 notification strategy updated: Apple Reminders + Apple Calendar used as interim notification layer in Phase 1. PWA deferred to Phase 2 as the permanent cross-platform solution (future-proofed for Android). Section 10 (build sequence) and Section 15 (PWA) updated accordingly.                 |
| v1.4        | Open question answered: Supabase Auth login email confirmed as will1kerridge@gmail.com (personal Gmail, accessible from all devices).                                                                                                                                                                       |
| v1.5        | Two open questions answered: (1) Working days Mon–Fri, set at onboarding, changeable in settings. (2) Streaks run all 7 days — FOCUS is a whole-life app, not work-only. One open question remains: Vercel URL.                                                                                             |
| v1.6        | Vercel URL: free subdomain confirmed. New section added: Claire Quality Time Layer (Section 19) — private awareness system to help William prioritise and be present with his wife. Wife's name confirmed as Claire. What quality time means defined and recorded.                                          |

## 1. Purpose & Core Problem
FOCUS is a Claude-powered personal application designed to help William manage his attention, follow-through, and presence across three distinct life contexts: Work, Home, and Family time.


> **The core problem this solves**
>
> An ADHD brain holds everything in working memory simultaneously — work tasks, home commitments, writing projects, migration prep, promises made to family. With no external system, every context switch requires full mental reconstruction. Follow-through breaks down. Presence suffers. The partner of an ADHD individual absorbs the unpredictability as anxiety.


FOCUS is not a task manager. It is a reliability engine — designed to make William more consistent and visible to himself and, over time, to his wife. The application offloads the cognitive work of knowing what matters right now, what was promised, and where things were left off.

### 1.1 Design Principles
- Capture is instant and effortless — no filing required in the moment

- Every action is concrete — not 'work on X' but 'do the next specific step of X'

- The app prompts the user — it does not wait to be opened

- Context switching is managed, not fought — the brain will jump, the system catches the thread

- Hyperfocus is protected — deep work sessions are shielded from interruption

- The writing workflow (Notion + Claude skills) is a separate protected domain — FOCUS does not overlap

- Friction is minimised at every step — if it takes too long, it won't get used

## 2. Scope & Boundaries
### 2.1 What FOCUS covers
|                |                                                                                                         |
|----------------|---------------------------------------------------------------------------------------------------------|
| **Domain**     | **What it manages**                                                                                     |
| Work           | Customer service tasks, SAP/S4HANA migration prep, Power BI work, email follow-ups, Cosworth operations |
| Home           | Promises made to family, shared responsibilities, household tasks, things not to forget                 |
| Transitions    | The mental shift between work mode and family mode — a deliberate decompression ritual                  |
| Focus sessions | Deep work blocks — initiating them, protecting them, closing them cleanly                               |
| Waiting for    | Things blocked on others — Kartech responses, customer replies, family decisions                        |
| Work emails    | Paste-in email processing — Claude extracts tasks, actions, and waiting-fors automatically              |

### 2.2 What FOCUS does NOT cover
- The Lion's Gambit writing workflow — this stays in Notion with dedicated Claude skills

- SAP system access or live data — FOCUS manages tasks around SAP work, not within it

- Shared family calendar or wife's visibility — this is phase 2, not v1

- Financial tracking, health logging, or any other life admin domain

- Direct Office 365 integration — corporate IT restrictions prevent OAuth connections


> **Writing boundary**
>
> When a writing focus session is active (set manually in FOCUS), the app suspends all prompts and notifications for that block. The handoff between writing mode and other modes is handled explicitly by the user setting a focus session type of 'Writing'.


## 3. Operating Modes
FOCUS operates in three distinct modes. The user moves between them deliberately — the app does not attempt to detect mode automatically in v1.

|                |                                  |                                                                           |
|----------------|----------------------------------|---------------------------------------------------------------------------|
| **Mode**       | **When active**                  | **Primary purpose**                                                       |
| **WORK**       | During working hours at Cosworth | Sustained focus, task management, customer follow-through, migration prep |
| **TRANSITION** | End of work (~4:00–4:30pm)       | Mental context switch — park work, clear head, show up present            |
| **HOME**       | Evening and weekend family time  | Promises, commitments, shared responsibilities, being present             |

### 3.1 Work Mode
Work mode is the primary daily mode. It manages the complexity of William's role — customer communications, repair management, SAP operations, and the S/4HANA migration — without losing track across context switches.

- Morning kickstart — surfaces today's focus, open items, and one clear starting point

- Re-entry prompt — after any interruption, reconstructs last known position and gives next action

- Task capture — instant capture during conversations, calls, or context switches

- Email Drop Zone — paste any work email; Claude extracts actions, waiting-fors, and deadlines

- Waiting-for tracker — customers, Kartech, colleagues; surfaces stale items automatically

- End-of-day handoff — parks everything cleanly so tomorrow morning starts fast

### 3.2 Transition Mode

> **Why this matters**
>
> An ADHD brain does not automatically switch context when the physical environment changes. Without a deliberate transition, William arrives home but his mind is still solving a work problem. His wife experiences this as absence or disengagement, which feeds her anxiety. A short, structured transition ritual breaks this pattern.


**Trigger — DECIDED**


> **Design decision recorded**
>
> Transition ritual is triggered by a push notification at 4:00pm on working days. William can dismiss (triggers again at 4:30pm) or tap to open the ritual immediately. Manual trigger is always available inside the app regardless of time.


**Transition Mode flow**

- Work parking — any open loops or unfinished thoughts are captured and filed away

- Today's commitments check — what did I promise anyone at home today?

- Presence intention — one short statement of what 'being present' means tonight

- Mode switch confirmation — explicit 'I am home now' that closes work context

### 3.3 Home Mode
Home mode is quieter and simpler. It focuses on the promises, commitments and responsibilities that matter to family life and to William's wife's need for reliability and predictability.

- Promise tracker — things William has said he will do, visible and surfaced gently

- Shared responsibility reminders — household tasks, children, recurring commitments

- Presence check — a gentle nudge if too long has passed without acknowledging family

- Quick capture — something that needs to be remembered without breaking presence

## 4. Daily Rhythm & Touchpoints
FOCUS is built around four natural touchpoints in the day. Each takes five minutes or less. The goal is to make the app feel like a conversation, not a chore.

|                    |                             |                                                      |
|--------------------|-----------------------------|------------------------------------------------------|
| **Touchpoint**     | **When**                    | **What it does**                                     |
| Morning kickstart  | Before starting work        | Brain dump → sorted plan → one clear focus           |
| Re-entry prompt    | After any interruption      | Reconstructs position → gives next action            |
| Transition ritual  | ~4:00pm — push notification | Park loops → check promises → set intention → switch |
| End-of-day handoff | Before stopping work        | Capture done/unfinished → set tomorrow's start       |

### 4.1 Morning Kickstart — detail
The morning kickstart converts overnight mental accumulation into a clear daily plan. The user does a brain dump — anything on their mind — and Claude sorts it.

**Claude returns**

- One main focus for today — the single most important thing

- A short 'if I get to it' list — maximum three items

- Any must-do-today items — deadlines, commitments, time-sensitive

- Flagged promises — anything from the promise tracker that needs attention today

- Yesterday's unfinished thread — the starting point captured from last night

- Overcommitment warning — if the plan is unrealistic for one working day, Claude flags it

### 4.2 Re-entry Prompt — detail
For ADHD, the re-entry prompt may be the most-used feature. Any interruption — a phone call, a colleague, a customer escalation — breaks the thread. Without a system, reconstruction is painful and incomplete.

- Last known position — what was being worked on, at what stage

- The specific next action — not the project, the next physical step

- Any context notes captured before the interruption

## 5. The Promises System

> **Design intent**
>
> This is not a nag system. It surfaces promises gently at the right moment — during the transition ritual and morning kickstart — so nothing is forgotten without creating anxiety in the user.


### 5.1 Promise categories — DECIDED

> **Design decision recorded**
>
> Promises use a single combined 'Family' category in v1. Each promise includes an optional 'Made to' tag (wife / child name) so they can be filtered and reported on separately in v2 without a database migration. The tag is captured at time of logging but not prominently surfaced until v2.


### 5.2 Capturing a promise
Promises are captured with minimal friction. The user types something like 'promised to sort the insurance this week' and FOCUS logs it with the date, optional deadline, and 'Made to' tag.

### 5.3 Surfacing promises
|                      |                                                             |
|----------------------|-------------------------------------------------------------|
| **When surfaced**    | **How**                                                     |
| Morning kickstart    | Any promise due today or overdue is flagged clearly         |
| Transition ritual    | All active promises reviewed — are any relevant to tonight? |
| On request           | User can ask 'what have I promised?' at any time            |
| Approaching deadline | Gentle flag two days before a soft deadline                 |

### 5.4 Closing a promise
When something is done, the user marks it complete. FOCUS logs the date of completion. This builds a visible track record over time — useful for self-confidence and, eventually, shared visibility with his wife in v2.

## 6. Focus Session Management
### 6.1 Starting a focus session
- User declares what they are focusing on, the type (Work / Writing / Migration), and for how long

- FOCUS confirms the session is open and surfaces the specific starting point

- All notifications and prompts are suspended for the session duration — including the transition ritual notification if it falls during a session

- A brief context note is saved — 'what I know about this right now'

### 6.2 Closing a focus session — DECIDED

> **Design decision recorded**
>
> Focus sessions are enforced. If the user tries to close or navigate away before the declared time is up, the app shows a confirmation dialog: 'Your session has [X] minutes remaining. End now or keep going?' This adds discipline without making it punishing — one tap confirms early exit.


On close (confirmed early or at time), FOCUS prompts: where did you get to, what is the next action. This becomes the re-entry point next time. Session duration is logged for pattern data.

## 7. Technology Stack

> **Architecture change from v1.1**
>
> The original spec used Claude.ai artifact storage (window.storage) and built-in API calls. This has been replaced with a deployed web application to support access from work, home, and iPhone. The new stack uses Vercel (hosting), Supabase (database + auth), and a secure serverless function for all Claude API calls.


### 7.1 Full Stack Overview
|                         |                                                                                                                                                                                             |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Layer**               | **Technology & Role**                                                                                                                                                                       |
| Frontend UI             | React 18 + Vite + TypeScript — the app shell running in the browser                                                                                                                         |
| Styling                 | Tailwind CSS + shadcn/ui — pre-built accessible components, consistent design                                                                                                               |
| Hosting                 | Vercel — deploys automatically from GitHub on every push. Free tier.                                                                                                                        |
| API security layer      | Vercel serverless function (/api/claude) — all Claude API calls go through this. The Anthropic API key never reaches the browser.                                                           |
| Database                | Supabase (PostgreSQL) — tasks, promises, streaks, sessions, handoffs. Synced across all devices.                                                                                            |
| Authentication          | Supabase Auth (email + password) — required from Phase 1. Protects all data.                                                                                                                |
| Intelligence            | Anthropic API (Claude Sonnet 4) — called securely via Vercel function                                                                                                                       |
| Notifications — Phase 1 | Apple Reminders + Apple Calendar (via existing MCP connections) — FOCUS writes reminders and calendar blocks; iOS delivers the native notification. Works immediately, no build complexity. |
| Notifications — Phase 2 | Web Push API + PWA (Vite PWA plugin) — permanent cross-platform solution. Works on Android if device changes. Replaces Apple-specific layer.                                                |
| Version control         | GitHub — source of truth, triggers Vercel deployments                                                                                                                                       |
| Writing workflow        | Notion + existing Claude skills — entirely separate, not connected                                                                                                                          |

### 7.2 How the pieces connect
William writes code in Claude Code on his MacBook → pushes to GitHub → Vercel automatically deploys a new version to the live URL → any device (work MacBook, home MacBook, iPhone) opens the same URL → Supabase ensures all data is identical across all devices in real time.

When a touchpoint triggers a Claude response: browser sends request to /api/claude on Vercel → serverless function adds the API key and calls Anthropic → response returns to browser → Supabase is updated with the result. The API key never leaves Vercel's secure environment.

### 7.3 Accounts & costs
|                         |                                                                  |
|-------------------------|------------------------------------------------------------------|
| **Service**             | **Cost**                                                         |
| Vercel                  | Free (Hobby plan — personal projects, unlimited deployments)     |
| Supabase                | Free (up to 500MB storage, 2 projects — years of FOCUS data)     |
| GitHub                  | Free (private repo)                                              |
| Anthropic API           | Pay-as-you-go — estimated £1–3/month at FOCUS usage levels       |
| Claude Pro subscription | Existing — used for building in Claude Code, not for app runtime |

### 7.4 v2 Considerations
- Native iOS app (React Native) — if PWA notifications prove unreliable on iOS

- Shared visibility for wife — read-only view of promises and today's plan

- Notion integration — awareness of writing schedule to auto-protect focus blocks

- BCC email forwarding — emails auto-processed without manual paste (see Section 13)

- Weekly review mode — GTD-style full review of all open loops

- Pattern insights — time-of-day focus quality, promise completion trends

## 8. Design Decisions — Answered & Open
### 8.1 Answered decisions (locked for v1 build)
|                            |                                                                                                                                                                  |
|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Decision**               | **Answer**                                                                                                                                                       |
| Transition ritual trigger  | Push notification at 4:00pm on working days. Dismissible — retriggers at 4:30pm. Manual trigger always available inside the app.                                 |
| Gamification level         | Subtle for v1 — streak counters visible, Claude references them naturally in conversation. No points dashboard. Review after four weeks of use.                  |
| Promises: wife vs children | Single 'Family' category in v1. Each promise has an optional 'Made to' tag captured at logging. Separate filtering available in v2 without a database migration. |
| Focus session enforcement  | Enforced with confirmation dialog. User must tap to confirm early exit. Not punishing — one tap, no penalty.                                                     |
| Claude tone inside the app | Direct and brief. No warm preamble. Example: 'Focus: X. Behind it: A, B. Promise due today: sort the insurance.' Review tone after testing.                      |
| Multi-device access        | Deployed web app on Vercel with Supabase backend. Accessible from work MacBook, home MacBook, and iPhone via browser or PWA install.                             |
| API key security           | All Claude API calls routed through Vercel serverless function. API key stored in Vercel environment variables — never exposed to browser.                       |
| Office 365 integration     | Not possible due to corporate IT restrictions. Email Drop Zone (Section 13) replaces direct integration.                                                         |

### 8.2 All decisions answered — spec complete

> **Answered — login email**
>
> Supabase Auth account will use will1kerridge@gmail.com — personal Gmail, accessible from work MacBook, home MacBook, and iPhone. Password reset emails will go here.


> **Answered — working days**
>
> Monday to Friday. Set explicitly during onboarding (pre-selected but adjustable). Changeable at any time in Settings — important for periods like holiday, remote working, or schedule changes. Controls which days the 4:00pm transition notification fires.


> **Answered — streak counters**
>
> Streaks run all 7 days, not weekdays only. FOCUS is a whole-life application — the promises system, presence intention, and home mode commitments apply every day. A missed day on any day of the week breaks the streak.


> **Answered — Vercel URL**
>
> Free Vercel subdomain. Name to be chosen at first Claude Code session (e.g. focus-william.vercel.app). No custom domain required.


## 9. Success Criteria
### 9.1 Personal (William)
- He starts the working day with a clear single focus rather than staring at a blank screen

- Context switches at work cost less time and mental energy to recover from

- He arrives home and is mentally present within 10 minutes of walking through the door

- He no longer forgets things he has genuinely committed to

### 9.2 Relationship
- His wife experiences him as more reliable and predictable

- She hears fewer apologies for forgotten commitments

- He is visibly present during family time rather than mentally elsewhere

- She can, over time, opt into seeing shared commitments (v2)

### 9.3 System
- He uses it every working day for at least the morning kickstart and transition ritual

- The promises tracker has active entries — it is being used, not just set up

- After four weeks, it feels like a habit rather than a tool he has to remember to use

- No API key exposure or security incidents

## 10. Proposed Build Sequence
Each phase is usable before the next begins. The most critical features — kickstart and transition ritual — are proven first.

|              |                                                                                                                                                                                                                                                                                          |                                                                                                                          |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| **Phase**    | **What gets built**                                                                                                                                                                                                                                                                      | **Goal**                                                                                                                 |
| Phase 1      | Project scaffold (Vite + React + Supabase + Vercel + Auth), three mode buttons, morning kickstart, end-of-day handoff, basic streak counter. Notifications via Apple Reminders + Apple Calendar MCP — writes the 4:00pm transition reminder and promise deadlines as native iOS entries. | Working app on real URL, accessible from all devices. Notifications working on iPhone immediately via Apple's ecosystem. |
| Phase 2      | Promises system, re-entry prompt, focus sessions (enforced), Email Drop Zone v1 (paste). PWA layer added — Vite PWA plugin, VAPID keys, Web Push notifications. Replaces Apple-specific notification layer with permanent cross-platform solution.                                       | Reliability and follow-through loop proven. App future-proofed for Android.                                              |
| Phase 3      | Transition ritual refinement, Home mode polish, presence check, onboarding improvements                                                                                                                                                                                                  | Prove the relationship impact                                                                                            |
| Phase 4      | Gamification review, weekly review mode, pattern insights, polish                                                                                                                                                                                                                        | Make it sustainable long-term                                                                                            |
| Phase 5 (v2) | Shared visibility for wife, BCC email forwarding, Notion awareness, Android testing                                                                                                                                                                                                      | Extend to relationship layer                                                                                             |

## 11. Competitive Landscape

> **Purpose of this section**
>
> Research conducted before build to understand what already exists, what works, what doesn't, and what FOCUS uniquely provides.


### 11.1 Key Apps Reviewed
|                    |                                                                     |                                                                |                                                      |
|--------------------|---------------------------------------------------------------------|----------------------------------------------------------------|------------------------------------------------------|
| **App**            | **Strengths**                                                       | **Weaknesses**                                                 | **Relevant to FOCUS**                                |
| **Amazing Marvin** | Customisable strategies, Procrastination Wizard, ADHD-praised       | No transition ritual, no relationship/promise layer, no AI     | Procrastination Wizard → re-entry prompt pattern     |
| **Tiimo**          | iPhone App of Year 2025, visual timeline, AI brain dump             | No relationship layer, no transition ritual, no mode switching | Visual timeline concept (v2)                         |
| **Hero Assistant** | ADHD + couples + parents all-in-one, daily briefings                | Generic intelligence, no mode switching, no transition ritual  | Validates all-contexts-in-one vision                 |
| **Sunsama**        | Guided daily planning ritual, overcommitment warning                | Work-only, no relationship layer, expensive                    | Overcommitment warning → morning kickstart feature   |
| **Habitica**       | 1.5M users, best-in-class gamification, no competitive leaderboards | Full RPG feels juvenile, no AI, no context switching           | Streak + completion mechanics for FOCUS gamification |

### 11.2 What FOCUS Does That Nothing Else Does
|                                                         |                                                                                                                  |
|---------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| **Unique feature**                                      | **Why no existing app does it properly**                                                                         |
| Three-mode context switching (Work / Transition / Home) | All apps are either work-focused or life-admin. None manage the transition between them as a neurological event. |
| Transition ritual as a relationship intervention        | No app addresses the ADHD/OCD partner dynamic or mental non-presence at home.                                    |
| Promises system with completion track record            | Shared task apps exist. None are designed around rebuilding trust through a verifiable record.                   |
| Claude as intelligence layer (not rules/algorithms)     | Every other app uses static logic. Claude understands context, nuance, and intent.                               |
| Email Drop Zone for corporate environments              | No app addresses the reality of corporate IT restrictions preventing OAuth connections.                          |

## 12. Gamification Layer

> **Design decision recorded**
>
> v1 uses subtle gamification only — streak counters are visible, Claude references them naturally in responses. No points dashboard, no milestone popups. Review after four weeks of real use before deciding whether to add more.


### 12.1 The neuroscience case
Gamification works by releasing dopamine into the brain's reward circuit (the mesolimbic pathway). ADHD brains have lower baseline dopamine, meaning tasks without immediate payoff feel invisible — not difficult, literally invisible to the motivational system. Streaks and completion signals bridge this gap in the critical first 4–6 weeks before habits form.

### 12.2 v1 Gamification mechanics (subtle)
|                          |                                                                                                                                   |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **Mechanic**             | **Implementation**                                                                                                                |
| Morning kickstart streak | Day counter visible on home screen. Updates after each completed kickstart.                                                       |
| Transition ritual streak | Separate counter. The hardest habit — tracking it separately gives it appropriate weight.                                         |
| Promise completion rate  | Rolling 30-day percentage displayed quietly below the promise list.                                                               |
| Focus session streak     | Consecutive days with at least one logged focus block.                                                                            |
| Claude references        | In kickstart and handoff responses, Claude mentions streaks naturally: 'You've done the transition ritual 9 of the last 10 days.' |

### 12.3 What is explicitly excluded from v1
- Full RPG aesthetics — no avatars, loot, character damage, or boss fights

- Punishment mechanics — no HP loss or penalty for missed days

- Points dashboard — numbers visible only to Claude for its natural references

- Leaderboards — FOCUS is personal, there is no competitive dimension

## 13. Email Drop Zone

> **Why this exists**
>
> Direct Office 365 integration is not possible due to corporate IT restrictions at Cosworth. The Email Drop Zone replaces it — a frictionless way to get email content into FOCUS without any IT involvement, OAuth tokens, or system access.


### 13.1 How it works — v1 (paste)
A dedicated area inside Work Mode. William pastes the content of any email he wants FOCUS to act on. Claude reads it and automatically produces a structured response.

|                                       |                                                                |
|---------------------------------------|----------------------------------------------------------------|
| **What Claude extracts**              | **Where it goes in FOCUS**                                     |
| Action required from William          | Added to today's task list with priority                       |
| Something waiting on another person   | Added to waiting-for tracker with their name                   |
| A commitment or deadline mentioned    | Added to task list with date                                   |
| A promise made in the email thread    | Added to promises system with recipient                        |
| A customer or Kartech response needed | Added to waiting-for, flagged as time-sensitive if appropriate |

**User flow**

- User opens Work Mode → taps 'Email Drop Zone'

- Pastes email content (or types a summary if forwarding isn't practical)

- Claude responds in seconds with extracted items

- User confirms or edits before items are saved — one-tap approval or individual editing

- Original email text is not stored — only the extracted structured items


> **Design note**
>
> The confirmation step is important. Claude will sometimes mis-extract or over-extract from emails. Showing the proposed items before saving means William stays in control and builds trust in the feature. If Claude gets it right 90% of the time, the 10% only takes a second to fix.


### 13.2 v2 — BCC forwarding (automatic)
A more advanced option for v2: a dedicated FOCUS email address (e.g. focus@william-focus.com via a free Mailgun account). William BCCs this address on any email he wants processed. A Supabase Edge Function receives it, extracts the content, runs it through Claude, and the items appear in FOCUS automatically — no manual pasting.

|                                    |                                                                                        |
|------------------------------------|----------------------------------------------------------------------------------------|
| **v2 BCC approach — requirements** | **Detail**                                                                             |
| Email receiving service            | Mailgun (free tier — 1,000 emails/month, more than sufficient)                         |
| Processing function                | Supabase Edge Function (already in stack, no additional cost)                          |
| Corporate email compatibility      | BCC from Outlook works natively — no IT involvement, no OAuth, no permissions required |
| Build complexity                   | Moderate — approximately 2–3 hours additional work in Phase 4 or 5                     |

## 14. Security & Authentication

> **Why this is a Phase 1 requirement, not a later addition**
>
> The app will be deployed to a public URL from day one. Without authentication, anyone who discovers the URL can view William's tasks, promises, and handoffs. Without API key protection, the Anthropic key could be extracted from browser DevTools within minutes of launch. Both must be in place before the first deployment.


### 14.1 Authentication — Supabase Auth
Supabase Auth handles login with email and password. No third-party identity providers (no Google login, no Apple login) — simpler and avoids dependency on corporate email. William creates one account with a personal email address.

|                     |                                                                                        |
|---------------------|----------------------------------------------------------------------------------------|
| **Auth behaviour**  | **Detail**                                                                             |
| First visit         | Login screen. No public access to any part of the app.                                 |
| Session persistence | User stays logged in on trusted devices (MacBook, iPhone) — no daily re-login required |
| Work MacBook        | Log in once. Session persists unless manually logged out.                              |
| iPhone              | Log in once after installing as PWA. Session persists.                                 |
| New device          | Full login required. Email + password.                                                 |
| Password recovery   | Supabase sends reset email to registered personal email address                        |

### 14.2 API Key Security — Vercel Serverless Function
All calls to the Anthropic API are routed through a Vercel serverless function at /api/claude. The function lives server-side and has access to environment variables that are never sent to the browser.


> **✗ Without the serverless function**
>
> API key stored in frontend code → anyone opens DevTools → key visible → key stolen → charges accumulate on William's Anthropic account ✓ With the serverless function Browser sends request to /api/claude on Vercel → serverless function adds API key securely → calls Anthropic → returns result. Key never leaves Vercel.


### 14.3 Database Security — Supabase Row Level Security
Supabase uses Row Level Security (RLS) to ensure that even if someone knew the Supabase project URL, they could only access rows that belong to their authenticated user ID. This is enforced at the database level — not just in the application code.

- All tables have RLS enabled from the first database migration

- Every row includes a user_id column linked to Supabase Auth

- Policies enforce: SELECT, INSERT, UPDATE, DELETE only where user_id = authenticated user

- This means William's data is protected even if the Supabase anon key is visible in the browser (it is public by design)

## 15. PWA & Push Notifications

> **Two-phase notification strategy**
>
> Phase 1 uses Apple Reminders and Apple Calendar as the notification layer — fast to build, reliable on iPhone, no additional infrastructure. Phase 2 replaces this with a full PWA implementation, which is cross-platform and works identically on Android. This decision future-proofs FOCUS against a device change without delaying Phase 1.


### 15.1 Phase 1 — Apple native integrations
FOCUS uses the existing MCP connections to Apple Reminders and Google Calendar to deliver notifications in Phase 1. When an event needs to notify William, FOCUS writes an entry into Apple's ecosystem and iOS handles the notification natively — badge counts, lock screen alerts, Siri awareness included.

|                                             |                                                                                  |
|---------------------------------------------|----------------------------------------------------------------------------------|
| **What gets written**                       | **Where**                                                                        |
| 4:00pm transition ritual reminder (Mon–Fri) | Apple Reminders — 'FOCUS: Time to transition' with time-based alert              |
| Promise deadline approaching (48hrs)        | Apple Reminders — 'FOCUS: \[promise\] due \[date\]'                              |
| Focus session block                         | Google Calendar — blocks time visually across all calendar views and Apple Watch |
| Morning kickstart nudge (optional)          | Apple Reminders — 'Start your morning kickstart' at user-defined time            |


> **Advantages of this approach for Phase 1**
>
> Zero additional infrastructure. No VAPID keys, no service worker, no iOS PWA installation required. Notifications arrive via the same channel as every other iPhone alert. Apple Reminders syncs across all Apple devices automatically. Build time: hours, not days.


**Limitations to acknowledge**

- If William switches to Android, Apple Reminders and iCloud stop working — this is why Phase 2 replaces this layer

- Notifications appear as Reminders or Calendar alerts, not branded FOCUS notifications

- Customisation of notification style is limited to what Apple Reminders supports

- FOCUS cannot track whether a notification was acted on — just that it was sent

### 15.2 Phase 2 — PWA (permanent cross-platform solution)
Phase 2 implements a full Progressive Web App layer, replacing the Apple-specific integrations with a solution that works identically on iPhone, Android, and any future device. This is the correct long-term architecture.

**What PWA unlocks**

- Branded FOCUS push notifications — not Apple Reminders, not Calendar alerts — direct from the app

- Full Android support — Web Push has worked on Android Chrome since 2015, better supported than on iOS

- Device independence — move to any smartphone and the experience is identical

- Install to home screen on any device — FOCUS icon, full-screen, no browser chrome

- Offline caching — the app shell loads without internet; inputs queue for sync on reconnect

**What gets built in Phase 2**

- vite-plugin-pwa added to Vite configuration — handles manifest and service worker automatically

- VAPID key pair generated — stored in Vercel environment variables

- Push subscription stored in Supabase push_subscriptions table per device

- Vercel serverless function extended to send Web Push messages

- Scheduled function (Vercel Cron) triggers 4:00pm notification on working days

- Apple Reminders / Calendar entries retired — Phase 2 notifications take over

- iPhone installation guide added to onboarding (must use Safari, not Chrome, on iOS)


> **iOS important note**
>
> On iPhone, Web Push only works if FOCUS has been installed as a PWA via Safari's 'Add to Home Screen'. Chrome on iOS does not support PWA installation. The Phase 2 onboarding update will guide William through this step explicitly.


## 16. Database Schema (Supabase / PostgreSQL)
This replaces the key-value storage model from Section 7.2 of v1.1. All tables use UUID primary keys and include user_id for Row Level Security. Created_at and updated_at timestamps are included on all tables.

### 16.1 Table: users (managed by Supabase Auth)
Supabase Auth manages the users table automatically. FOCUS adds a profiles table for app-specific user settings.

|                     |                        |                                                                                                                                               |
|---------------------|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Column**          | **Type**               | **Purpose**                                                                                                                                   |
| id                  | UUID (FK → auth.users) | Links to Supabase Auth user                                                                                                                   |
| work_days           | text\[\]               | Working days — default \['Mon','Tue','Wed','Thu','Fri'\]. Set at onboarding, editable in Settings. Controls transition notification schedule. |
| transition_time     | time                   | Default 16:00 — adjustable per user                                                                                                           |
| gamification_level  | text                   | 'subtle' in v1                                                                                                                                |
| tone                | text                   | 'direct' in v1                                                                                                                                |
| onboarding_complete | boolean                | Controls whether onboarding flow shows                                                                                                        |

### 16.2 Table: tasks
|                    |             |                                                      |
|--------------------|-------------|------------------------------------------------------|
| **Column**         | **Type**    | **Purpose**                                          |
| id                 | UUID PK     | Unique identifier                                    |
| user_id            | UUID FK     | Row Level Security                                   |
| title              | text        | The task description                                 |
| context            | text        | 'work' | 'home' | 'waiting_for'                    |
| priority           | text        | 'focus' | 'if_time' | 'must_today'                 |
| status             | text        | 'open' | 'done' | 'parked'                         |
| waiting_for_person | text        | Nullable — name of person being waited on            |
| due_date           | date        | Nullable                                             |
| source             | text        | 'kickstart' | 'reentry' | 'email_drop' | 'manual' |
| completed_at       | timestamptz | Nullable                                             |

### 16.3 Table: promises
|              |             |                                                                                                     |
|--------------|-------------|-----------------------------------------------------------------------------------------------------|
| **Column**   | **Type**    | **Purpose**                                                                                         |
| id           | UUID PK     | Unique identifier                                                                                   |
| user_id      | UUID FK     | Row Level Security                                                                                  |
| title        | text        | The promise description                                                                             |
| made_to      | text        | Nullable tag — e.g. 'wife', child name. Not prominently displayed in v1 but stored for v2 filtering |
| due_date     | date        | Nullable soft deadline                                                                              |
| status       | text        | 'active' | 'completed' | 'archived'                                                               |
| completed_at | timestamptz | Nullable — logged for completion track record                                                       |

### 16.4 Table: handoffs
|            |          |                                                                          |
|------------|----------|--------------------------------------------------------------------------|
| **Column** | **Type** | **Purpose**                                                              |
| id         | UUID PK  | Unique identifier                                                        |
| user_id    | UUID FK  | Row Level Security                                                       |
| type       | text     | 'morning_kickstart' | 'end_of_day' | 'transition'                      |
| content    | jsonb    | Structured output from Claude — main focus, task list, next action, etc. |
| raw_input  | text     | The brain dump or input text — for context in next session               |
| date       | date     | The working day this belongs to                                          |

### 16.5 Table: focus_sessions
|                       |          |                                                  |
|-----------------------|----------|--------------------------------------------------|
| **Column**            | **Type** | **Purpose**                                      |
| id                    | UUID PK  | Unique identifier                                |
| user_id               | UUID FK  | Row Level Security                               |
| type                  | text     | 'work' | 'writing' | 'migration'               |
| planned_duration_mins | integer  | What William declared at start                   |
| actual_duration_mins  | integer  | Actual time — may differ if confirmed early exit |
| start_context         | text     | What Claude recorded as the starting context     |
| end_context           | text     | Where user got to — becomes next re-entry point  |
| exited_early          | boolean  | Whether the confirmation dialog was used         |
| date                  | date     | Working day                                      |

### 16.6 Table: streaks
|                     |          |                                                            |
|---------------------|----------|------------------------------------------------------------|
| **Column**          | **Type** | **Purpose**                                                |
| id                  | UUID PK  | Unique identifier                                          |
| user_id             | UUID FK  | Row Level Security                                         |
| streak_type         | text     | 'kickstart' | 'transition' | 'focus' | 'promise_rate'   |
| current_streak      | integer  | Current consecutive day count                              |
| longest_streak      | integer  | All-time best                                              |
| last_completed_date | date     | Used to determine if today's activity counts toward streak |

### 16.7 Table: push_subscriptions (Phase 2)
This table is not required in Phase 1 — Apple Reminders and Calendar handle notifications natively. Created in Phase 2 when PWA Web Push is implemented.

|              |          |                                                             |
|--------------|----------|-------------------------------------------------------------|
| **Column**   | **Type** | **Purpose**                                                 |
| id           | UUID PK  | Unique identifier                                           |
| user_id      | UUID FK  | Row Level Security                                          |
| subscription | jsonb    | Web Push subscription object from browser — endpoint + keys |
| device_label | text     | e.g. 'iPhone', 'Work Mac' — for diagnostics                 |
| is_active    | boolean  | Whether this subscription is still valid                    |

## 17. First-Run Onboarding
Onboarding only runs once — when onboarding_complete is false in the user's profile. It collects the minimum information needed for FOCUS to work intelligently from day one.

### 17.1 Onboarding flow
|                     |                                                                                         |                                                                                |
|---------------------|-----------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| **Step**            | **What it asks**                                                                        | **Why**                                                                        |
| 1 — Welcome         | Brief intro: what FOCUS is and what it will do. No input required.                      | Sets the right expectation — reliability engine, not task manager              |
| 2 — Working days    | Which days are working days? (Mon–Fri pre-selected, toggleable)                         | Controls transition notification schedule. Changeable at any time in Settings. |
| 3 — Transition time | What time do you usually finish work? (4:00pm pre-filled)                               | Sets the notification time. Adjustable any time in settings.                   |
| 4 — First promise   | Optional: 'Is there anything you've already promised someone this week?' Quick capture. | Gets the promises system populated immediately — makes the value tangible      |
| 5 — iPhone install  | If on mobile Safari: prompt to install as PWA and grant notifications                   | Required for transition ritual push notification to work on iPhone             |
| 6 — Done            | You're set up. Claude says one direct sentence about what happens at 4pm today.         | Ends onboarding with a concrete, near-future expectation                       |


> **Tone note**
>
> Onboarding is the only place where Claude is slightly warmer than its default direct tone — it's introducing itself. After onboarding completes, all interactions revert to the direct, brief style agreed for v1.


## 18. Offline Behaviour
William works in motorsport and may be at circuits or events with unreliable connectivity. FOCUS should degrade gracefully rather than failing silently.

|                                                 |                                                                                                                                                             |
|-------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Scenario**                                    | **Behaviour**                                                                                                                                               |
| No internet — app opened                        | PWA service worker serves the cached app shell. App loads and displays last-synced data clearly marked 'Last updated \[time\]'.                             |
| No internet — user tries to submit a brain dump | Input is accepted and queued locally. A banner shows: 'No connection — this will sync when you're back online.' Queue processes automatically on reconnect. |
| No internet — Claude response needed            | Cannot process — Claude requires internet. App shows: 'Claude is not available offline. Your input has been saved.' Does not lose the user's typed content. |
| Intermittent connection — Supabase write fails  | Retry with exponential backoff (3 attempts). If all fail, queue for next session. User is not shown a technical error.                                      |
| Push notification arrives — app not open        | Standard OS notification behaviour. Tapping opens FOCUS directly to the relevant screen (transition ritual or promise reminder).                            |

## 19. Claire Quality Time Layer

> **What this is and what it is not**
>
> This is not an intimacy tracker or a score. It is a private awareness system that helps William notice, in real time, whether he is genuinely prioritising Claire — not just being in the same room, but being present, attentive, and putting her first. The data stays entirely private to William in v1. Claude surfaces it as quiet, natural awareness — not judgment, not a nag.


### 19.1 The core problem it solves
From William's perspective, he is present at home. From Claire's perspective, William is prioritising other things — the migration project, writing, the phone, work email — over her. Both are true simultaneously. The ADHD brain defaults to whatever is most stimulating, and Claire, as a constant in the environment, loses out to novelty without William consciously choosing that. This layer makes the pattern visible to William before Claire has to say anything.

### 19.2 What quality time means — defined

> **Design anchor**
>
> Quality time with Claire means: sitting together in the evening without a phone or laptop open, having a proper conversation, asking about her day and genuinely listening, and making her feel like the most important thing in the room. It is about attention, not activity.


### 19.3 How it works in Home Mode
A single quiet question appears in the Home Mode evening check-in — after the transition ritual has completed and William is in home context. It is not a separate feature or a separate screen. It lives naturally within the end-of-evening touchpoint.


> **The question Claude asks**
>
> "Did you spend any intentional time with Claire this evening — phone down, conversation, properly with her?" — Yes / Not tonight / Partially


|              |                                                                                                                                   |
|--------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **Response** | **What FOCUS does with it**                                                                                                       |
| Yes          | Logged quietly. No fanfare, no streak counter shown. Claude acknowledges briefly: 'Good. That matters.'                           |
| Not tonight  | Logged. No judgment. If this is a pattern, Claude surfaces it in the morning kickstart.                                           |
| Partially    | Logged as partial. Claude may ask a follow-up: 'What got in the way?' — not to lecture, but to build pattern awareness over time. |

### 19.4 How Claude surfaces the pattern
Claude does not display a dashboard, a streak, or a score for this. It surfaces awareness naturally in conversation — in the morning kickstart, the transition ritual, or the Home Mode check-in — when the pattern warrants it. The tone is always direct and non-judgmental, consistent with the app's agreed voice.

|                                                |                                                                                                                                               |
|------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Scenario**                                   | **What Claude says**                                                                                                                          |
| Three evenings in a row without quality time   | Morning kickstart: 'It has been a few evenings since you had proper time with Claire. Worth being intentional about it tonight.'              |
| William has mentioned a busy work week ahead   | Transition ritual: 'Big week coming. Claire will notice if you arrive home distracted every night. What is one thing you can do differently?' |
| Good run of quality evenings                   | Morning kickstart, naturally: 'You have been putting Claire first this week. That matters more than you might think.'                         |
| William marks 'Partially' three times in a row | Claude asks once: 'What keeps getting in the way in the evenings?' — then remembers the answer for future context.                            |

### 19.5 Design rules for this feature
- Claude never uses a score, rating, percentage, or numerical target for quality time — this is not fitness tracking

- The question is asked once per evening in the check-in, never more than once

- If William skips the check-in entirely, the day is not counted as a failure — it is simply not logged

- Claude surfaces the pattern at most once per day, in whichever touchpoint is most natural

- The language is always William's language — 'putting Claire first', 'being present', 'properly with her' — not clinical or technical

- No punishment mechanics — a missed evening is not a broken streak, it is information

### 19.6 Database — addition to handoffs table
Quality time data is stored as a field within the existing handoffs table for the end-of-day entry. No new table required.

|                             |                                                                                        |
|-----------------------------|----------------------------------------------------------------------------------------|
| **Field added to handoffs** | **Detail**                                                                             |
| claire_quality_time         | text — 'yes' | 'no' | 'partial' | null (null if evening check-in was not completed) |
| claire_blocker              | text — nullable — what William said got in the way, if he answered the follow-up       |

### 19.7 v2 — Involving Claire

> **Future option — not in v1 scope**
>
> If the system works and William chooses to involve Claire, v2 could offer her a read-only view of the quality time log and the promises made to her. Seeing that William has built a system deliberately designed around prioritising her — and that he uses it — could itself be meaningful evidence of change. This decision belongs to William and Claire together, not to the spec.


*— End of Specification v1.6 —*

*v1.6 — February 2026 — Specification complete. Ready for Claude Code build.*
