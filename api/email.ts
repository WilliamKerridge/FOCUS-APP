// api/email.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Service role key allows writing to email_inbox without user auth context
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EMAIL_SYSTEM_PROMPT = `Extract actionable items from this email thread. Return ONLY valid JSON.

Shape:
{
  "actions": [{ "title": string, "priority": "focus"|"if_time"|"must_today", "due_date": string|null }],
  "waiting_for": [{ "title": string, "person": string, "time_sensitive": boolean }],
  "promises": [{ "title": string, "made_to": string|null, "due_date": string|null }],
  "summary": "One sentence: what this email is about"
}

Rules:
- actions: things William needs to do
- waiting_for: things blocked on others
- promises: only things William explicitly promised
- time_sensitive waiting_for items get priority must_today
- If nothing extractable, return empty arrays`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set')
    return res.status(500).json({ error: 'API key not configured' })
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set')
    return res.status(500).json({ error: 'API key not configured' })
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  try {
    // Resend inbound webhook: fields are nested under req.body.data
    const { email_id, from, subject } = (req.body.data ?? req.body) as {
      email_id?: string
      from: string
      subject?: string
    }

    if (!from) {
      return res.status(400).json({ error: 'Missing from field' })
    }

    // Extract sender email from "Name <email@domain>" format
    const senderMatch = from.match(/<(.+?)>/)
    const senderEmail = senderMatch ? senderMatch[1].toLowerCase() : from.toLowerCase()

    // Fetch full email body from Resend API (not included in webhook payload)
    let emailBody = subject || 'No body'
    if (email_id) {
      try {
        const emailRes = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        })
        if (emailRes.ok) {
          const emailData = await emailRes.json() as { text?: string; html?: string }
          emailBody = emailData.text || emailData.html || emailBody
        }
      } catch (err) {
        console.error('Failed to fetch email body from Resend:', err)
      }
    }

    // Get William's user_id and personal_emails from profiles (single-user app)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, personal_emails')
      .limit(1)
      .single()

    if (!profile) {
      return res.status(500).json({ error: 'User profile not found' })
    }

    const userId = profile.id
    const personalEmails: string[] = (profile.personal_emails as string[] | null) ?? []
    const isPersonal = personalEmails.includes(senderEmail)
    const context = isPersonal ? 'home' : 'work'
    // All non-personal email is flagged for review — user confirms context at review screen
    const flagged = !isPersonal

    // Run Claude extraction — if it fails, save to inbox with null extraction
    let extraction = null
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: EMAIL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: emailBody }],
      })
      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      extraction = JSON.parse(cleaned)
    } catch (err) {
      console.error('Claude extraction failed:', err)
      // Save to inbox anyway — user will see "Could not extract" at review screen
    }

    // Save to email_inbox
    await supabase.from('email_inbox').insert({
      user_id: userId,
      sender_email: senderEmail,
      context,
      subject: subject || null,
      extraction,
      flagged,
      reviewed: false,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Email webhook error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
