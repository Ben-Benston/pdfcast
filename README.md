# Relay PDF



[![Live](https://img.shields.io/badge/live-relaypdf.vercel.app-blue)](https://relaypdf.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/Ben-Benston/pdfcast/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/framework-React-61DAFB)](https://react.dev)

A real-time PDF display controller built for OBS and mosque/event livestreams.

## What it does

Relay PDF lets you control a PDF displayed on a screen or OBS browser source from your phone — change pages, zoom, and scroll in real time with minimal latency.

No more walking up to a laptop to flip slides. Control everything remotely while the display stays clean and fullscreen.

---

## How it works

1. **Create a Room** — upload a PDF and optionally set a room password
2. **Open the Display** — paste the display URL into OBS as a Browser Source (or open on any screen)
3. **Control remotely** — use your phone to change pages, zoom in/out, and scroll
4. Changes sync instantly via Supabase Realtime

---

## Features

- 📄 Upload any PDF and stream it to a display
- 🔄 Real-time sync between controller and display
- 🔐 Optional room password protection
- 🔍 Zoom levels: Fit, 40%, 50%, 60%, 75%, 100%, 125%
- 📜 Remote scroll control
- 📱 Mobile-friendly controller UI
- 🖥️ Clean fullscreen display — no UI, no scrollbars
- ♻️ Automatic cleanup of rooms and files after 24 hours
- 🔁 Reconnect to previous room via localStorage

---

## Tech Stack

- **Frontend** — React + TypeScript + Vite
- **Styling** — Tailwind CSS
- **PDF Rendering** — PDF.js via react-pdf
- **Backend** — Supabase (PostgreSQL + Realtime + Storage)
- **Deployment** — Vercel

---

## Usage with OBS

1. Go to [relaypdf.vercel.app](https://relaypdf.vercel.app)
2. Click **Display** and enter your room code
3. Copy the display URL
4. In OBS, add a **Browser Source** and paste the URL
5. Set width/height to match your canvas (e.g. 1920x1080)
6. Control the display from your phone via the Controller

---

## Local Development

```bash
git clone https://github.com/Ben-Benston/pdfcast
cd pdfcast
npm install
```

Create a `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key
```

```bash
npm run dev
```

---

## Database Schema

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomCode" TEXT NOT NULL,
  "pdfUrl" TEXT NOT NULL,
  "pdfName" TEXT NOT NULL,
  "currentPage" INT DEFAULT 1,
  "zoomLevel" TEXT DEFAULT 'fit',
  "scrollPosition" INT DEFAULT 0,
  "roomPassword" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);
```

---

## License

MIT — see [LICENSE](https://github.com/Ben-Benston/pdfcast/blob/main/LICENSE) for details.

## Attributions

- PDF icon by [kliwir art](https://www.flaticon.com/free-icons/pdf) via Flaticon
