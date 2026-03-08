import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import supabase from '../utils/supabase'
import type { Room } from '../types/index'
import { hashPassword } from '../utils/crypto'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString()

export default function Display() {
    const { roomCode } = useParams()
    const navigate = useNavigate()
    const [room, setRoom] = useState<Room | null>(null)
    const [scrollPos, setScrollPos] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState(false)
    const [authorized, setAuthorized] = useState(false)
    const [passwordInput, setPasswordInput] = useState('')
    const [passwordError, setPasswordError] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            navigate('/')
        }
    }, [])

    useEffect(() => {
        fetchRoom()
        const channel = subscribeToRoom()
        return () => { supabase.removeChannel(channel) }
    }, [])

    async function checkAuth(fetchedRoom: Room) {
        if (!fetchedRoom.roomPassword) {
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
            setScrollPos(data.scrollPosition)
            await checkAuth(data)
        }
    }

    function subscribeToRoom() {
        const channel = supabase
            .channel(`room-${roomCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rooms',
                    filter: `roomCode=eq.${roomCode}`,
                },
                (payload) => {
                    const updated = payload.new as Room
                    setRoom(updated)
                    setScrollPos(updated.scrollPosition)
                }
            )
            .subscribe()

        return channel
    }

    useEffect(() => {
        containerRef.current?.scrollTo({
            top: scrollPos,
            behavior: 'smooth'
        })
    }, [scrollPos])

    function getPageWidth() {
        if (!room) return window.innerWidth
        switch (room.zoomLevel) {
            case 'fit': return undefined
            case '40': return window.innerWidth * 0.4
            case '50': return window.innerWidth * 0.5
            case '60': return window.innerWidth * 0.6
            case '75': return window.innerWidth * 0.75
            case '100': return window.innerWidth
            case '125': return window.innerWidth * 1.25
            default: return window.innerWidth
        }
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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                hashPassword(passwordInput).then(hashed => {
                                    if (hashed === room.roomPassword) {
                                        setAuthorized(true)
                                    } else {
                                        setPasswordError(true)
                                    }
                                })
                            }
                        }}
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 px-3">
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>
                {passwordError && <p className="text-red-400 text-sm">Incorrect password</p>}
                <button onClick={async () => {
                    const hashed = await hashPassword(passwordInput)
                    if (hashed === room.roomPassword) {
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
        <div
            ref={containerRef}
            className="h-screen bg-black overflow-y-auto flex justify-center hide-scrollbar"
        >
            <Document
                file={room.pdfUrl}
                loading={<></>}
            >
                <Page
                    pageNumber={room.currentPage}
                    width={room.zoomLevel !== 'fit' ? getPageWidth() : undefined}
                    height={room.zoomLevel === 'fit' ? window.innerHeight : undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={<></>}
                />
            </Document>
        </div>
    )
}