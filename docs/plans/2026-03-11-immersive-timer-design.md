# Immersive Focus Timer — Design Document
_2026-03-11_

## Goal
Transform the focus session timer from a small inline widget into an immersive full-screen experience on mobile and an enhanced visual treatment on desktop, without changing any session logic.

## Scope
- **Mobile**: when a session is active, `SessionPanel` renders `fixed inset-0 z-[60]` replacing the entire screen — large Fraunces timer, task name, session type chip, radial glow, dots, Finish button
- **Desktop**: enhanced inline timer card inside FocusPanel — Fraunces timer, session type chip, subtle glow, primary-coloured Finish button; no full-screen takeover since two-column layout should stay

## Out of scope
- Changes to session start/end logic or hooks
- Changes to `SessionCloseModal`
- Changes to `App.tsx`, `WorkMode`, `HomeMode`, `FocusPanel`, or any parent

## Approach
Modify only `SessionPanel`. Add `useBreakpoint()` inside it. When `activeSession && isMobile`, return an early full-screen JSX block before the normal form renders. When `activeSession && !isMobile`, enhance the existing timer card block in-place (no early return needed — the form already hides itself when active).

## Mobile immersive layout (top → bottom, `fixed inset-0 z-[60] bg-background flex flex-col`)
1. Session type chip — centred, top, `pt-16`
2. "Focusing on" muted label + task name — centred, 3-line max
3. Radial glow div + Fraunces `text-7xl` timer — centred, flex-1
4. Session dots row — centred
5. "Finish session" `bg-primary` button — `px-6 pb-12`, `py-4 rounded-2xl`

## Desktop enhanced card (`relative overflow-hidden rounded-2xl bg-secondary border border-primary/20`)
- Radial glow `absolute` div behind timer (blur-3xl, primary/10)
- Session type chip above timer
- Fraunces `text-5xl` timer
- `bg-primary` Finish button replacing the old muted border button
- Dots row unchanged

## Files changed
- `src/components/focus/SessionPanel.tsx`
