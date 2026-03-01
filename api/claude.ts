import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_SYSTEM_PROMPT = `You are FOCUS, William's personal reliability engine. Be direct and brief. No pleasantries. Give concrete next actions, not vague suggestions. William has ADHD — be specific, clear, and actionable.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, systemPrompt } = req.body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    systemPrompt?: string
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt
        ? `${BASE_SYSTEM_PROMPT}\n\n${systemPrompt}`
        : BASE_SYSTEM_PROMPT,
      messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type' })
    }

    return res.status(200).json({ text: content.text })
  } catch (err) {
    console.error('Claude API error:', err)
    return res.status(500).json({ error: 'Claude API call failed' })
  }
}
