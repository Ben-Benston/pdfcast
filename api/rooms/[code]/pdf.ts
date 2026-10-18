import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query
  const roomCode = Array.isArray(code) ? code[0] : code

  if (!roomCode || !/^\d{6}$/.test(roomCode)) {
    return res.status(400).json({ error: 'Valid 6-digit roomCode is required' })
  }

  try {
    const sql = getDb()

    const rows = await sql`
      SELECT "pdfData", "pdfName"
      FROM rooms
      WHERE "roomCode" = ${roomCode}
      LIMIT 1
    `

    if (!rows.length || !rows[0].pdfData) {
      return res.status(404).json({ error: 'PDF not found' })
    }

    const { pdfData, pdfName } = rows[0]
    const buffer = Buffer.isBuffer(pdfData) ? pdfData : Buffer.from(pdfData as string)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent((pdfName as string) || 'document.pdf')}"`)
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    res.setHeader('Content-Length', buffer.length.toString())

    return res.status(200).send(buffer)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error(`API /api/rooms/${roomCode}/pdf error:`, err)
    return res.status(500).json({ error: message })
  }
}
