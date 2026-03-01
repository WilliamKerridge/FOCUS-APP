export type Mode = 'work' | 'transition' | 'home'

export interface Profile {
  id: string
  work_days: number[]
  transition_time: string
  gamification_level: 'subtle' | 'full'
  tone: string
  onboarding_complete: boolean
  created_at: string
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
}

export interface Handoff {
  id: string
  user_id: string
  type: 'morning_kickstart' | 'end_of_day' | 'transition'
  content: KickstartContent | EndOfDayContent | TransitionContent
  raw_input: string
  date: string
  created_at: string
}

export interface KickstartContent {
  main_focus: string
  if_time: string[]
  must_today: string[]
  flagged_promises: string[]
  yesterday_thread: string
  overcommitment_warning: string | null
}

export interface EndOfDayContent {
  done: string
  unfinished: string
  tomorrow_start: string
  summary: string
}

export interface TransitionContent {
  parking_note: string
  presence_intention: string
}

export interface Streak {
  id: string
  user_id: string
  streak_type: string
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  created_at: string
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}
