// api/ical.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function escapeIcal(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function toIcalDate(iso: string): string {
  return iso.replace(/-/g, '')
}

function nextDay(iso: string): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.query.token as string | undefined
  if (!token) return res.status(400).send('Missing token')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('ical_token', token)
    .single()

  if (!profile) return res.status(404).send('Not found')
  const userId = profile.id

  const [{ data: tasks }, { data: promises }] = await Promise.all([
    supabase.from('tasks').select('id, title, due_date').eq('user_id', userId).eq('status', 'open').not('due_date', 'is', null),
    supabase.from('promises').select('id, title, due_date, made_to').eq('user_id', userId).eq('status', 'active'),
  ])

  const events: string[] = []

  for (const t of tasks ?? []) {
    events.push(`BEGIN:VEVENT\r\nUID:task-${t.id}@focus\r\nDTSTART;VALUE=DATE:${toIcalDate(t.due_date)}\r\nDTEND;VALUE=DATE:${toIcalDate(nextDay(t.due_date))}\r\nSUMMARY:${escapeIcal(t.title)}\r\nEND:VEVENT`)
  }

  for (const p of promises ?? []) {
    const summary = p.made_to ? `${p.title} \u2192 ${p.made_to}` : p.title
    events.push(`BEGIN:VEVENT\r\nUID:promise-${p.id}@focus\r\nDTSTART;VALUE=DATE:${toIcalDate(p.due_date)}\r\nDTEND;VALUE=DATE:${toIcalDate(nextDay(p.due_date))}\r\nSUMMARY:${escapeIcal(summary)}\r\nEND:VEVENT`)
  }

  const cal = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FOCUS//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:FOCUS', ...events, 'END:VCALENDAR'].join('\r\n')

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="focus.ics"')
  return res.status(200).send(cal)
}
