// api/vapid-public-key.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? '' })
}
