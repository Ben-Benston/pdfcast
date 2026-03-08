import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import supabase from '../utils/supabase'
import type { Room } from '../types/index'
import { hashPassword } from '../utils/crypto'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString()

export default function Controller() {
    const { roomCode } = useParams()
    const [room, setRoom] = useState<Room | null>(null)
    const [totalPages, setTotalPages] = useState(0)
    const [error, setError] = useState(false)
    const [authorized, setAuthorized] = useState(false)
    const [passwordInput, setPasswordInput] = useState('')
    const [passwordError, setPasswordError] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        fetchRoom()
    }, [])

    async function checkAuth(fetchedRoom: Room) {
        if (!fetchedRoom.roomPassword) {
            setAuthorized(true)
            return
        }
        const saved = localStorage.getItem(`password-${roomCode}`)
        if (saved === fetchedRoom.roomPassword) {
            setAuthorized(true)
        }
    }

    async function fetchRoom() {
        if (!roomCode || !/^\d{6}$/.test(roomCode)) {
            setError(true)
            return
        }

        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('roomCode', roomCode)
            .single()

        if (error) console.error(error)
        if (error || !data) setError(true)
        else {
            setRoom(data)
            await checkAuth(data)
        }
    }

    async function updateRoom(updates: Partial<Room>) {
        await supabase
            .from('rooms')
            .update(updates)
            .eq('roomCode', roomCode)

        setRoom(prev => prev ? { ...prev, ...updates } : prev)
    }

    if (error) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
            <a href="/"><h1 className="text-white text-4xl font-bold tracking-tight">Relay PDF</h1></a>
            <p className="text-red-400">Room not found.</p>
        </div>
    )

    if (!room) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
            <a href="/"><h1 className="text-white text-4xl font-bold tracking-tight">Relay PDF</h1></a>
            <p className="text-gray-400">Waiting for room...</p>
        </div>
    )

    if (!authorized && room?.roomPassword) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4 w-full max-w-sm mx-4">
                <h2 className="text-white text-xl font-semibold">Enter Room Password</h2>
                <div className="flex items-center gap-2">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl outline-none placeholder-gray-600"
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 px-3">
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>
                {passwordError && <p className="text-red-400 text-sm">Incorrect password</p>}
                <button
                    onClick={async () => {
                        const hashed = await hashPassword(passwordInput)
                        if (hashed === room.roomPassword) {
                            localStorage.setItem(`password-${roomCode}`, hashed)
                            setAuthorized(true)
                        } else {
                            setPasswordError(true)
                        }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-colors"
                >
                    Enter
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center gap-4 p-4">
            <a href="/">
                <h1 className="text-white text-4xl font-bold tracking-tight">Relay PDF</h1>
            </a>
            {/* Room Code */}
            <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 text-sm">Room:</span>
                <span className="text-white font-mono font-bold tracking-widest">{roomCode}</span>
            </div>

            {/* PDF Preview */}
            <div className="w-full max-w-sm bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center" style={{ height: '400px' }}>
                <Document
                    file={room.pdfUrl}
                    onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
                    className="flex items-center justify-center"
                >
                    <Page
                        pageNumber={room.currentPage}
                        width={320}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                    />
                </Document>
            </div>

            {/* Page Info */}
            <p className="text-gray-400 text-sm">
                Page {room.currentPage} of {totalPages}
            </p>

            {/* Page Controls */}
            <div className="flex gap-4">
                <button
                    onClick={() => updateRoom({ currentPage: Math.max(1, room.currentPage - 1), scrollPosition: 0 })}
                    disabled={room.currentPage <= 1}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white px-6 py-3 rounded-xl text-lg transition-colors"
                >
                    ← Prev
                </button>
                <button
                    onClick={() => updateRoom({ currentPage: Math.min(totalPages, room.currentPage + 1), scrollPosition: 0 })}
                    disabled={room.currentPage >= totalPages}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white px-6 py-3 rounded-xl text-lg transition-colors"
                >
                    Next →
                </button>
            </div>

            {/* Scroll Controls */}
            <div className="flex gap-4">
                <button
                    onClick={() => updateRoom({ scrollPosition: Math.max(0, room.scrollPosition - 100) })}
                    className="bg-gray-700 hover:bg-gray-600 active:opacity-50 text-white px-6 py-3 rounded-xl text-lg transition-colors"
                >
                    ↑ Scroll Up
                </button>
                <button
                    onClick={() => updateRoom({ scrollPosition: room.scrollPosition + 100 })}
                    className="bg-gray-700 hover:bg-gray-600 text-white active:opacity-50 px-6 py-3 rounded-xl text-lg transition-colors"
                >
                    ↓ Scroll Down
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex gap-2 flex-wrap justify-center">
                {['fit', '40', '50', '60', '75', '100', '125'].map(level => (
                    <button
                        key={level}
                        onClick={() => updateRoom({ zoomLevel: level, scrollPosition: 0 })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${room.zoomLevel === level
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                    >
                        {level === 'fit' ? 'Fit' : `${level}%`}
                    </button>
                ))}
            </div>

            {/* PDF Name */}
            <p className="text-gray-600 text-xs mt-2">{room.pdfName}</p>
        </div>
    )
}