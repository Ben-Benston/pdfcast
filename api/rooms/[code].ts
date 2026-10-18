import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../db.js'

interface RoomUpdates {
  currentPage?: number
  zoomLevel?: string
  scrollPosition?: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { code } = req.query
  const roomCode = Array.isArray(code) ? code[0] : code

  if (!roomCode || !/^\d{6}$/.test(roomCode)) {
    return res.status(400).json({ error: 'Valid 6-digit roomCode is required' })
  }

  try {
    const sql = getDb()

    // GET /api/rooms/[code] - get room details
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT 
          "id",
          "roomCode",
          "pdfUrl",
          "pdfName",
          "currentPage",
          "zoomLevel",
          "scrollPosition",
          "roomPassword",
          "createdAt",
          "updatedAt"
        FROM rooms
        WHERE "roomCode" = ${roomCode}
        LIMIT 1
      `

      if (!rows.length) {
        return res.status(404).json({ error: 'Room not found' })
      }

      return res.status(200).json(rows[0])
    }

    // PATCH /api/rooms/[code] - update room controls
    if (req.method === 'PATCH') {
      const { currentPage, zoomLevel, scrollPosition } = (req.body || {}) as RoomUpdates

      const updates: RoomUpdates = {}
      if (typeof currentPage === 'number') updates.currentPage = currentPage
      if (typeof zoomLevel === 'string') updates.zoomLevel = zoomLevel
      if (typeof scrollPosition === 'number') updates.scrollPosition = scrollPosition

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided to update' })
      }

      const rows = await sql`
        UPDATE rooms
        SET
          "currentPage" = COALESCE(${updates.currentPage ?? null}, "currentPage"),
          "zoomLevel" = COALESCE(${updates.zoomLevel ?? null}, "zoomLevel"),
          "scrollPosition" = COALESCE(${updates.scrollPosition ?? null}, "scrollPosition"),
          "updatedAt" = now()
        WHERE "roomCode" = ${roomCode}
        RETURNING 
          "id",
          "roomCode",
          "pdfUrl",
          "pdfName",
          "currentPage",
          "zoomLevel",
          "scrollPosition",
          "roomPassword",
          "createdAt",
          "updatedAt"
      `

      if (!rows.length) {
        return res.status(404).json({ error: 'Room not found' })
      }

      return res.status(200).json(rows[0])
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error(`API /api/rooms/${roomCode} error:`, err)
    return res.status(500).json({ error: message })
  }
}
