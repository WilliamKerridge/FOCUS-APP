# UI Redesign Phase 1 — Design Document
_2026-03-11_

## Goal
Update the FOCUS app's visual design to match the Pencil mockups (mobile-01-darkclean_light style guide adapted to FOCUS's cyan palette). Excludes the immersive focus session timer (Phase 2).

## Scope
- Mobile: floating pill tab bar, Work Mode hero card + 2×2 grid, Home Mode list differentiation, WeeklyStrip today circle
- Desktop: WorkDesktop left column hero card, segmented control, action strip
- Typography: Fraunces serif for mode titles, DM Sans for body

## Approach: Option B — Structural + visual update

### 1. Fonts & tokens (`src/index.css`)
- Add `Fraunces` and `DM Sans` from Google Fonts alongside existing import
- Replace body font from `Plus Jakarta Sans` to `DM Sans`
- No CSS variable changes — existing palette already matches

### 2. Floating pill tab bar
- `MobileLayout`: remove `modeSelector` prop from top position; add `pb-[95px]` to content; render fixed-bottom pill container
- `ModeSelector`: restyle as floating pill — 62px height, 36px radius, `bg-[#1A1A1E]` surface, 1px border. Active tab: solid cyan fill. Icons: `briefcase`, `ArrowLeftRight`, `House` from lucide-react
- `App.tsx`: stop passing `modeSelector` to `MobileLayout`; `DesktopLayout` unchanged

### 3. WorkMode home view (`WorkMode.tsx`)
- Morning Kickstart card → `TODAY'S FOCUS` hero card: cyan eyebrow label, Fraunces heading, description, cyan "Begin" button with arrow icon
- End of Day / Agenda / Weekly Review / Email → compact 2×2 icon grid (smaller cards, icon + label, no description text)
- Promises callout → amber pill: dot + "{n} active promises" + "View all →"
- Task rows: add `border-l-2 border-primary` for work tasks, `border-l-2 border-amber-400` for waiting_for

### 4. HomeMode (`HomeMode.tsx`)
- Header: "Home" in Fraunces 24px + date subtitle (muted, small)
- List items: promises get `border-l-2 border-amber-400` + amber "Promise to {name}" metadata; tasks get `border-l-2 border-primary`
- Done today: replace `opacity-50` + strikethrough with `CircleCheck` green icon + muted text

### 5. WeeklyStrip (`WeeklyStrip.tsx`)
- Today's circle: change from `border-2 border-primary` outline to `bg-primary text-primary-foreground` solid fill
- Increase day number font size slightly (from `text-sm` to `text-base`)

### 6. TaskList (`TaskList.tsx`)
- Task rows: pass context down to enable left accent border colouring
- Work tasks: `border-l-[3px] border-primary`; waiting_for: `border-l-[3px] border-amber-400`

### 7. Desktop WorkDesktop left column (`WorkDesktop.tsx`)
- Apply same hero card pattern for the kickstart/main-focus area
- Replace current tab buttons with proper segmented control (Tasks | Agenda)
- Add compact icon+label action strip: Kickstart | End of Day | Review | Email

## Files changed
- `src/index.css`
- `src/components/layout/MobileLayout.tsx`
- `src/components/modes/ModeSelector.tsx`
- `src/App.tsx`
- `src/components/modes/WorkMode.tsx`
- `src/components/modes/HomeMode.tsx`
- `src/components/calendar/WeeklyStrip.tsx`
- `src/components/tasks/TaskList.tsx`
- `src/components/desktop/WorkDesktop.tsx`

## Out of scope (Phase 2)
- Immersive full-screen focus session timer
- Desktop right FocusPanel redesign
- Transition Mode visual updates
