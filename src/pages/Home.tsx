import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../utils/supabase'

export default function Home() {
    const navigate = useNavigate()
    const [showUpload, setShowUpload] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [showDisplayModal, setShowDisplayModal] = useState(false)
    const [roomCode, setRoomCode] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    function generateRoomCode() {
        return Math.floor(100000 + Math.random() * 900000).toString()
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setProgress(10)

        const code = generateRoomCode()
        const fileName = `${code}-${file.name}`

        // Upload to Supabase Storage
        const { error: storageError } = await supabase.storage
            .from('pdfs')
            .upload(fileName, file)

        if (storageError) {
            console.error(storageError)
            setUploading(false)
            return
        }

        setProgress(60)

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName)

        setProgress(80)

        // Create room in DB
        const { error: dbError } = await supabase.from('rooms').insert({
            roomCode: code,
            pdfUrl: urlData.publicUrl,
            pdfName: file.name,
        })

        if (dbError) {
            console.error(dbError)
            setUploading(false)
            return
        }

        setProgress(100)

        // Navigate to controller
        setTimeout(() => navigate(`/controller/${code}`), 500)
    }

    async function handleDisplayJoin() {
        if (!roomCode.trim()) return
        if (!/^\d{6}$/.test(roomCode)) return // must be exactly 6 digits
        navigate(`/display/${roomCode}`)
    }

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-6">
            <a href="/">
                <h1 className="text-white text-4xl font-bold tracking-tight">PDF Cast</h1>
            </a>
            <p className="text-gray-400 text-sm">PDF display controller for OBS</p>

            <div className="flex gap-4">
                {!showUpload && !uploading && (
                    <button
                        onClick={() => setShowUpload(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors"
                    >
                        Create Room
                    </button>
                )}

                {!uploading && !showUpload && (
                    <button
                        onClick={() => setShowDisplayModal(true)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors"
                    >
                        Display
                    </button>
                )}
            </div>

            {/* File Upload */}
            {showUpload && !uploading && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-12 cursor-pointer transition-colors text-center"
                >
                    <p className="text-gray-400 text-lg">Click to select a PDF</p>
                    <p className="text-gray-600 text-sm mt-2">Only PDF files supported</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </div>
            )}

            {/* Progress Bar */}
            {uploading && (
                <div className="w-full max-w-md">
                    <p className="text-gray-400 text-sm mb-3 text-center">Setting up your room...</p>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-gray-600 text-xs mt-2 text-center">{progress}%</p>
                </div>
            )}

            {/* Display Modal */}
            {showDisplayModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4 w-full max-w-sm mx-4">
                        <h2 className="text-white text-xl font-semibold">Enter Room Code</h2>
                        <input
                            type="text"
                            placeholder="e.g. 123456"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleDisplayJoin()}
                            className="bg-gray-800 text-white px-4 py-3 rounded-xl outline-none placeholder-gray-600 tracking-widest text-center text-lg uppercase"
                            maxLength={6}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDisplayModal(false)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisplayJoin}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-colors"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}