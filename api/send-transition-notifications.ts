// api/send-transition-notifications.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

interface PushSubscriptionRow {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  profiles: { transition_time: string; work_days: string[] }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function utcDayAbbrev(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getUTCDay()]
}

function utcMinutes(): number {
  const now = new Date()
  return now.getUTCHours() * 60 + now.getUTCMinutes()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!process.env.VAPID_SUBJECT || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error('send-transition-notifications: VAPID env vars are not set')
    return res.status(500).json({ error: 'VAPID configuration missing' })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('send-transition-notifications: Supabase env vars are not set')
    return res.status(500).json({ error: 'Supabase configuration missing' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const today = new Date().toISOString().split('T')[0]
  const todayDay = utcDayAbbrev()
  const currentMins = utcMinutes()

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*, profiles!inner(transition_time, work_days)')

  if (error) return res.status(500).json({ error: error.message })

  const { data: doneHandoffs, error: handoffsError } = await supabase
    .from('handoffs')
    .select('user_id')
    .eq('type', 'transition')
    .eq('date', today)

  if (handoffsError) {
    console.error('send-transition-notifications: failed to query handoffs', handoffsError.message)
    return res.status(500).json({ error: 'Failed to query handoffs' })
  }

  const doneUserIds = new Set((doneHandoffs ?? []).map((h: { user_id: string }) => h.user_id))

  const toSend: Array<{ sub: PushSubscriptionRow; payload: string }> = []

  for (const sub of subs ?? []) {
    const { transition_time, work_days } = (sub as PushSubscriptionRow).profiles
    if (!work_days.includes(todayDay)) continue
    if (doneUserIds.has((sub as PushSubscriptionRow).user_id)) continue

    const transitionMins = timeToMinutes(transition_time)
    const isFirst = currentMins >= transitionMins && currentMins < transitionMins + 15
    const isSecond = currentMins >= transitionMins + 30 && currentMins < transitionMins + 45
    if (!isFirst && !isSecond) continue

    const payload = JSON.stringify(
      isFirst
        ? { title: 'Time to transition', body: 'Park your work and head home.', url: '/' }
        : { title: 'Transition reminder', body: 'Still time to close out the day.', url: '/' }
    )
    toSend.push({ sub: sub as PushSubscriptionRow, payload })
  }

  const results = await Promise.allSettled(
    toSend.map(({ sub, payload }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`send-transition-notifications: ${failed.length} notification(s) failed`)
  }

  res.json({ sent, total: subs?.length ?? 0 })
}
