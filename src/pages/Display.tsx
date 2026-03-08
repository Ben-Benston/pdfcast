import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import supabase from '../utils/supabase'
import type { Room } from '../types/index'

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

    async function fetchRoom() {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('roomCode', roomCode)
            .single()

        if (error) console.error(error)
        else {
            setRoom(data)
            setScrollPos(data.scrollPosition)
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
            case 'fit': return window.innerWidth
            case '25': return window.innerWidth * 0.25
            case '50': return window.innerWidth * 0.5
            case '75': return window.innerWidth * 0.75
            case '100': return window.innerWidth
            case '125': return window.innerWidth * 1.25
            case '150': return window.innerWidth * 1.5
            default: return window.innerWidth
        }
    }

    if (!room) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <p className="text-gray-400">Waiting for room...</p>
        </div>
    )

    return (
        <div
            ref={containerRef}
            className="h-screen bg-black overflow-y-auto flex justify-center"
        >
            <Document
                file={room.pdfUrl}
                loading={<></>}
            >
                <Page
                    pageNumber={room.currentPage}
                    width={getPageWidth()}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={<></>}
                />
            </Document>
        </div>
    )
}