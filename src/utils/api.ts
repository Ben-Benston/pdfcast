import type { Room } from '../types'

export async function getActiveRoomsCount(): Promise<number> {
  const res = await fetch('/api/rooms', { method: 'GET' })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch rooms count (HTTP ${res.status})`)
  }
  const data = await res.json()
  return data.count ?? 0
}

export async function createRoom(payload: {
  roomCode: string
  pdfName: string
  roomPassword: string | null
  pdfBase64: string
}): Promise<{ roomCode: string; pdfUrl: string }> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to create room')
  }

  return res.json()
}

export async function getRoom(roomCode: string): Promise<Room | null> {
  const res = await fetch(`/api/rooms/${roomCode}`, {
    method: 'GET',
    headers: { 'Cache-Control': 'no-cache' },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch room')
  }

  return res.json()
}

export async function updateRoom(
  roomCode: string,
  updates: Partial<Room>
): Promise<Room> {
  const res = await fetch(`/api/rooms/${roomCode}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to update room')
  }

  return res.json()
}
