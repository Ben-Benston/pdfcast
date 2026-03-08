import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import supabase from '../utils/supabase'
import type { Room } from '../types/index'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString()

export default function Controller() {
    const { roomCode } = useParams()
    const [room, setRoom] = useState<Room | null>(null)
    const [totalPages, setTotalPages] = useState(0)

    useEffect(() => {
        fetchRoom()
    }, [])

    async function fetchRoom() {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('roomCode', roomCode)
            .single()

        if (error) console.error(error)
        else setRoom(data)
    }

    async function updateRoom(updates: Partial<Room>) {
        await supabase
            .from('rooms')
            .update(updates)
            .eq('roomCode', roomCode)

        setRoom(prev => prev ? { ...prev, ...updates } : prev)
    }

    if (!room) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <p className="text-gray-400">Loading room...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center gap-4 p-4">
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
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl text-lg transition-colors"
                >
                    ↑ Scroll Up
                </button>
                <button
                    onClick={() => updateRoom({ scrollPosition: room.scrollPosition + 100 })}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl text-lg transition-colors"
                >
                    ↓ Scroll Down
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex gap-2 flex-wrap justify-center">
                {['fit', '25', '50', '75', '100', '125', '150'].map(level => (
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