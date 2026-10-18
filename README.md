# Relay PDF

[![Live](https://img.shields.io/badge/live-relaypdf.vercel.app-blue)](https://relaypdf.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/Ben-Benston/pdfcast/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/framework-React-61DAFB)](https://react.dev)
[![Neon](https://img.shields.io/badge/database-Neon_Postgres-00E599)](https://neon.tech)

A real-time PDF display controller built for OBS and mosque/event livestreams.

## What it does

Relay PDF lets you control a PDF displayed on a screen or OBS browser source from your phone — change pages, zoom, and scroll in real time with minimal latency.

No more walking up to a laptop to flip slides. Control everything remotely while the display stays clean and fullscreen.

---

## How it works

1. **Create a Room** — upload a PDF and optionally set a room password
2. **Open the Display** — paste the display URL into OBS as a Browser Source (or open on any screen)
3. **Control remotely** — use your phone to change pages, zoom in/out, and scroll
4. Changes sync instantly to the display

---

## Features

- 📄 Upload any PDF and stream it to a display
- 🔄 Real-time sync between controller and display
- 🔐 Optional room password protection
- 🔍 Zoom levels: Fit, 40%, 50%, 60%, 75%, 100%, 125%
- 📜 Remote scroll control
- 📱 Mobile-friendly controller UI
- 🖥️ Clean fullscreen display — no UI, no scrollbars
- ♻️ Automatic cleanup of rooms and files after 24 hours (via Vercel Cron & Neon)
- 🔁 Reconnect to previous room via localStorage

---

## Tech Stack

- **Frontend** — React + TypeScript + Vite
- **Styling** — Tailwind CSS
- **PDF Rendering** — PDF.js via react-pdf
- **Backend & Database** — Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **API Runtime** — Vercel Serverless Functions (`/api`)
- **Deployment** — Vercel

---

## Setup & Deployment

### 1. Database Setup (Neon DB)

1. Create a project on [Neon Console](https://console.neon.tech).
2. Copy your **`DATABASE_URL`** connection string from the Neon dashboard.
3. Add it to your `.env` file (and in your Vercel Project Settings under Environment Variables):
   ```env
   DATABASE_URL=postgresql://[user]:[password]@[endpoint].us-east-2.aws.neon.tech/[dbname]?sslmode=require
   ```
4. Run the database migrations:
   ```bash
   npm run db:migrate
   ```

### 2. Local Development

```bash
git clone https://github.com/Ben-Benston/pdfcast
cd pdfcast
npm install
npm run dev
```

During local development, Vite serves both the React application and the `/api` backend endpoints on the same port using your local `DATABASE_URL`.

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomCode" VARCHAR(6) UNIQUE NOT NULL,
  "pdfUrl" TEXT NOT NULL,
  "pdfName" TEXT NOT NULL,
  "currentPage" INT NOT NULL DEFAULT 1,
  "zoomLevel" VARCHAR(10) NOT NULL DEFAULT 'fit',
  "scrollPosition" INT NOT NULL DEFAULT 0,
  "roomPassword" TEXT,
  "pdfData" BYTEA,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms("roomCode");
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms("createdAt");
```

---

## License

MIT — see [LICENSE](https://github.com/Ben-Benston/pdfcast/blob/main/LICENSE) for details.

## Attributions

- PDF icon by [kliwir art](https://www.flaticon.com/free-icons/pdf) via Flaticon
