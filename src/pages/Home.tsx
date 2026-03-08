import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../utils/supabase'
import { hashPassword } from '../utils/crypto'

export default function Home() {
    const navigate = useNavigate()
    const [showUpload, setShowUpload] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [showDisplayModal, setShowDisplayModal] = useState(false)
    const [showJoinControllerModal, setShowJoinControllerModal] = useState(false)
    const [displayRoomCode, setDisplayRoomCode] = useState('')
    const [controllerRoomCode, setControllerRoomCode] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [existingRoom, setExistingRoom] = useState<string | null>(null)
    const [roomPassword, setRoomPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const passwordInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem('roomCode')
        if (saved) setExistingRoom(saved)
    }, [])

    function generateRoomCode() {
        return Math.floor(100000 + Math.random() * 900000).toString()
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setSelectedFile(file)
    }

    async function handleCreateRoom() {
        if (!selectedFile) return
        setUploading(true)
        setProgress(10)

        const code = generateRoomCode()
        const fileName = `${code}-${selectedFile.name}`

        try {
            const { error: storageError } = await supabase.storage
                .from('pdfs')
                .upload(fileName, selectedFile)

            if (storageError) throw new Error(storageError.message)

            setProgress(60)

            const { data: urlData } = supabase.storage
                .from('pdfs')
                .getPublicUrl(fileName)

            setProgress(80)

            const hashedPassword = roomPassword ? await hashPassword(roomPassword) : null

            const { error: dbError } = await supabase.from('rooms').insert({
                roomCode: code,
                pdfUrl: urlData.publicUrl,
                pdfName: selectedFile.name,
                roomPassword: hashedPassword,
            })

            if (dbError) throw new Error(dbError.message)

            localStorage.setItem('roomCode', code)
            if (hashedPassword) localStorage.setItem(`password-${code}`, hashedPassword)

            setProgress(100)
            setTimeout(() => navigate(`/controller/${code}`), 500)

        } catch (err) {
            console.error(err)
            await supabase.storage.from('pdfs').remove([fileName])
            setUploading(false)
            setProgress(0)
        }
    }

    async function handleDisplayJoin() {
        if (!displayRoomCode.trim()) return
        if (!/^\d{6}$/.test(displayRoomCode)) return
        navigate(`/display/${displayRoomCode}`)
    }

    async function handleControllerJoin() {
        if (!controllerRoomCode.trim()) return
        if (!/^\d{6}$/.test(controllerRoomCode)) return
        navigate(`/controller/${controllerRoomCode}`)
    }

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-6">
            <a href="/">
                <h1 className="text-white text-4xl font-bold tracking-tight">Relay PDF</h1>
            </a>
            <p className="text-gray-400 text-sm">PDF display controller for OBS</p>

            {/* Main Buttons */}
            {!showUpload && !uploading && (
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowUpload(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors"
                    >
                        Create Room
                    </button>
                    <button
                        onClick={() => setShowDisplayModal(true)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors"
                    >
                        Display
                    </button>
                </div>
            )}

            {showUpload && !uploading && (
                <>
                    {/* Join Existing Room */}
                    {!selectedFile && (
                        <button
                            onClick={() => setShowJoinControllerModal(true)}
                            className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white border border-gray-700 rounded-full transition-all duration-200"
                        >
                            Join Existing Room?
                        </button>
                    )}

                    {/* File Drop Zone */}
                    {!selectedFile && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-2xl p-12 cursor-pointer transition-all text-center w-full max-w-sm"
                        >
                            <p className="text-4xl mb-3">📄</p>
                            <p className="text-white font-medium">Click to select a PDF</p>
                            <p className="text-gray-500 text-sm mt-1">Only PDF files supported</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    )}

                    {/* File Preview */}
                    {selectedFile && (
                        <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-4 flex items-center gap-4">
                            <div className="bg-gray-700 rounded-xl p-3 text-2xl">📄</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{selectedFile.name}</p>
                                <p className="text-gray-500 text-xs mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="text-gray-500 hover:text-white transition-colors text-lg"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Password Input */}
                    {selectedFile && (
                        <div className="flex items-center w-full max-w-sm bg-gray-800 rounded-xl overflow-hidden border border-gray-700 focus-within:border-blue-500 transition-colors">
                            <input
                                ref={passwordInputRef}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Room password (optional)"
                                value={roomPassword}
                                onChange={(e) => setRoomPassword(e.target.value)}
                                className="flex-1 bg-transparent text-white px-4 py-3 outline-none placeholder-gray-500 text-sm"
                            />
                            <button
                                onClick={() => {
                                    setShowPassword(!showPassword)
                                    const input = passwordInputRef.current
                                    if (input) {
                                        input.focus()
                                        const len = input.value.length
                                        setTimeout(() => input.setSelectionRange(len, len), 0)
                                    }
                                }}
                                className="text-gray-500 hover:text-white px-4 py-3 transition-colors text-sm"
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    )}

                    {/* Create Room Button */}
                    {selectedFile && (
                        <button
                            onClick={handleCreateRoom}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors w-full max-w-sm"
                        >
                            Create Room
                        </button>
                    )}
                </>
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
                            value={displayRoomCode}
                            onChange={(e) => setDisplayRoomCode(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleDisplayJoin()}
                            className="bg-gray-800 text-white px-4 py-3 rounded-xl outline-none placeholder-gray-600 tracking-widest text-center text-lg"
                            maxLength={6}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDisplayModal(false); setDisplayRoomCode('') }}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisplayJoin}
                                disabled={displayRoomCode.length !== 6}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white py-3 rounded-xl transition-colors"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Controller Modal */}
            {showJoinControllerModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4 w-full max-w-sm mx-4">
                        <h2 className="text-white text-xl font-semibold">Join Existing Room</h2>
                        <input
                            type="text"
                            placeholder="e.g. 123456"
                            value={controllerRoomCode}
                            onChange={(e) => setControllerRoomCode(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleControllerJoin()}
                            className="bg-gray-800 text-white px-4 py-3 rounded-xl outline-none placeholder-gray-600 tracking-widest text-center text-lg"
                            maxLength={6}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowJoinControllerModal(false); setControllerRoomCode('') }}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleControllerJoin}
                                disabled={controllerRoomCode.length !== 6}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white py-3 rounded-xl transition-colors"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Existing Room Modal */}
            {existingRoom && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
                    <div className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4 w-full max-w-sm mx-4">
                        <h2 className="text-white text-xl font-semibold">Active Room Found</h2>
                        <p className="text-gray-400 text-sm">You were previously controlling room <span className="text-white font-mono font-bold">{existingRoom}</span>. Continue?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setExistingRoom(null)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => navigate(`/controller/${existingRoom}`)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}