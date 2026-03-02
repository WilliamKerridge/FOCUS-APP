export type Mode = 'work' | 'transition' | 'home'
export type StreakType = 'kickstart' | 'transition' | 'focus' | 'promise_rate'

export interface Profile {
  id: string
  work_days: string[]
  transition_time: string
  gamification_level: 'subtle' | 'full'
  tone: string
  onboarding_complete: boolean
  current_mode: Mode
  mode_changed_at: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  context: string | null
  priority: number
  status: 'open' | 'done' | 'waiting'
  waiting_for_person: string | null
  due_date: string | null
  source: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Handoff {
  id: string
  user_id: string
  type: 'morning_kickstart' | 'end_of_day' | 'transition'
  content: KickstartContent | EndOfDayContent | TransitionContent
  raw_input: string
  claire_quality_time: 'yes' | 'no' | 'partial' | null
  claire_blocker: string | null
  date: string
  created_at: string
  updated_at: string
}

export interface KickstartContent {
  main_focus: string
  must_today: string[]
  if_time: string[]
  home_items: string[]
  flagged_promises: string[]
  yesterday_thread: string | null
  overcommitted: boolean
  overcommit_note: string | null
  streak_note: string | null
}

export interface EndOfDayContent {
  done_today: string[]
  unfinished: string[]
  next_start: string
  context_note: string
  parking_note: string | null
}

export interface TransitionContent {
  parking_note: string
  presence_intention: string
}

export interface Streak {
  id: string
  user_id: string
  streak_type: StreakType
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  created_at: string
  updated_at: string
}

export type SessionType = 'work' | 'writing' | 'migration'

export interface FocusSession {
  id: string
  user_id: string
  type: SessionType
  planned_duration_mins: number
  actual_duration_mins: number | null
  start_context: string
  end_context: string | null
  exited_early: boolean
  started_at: string
  ended_at: string | null
  date: string
  created_at: string
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface EmailExtractionAction {
  title: string
  priority: 'focus' | 'if_time' | 'must_today'
  due_date: string | null
}

export interface EmailExtractionWaitingFor {
  title: string
  person: string
  time_sensitive: boolean
}

export interface EmailExtractionPromise {
  title: string
  made_to: string | null
  due_date: string | null
}

export interface EmailExtraction {
  actions: EmailExtractionAction[]
  waiting_for: EmailExtractionWaitingFor[]
  promises: EmailExtractionPromise[]
  summary: string
}
