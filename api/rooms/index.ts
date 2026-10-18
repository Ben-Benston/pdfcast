import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../db'
import { isObjectStorageConfigured, uploadToStorage, deleteFromStorage } from '../storage'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const sql = getDb()

    // GET /api/rooms - check active room count (and cleanup expired rooms)
    if (req.method === 'GET') {
      // Auto-cleanup rooms older than 24 hours
      const expiredRooms = await sql`
        DELETE FROM rooms
        WHERE "createdAt" < now() - interval '24 hours'
        RETURNING "roomCode", "pdfName"
      `

      if (isObjectStorageConfigured() && expiredRooms.length > 0) {
        for (const room of expiredRooms) {
          await deleteFromStorage(`${room.roomCode}-${room.pdfName}`)
        }
      }

      const rows = await sql`
        SELECT count(*)::int as count FROM rooms
      `
      const count = (rows[0]?.count as number) ?? 0
      return res.status(200).json({ count })
    }

    // POST /api/rooms - create a new room
    if (req.method === 'POST') {
      const { roomCode, pdfName, roomPassword, pdfBase64 } = req.body || {}

      if (!roomCode || !/^\d{6}$/.test(roomCode)) {
        return res.status(400).json({ error: 'Valid 6-digit roomCode is required' })
      }
      if (!pdfName || typeof pdfName !== 'string') {
        return res.status(400).json({ error: 'pdfName is required' })
      }
      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        return res.status(400).json({ error: 'pdfBase64 is required' })
      }

      // Check room capacity limit (50 rooms)
      const countRows = await sql`
        SELECT count(*)::int as count FROM rooms
      `
      if (((countRows[0]?.count as number) ?? 0) >= 50) {
        return res.status(429).json({ error: 'Too many active rooms. Please try again later.' })
      }

      const pdfBuffer = Buffer.from(pdfBase64, 'base64')
      let pdfUrl = `/api/rooms/${roomCode}/pdf`
      let pdfDataToStore: Buffer | null = pdfBuffer

      // Upload to Neon Object Storage if credentials are configured
      if (isObjectStorageConfigured()) {
        try {
          const objectKey = `${roomCode}-${pdfName}`
          pdfUrl = await uploadToStorage(objectKey, pdfBuffer, 'application/pdf')
          pdfDataToStore = null // Store in S3; keep DB light
        } catch (storageErr) {
          console.error('Failed uploading to Neon Object Storage, falling back to database BYTEA:', storageErr)
          pdfUrl = `/api/rooms/${roomCode}/pdf`
          pdfDataToStore = pdfBuffer
        }
      }

      await sql`
        INSERT INTO rooms (
          "roomCode",
          "pdfUrl",
          "pdfName",
          "roomPassword",
          "pdfData",
          "currentPage",
          "zoomLevel",
          "scrollPosition"
        ) VALUES (
          ${roomCode},
          ${pdfUrl},
          ${pdfName},
          ${roomPassword || null},
          ${pdfDataToStore},
          1,
          'fit',
          0
        )
      `

      return res.status(201).json({
        success: true,
        roomCode,
        pdfUrl,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('API /api/rooms error:', err)
    return res.status(500).json({ error: message })
  }
}
