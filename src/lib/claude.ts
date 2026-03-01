import type { ClaudeMessage } from '@/types'

export async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string
): Promise<string> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((err as { error: string }).error || 'Claude API failed')
  }

  const data = await response.json() as { text: string }
  return data.text
}
