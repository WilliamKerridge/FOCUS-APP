// api/send-transition-notifications.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

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

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]
  const todayDay = utcDayAbbrev()
  const currentMins = utcMinutes()

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*, profiles!inner(transition_time, work_days)')

  if (error) return res.status(500).json({ error: error.message })

  const { data: doneHandoffs } = await supabase
    .from('handoffs')
    .select('user_id')
    .eq('type', 'transition')
    .eq('date', today)

  const doneUserIds = new Set((doneHandoffs ?? []).map((h: { user_id: string }) => h.user_id))

  let sent = 0
  await Promise.allSettled(
    (subs ?? []).map(async (sub: {
      user_id: string
      endpoint: string
      p256dh: string
      auth: string
      profiles: { transition_time: string; work_days: string[] }
    }) => {
      const { transition_time, work_days } = sub.profiles
      if (!work_days.includes(todayDay)) return
      if (doneUserIds.has(sub.user_id)) return

      const transitionMins = timeToMinutes(transition_time)
      const isFirst = currentMins >= transitionMins && currentMins < transitionMins + 15
      const isSecond = currentMins >= transitionMins + 30 && currentMins < transitionMins + 45
      if (!isFirst && !isSecond) return

      const payload = JSON.stringify(
        isFirst
          ? { title: 'Time to transition', body: 'Park your work and head home.', url: '/' }
          : { title: 'Transition reminder', body: 'Still time to close out the day.', url: '/' }
      )

      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    })
  )

  res.json({ sent, total: subs?.length ?? 0 })
}
