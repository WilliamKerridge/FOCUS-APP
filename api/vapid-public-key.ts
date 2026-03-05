// api/vapid-public-key.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: 'VAPID_PUBLIC_KEY is not configured' })
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
}
