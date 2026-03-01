# Claire Quality Time Layer — `documentation/08-claire-layer.md`

## Overview

This feature helps William notice whether he is genuinely prioritising Claire — not just being in the same house, but being present, attentive, and putting her first. It is a private awareness system, not a tracker or a score.

**This is a Phase 2 feature.** Do not build it during Phase 1.

---

## What This Feature Is Not

- Not an intimacy tracker
- Not a score or rating system
- Not a streak (no counter shown to the user)
- Not something Claire sees in v1 — entirely private to William
- Not a nag — the question is asked once, not repeated

---

## What Quality Time Means (Defined)

Quality time with Claire means: sitting together in the evening without a phone or laptop open, having a proper conversation, asking about her day and genuinely listening, and making her feel like the most important thing in the room.

**It is about attention, not activity.** They do not need to be doing something together — they need to be present with each other.

When Claude asks the question or surfaces a pattern, it uses William's language: `"putting Claire first"`, `"properly with her"`, `"phone down"`. Never clinical terms.

---

## Data Model

No new table. Two fields added to the existing `handoffs` table:

```sql
alter table handoffs add column claire_quality_time text 
  check (claire_quality_time in ('yes', 'no', 'partial'));

alter table handoffs add column claire_blocker text;
-- claire_blocker: what William said got in the way, if he answered the follow-up question
```

These fields are only populated on `handoffs` rows with `type = 'end_of_day'` or `type = 'transition'`.

---

## The Evening Question

Appears once in the Home Mode evening check-in, after the transition ritual has completed. It is embedded naturally in the end-of-evening touchpoint — not a separate screen.

**The question:**
> "Did you spend any intentional time with Claire this evening — phone down, conversation, properly with her?"

**Three response options** (not yes/no — three matters):

| Response | Meaning | What FOCUS does |
|----------|---------|----------------|
| Yes | Genuine quality time happened | Log `claire_quality_time = 'yes'`. Acknowledge: `"Good. That matters."` Nothing more. |
| Not tonight | No intentional time | Log `claire_quality_time = 'no'`. No judgment. No immediate response. Pattern surfaced later if recurring. |
| Partially | Something but not fully present | Log `claire_quality_time = 'partial'`. Claude may ask once: `"What got in the way?"` — save response to `claire_blocker`. |

**The question is asked exactly once per evening.** If William dismisses or closes the app without answering, `claire_quality_time` remains null for that day. Null is not treated as a failure — it is simply no data.

---

## How Claude Surfaces the Pattern

Claude surfaces awareness naturally, in existing touchpoints, when the pattern is notable. It does not create new interruptions for this. The surfacing is guided by the data in `handoffs.claire_quality_time`.

Claude checks the last 7 days of `end_of_day` handoffs where `claire_quality_time` is not null.

| Pattern | Where surfaced | What Claude says |
|---------|---------------|-----------------|
| 3+ consecutive `no` or `partial` | Morning kickstart | `"It has been a few evenings since you had proper time with Claire. Worth being intentional about it tonight."` |
| Busy week mentioned in kickstart + recent `no` streak | Transition ritual | `"Big week coming. Claire will notice if you arrive home distracted every night. What is one thing you can do differently?"` |
| 5+ consecutive `yes` | Morning kickstart (naturally, not every time) | `"You have been putting Claire first this week. That matters more than you might think."` |
| 3+ consecutive `partial` | Once, in morning kickstart | `"What keeps getting in the way in the evenings?"` — saves answer as context for future responses |

**Limits on surfacing:**
- Surfaced at most once per day
- In the most natural touchpoint available, not forced into an unrelated flow
- Never the same message twice in a row

---

## Design Rules (Non-Negotiable)

1. **No score, rating, or percentage displayed** — ever. This is not fitness tracking.
2. **No streak counter for Claire quality time** — even though the data supports it. A streak implies a target. Claire is not a target.
3. **The question is asked once per evening** — never more than once in the same day.
4. **Null = no data, not failure** — if William skips the check-in, nothing negative is inferred.
5. **Language is always William's language** — `"putting Claire first"`, `"properly with her"`, `"phone down"`. Never `"intimacy score"`, `"connection metric"`, or any clinical framing.
6. **No punishment** — a missed evening is information, not a broken streak.
7. **Private to William in v1** — no shared views, no export, no visibility to Claire.

---

## v2 — Involving Claire

If the system works and William chooses to involve Claire, v2 could offer her a read-only view:
- The quality time log (she sees the pattern, not individual night scores)
- Promises made to her specifically (using `promises.made_to = 'Claire'`)

This is a decision for William and Claire together. It is not in the current spec scope. When building v2, revisit whether the data model needs extending for shared access.

---

## Edge Cases

- **Home Mode not entered today**: The question is never asked — it only appears in the Home Mode evening check-in. If William stays in Work Mode all evening, no data is logged. This is correct — we cannot assume what happened.
- **Question asked, app closed before response**: `claire_quality_time` remains null. No retry the next day.
- **William is away from home (travel)**: He can answer `"Not tonight"` honestly. No special travel mode needed — the data simply shows a gap. If gaps coincide with known travel it is not meaningful as a pattern.
- **Claire is away**: Same as above — William answers honestly. `"Not tonight"` is accurate.
