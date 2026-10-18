import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../db.js'
import { isObjectStorageConfigured, deleteFromStorage } from '../storage.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional security: verify CRON_SECRET if provided in environment
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const sql = getDb()

    const result = await sql`
      DELETE FROM rooms
      WHERE "createdAt" < now() - interval '24 hours'
      RETURNING "roomCode", "pdfName"
    `

    if (isObjectStorageConfigured() && result.length > 0) {
      for (const room of result) {
        await deleteFromStorage(`${room.roomCode}-${room.pdfName}`)
      }
    }

    return res.status(200).json({
      success: true,
      deletedCount: result.length,
      deletedRooms: result.map((r: Record<string, unknown>) => r.roomCode),
      cleanedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Cron cleanup error:', err)
    return res.status(500).json({ error: message })
  }
}
