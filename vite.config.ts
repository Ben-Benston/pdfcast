import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import 'dotenv/config'
import roomsHandler from './api/rooms/index'
import roomCodeHandler from './api/rooms/[code]'
import pdfHandler from './api/rooms/[code]/pdf'
import cronHandler from './api/cron/cleanup'

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use((rawReq: IncomingMessage, rawRes: ServerResponse, next: () => void) => {
        if (!rawReq.url?.startsWith('/api/')) {
          return next()
        }

        void (async () => {
          const res = rawRes as unknown as VercelResponse
          if (!res.status) {
            res.status = (code: number) => {
              rawRes.statusCode = code
              return res
            }
          }
          if (!res.json) {
            res.json = (data: unknown) => {
              rawRes.setHeader('Content-Type', 'application/json')
              rawRes.end(JSON.stringify(data))
              return res
            }
          }
          if (!res.send) {
            res.send = (data: unknown) => {
              rawRes.end(data as string | Buffer)
              return res
            }
          }

          const req = rawReq as unknown as VercelRequest
          const url = new URL(rawReq.url || '', 'http://localhost')
          const pathname = url.pathname

          if (['POST', 'PATCH', 'PUT'].includes(rawReq.method || '')) {
            const chunks: Buffer[] = []
            for await (const chunk of rawReq) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
            }
            const raw = Buffer.concat(chunks).toString('utf8')
            try {
              req.body = raw ? JSON.parse(raw) : {}
            } catch {
              req.body = {}
            }
          }

          req.query = Object.fromEntries(url.searchParams.entries())

          if (pathname === '/api/rooms' || pathname === '/api/rooms/') {
            return roomsHandler(req, res)
          }

          const pdfMatch = pathname.match(/^\/api\/rooms\/(\d{6})\/pdf$/)
          if (pdfMatch) {
            req.query.code = pdfMatch[1]
            return pdfHandler(req, res)
          }

          const roomMatch = pathname.match(/^\/api\/rooms\/(\d{6})$/)
          if (roomMatch) {
            req.query.code = roomMatch[1]
            return roomCodeHandler(req, res)
          }

          if (pathname === '/api/cron/cleanup') {
            return cronHandler(req, res)
          }

          return next()
        })()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiDevServerPlugin(),
  ],
})