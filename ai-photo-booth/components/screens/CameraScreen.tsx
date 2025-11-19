'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, SwitchCamera, Sparkles, ArrowLeft, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PhotoMode } from '@/app/page'

interface CameraScreenProps {
  mode: PhotoMode
  onPhotosCapture: (photos: string[]) => void
  onBack: () => void
}

export default function CameraScreen({ mode, onPhotosCapture, onBack }: CameraScreenProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [capturedCount, setCapturedCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        await videoRef.current.play().catch(() => {})
        setIsStreaming(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraError(
        typeof window !== 'undefined' && !window.isSecureContext
          ? 'Camera requires a secure context. Use https or localhost.'
          : 'Could not access camera. Please check permissions or another app using it.'
      )
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return ''

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.9)
  }

  const handleCapture = async () => {
    const shotsCount = mode === 'series' ? 3 : 1
    const capturedPhotos: string[] = []

    for (let i = 0; i < shotsCount; i++) {
      // Countdown
      for (let count = 3; count > 0; count--) {
        setCountdown(count)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      setCountdown(null)

      // Flash effect
      setFlash(true)
      const photo = capturePhoto()
      if (photo) {
        capturedPhotos.push(photo)
        setCapturedCount(i + 1)
      }

      await new Promise(resolve => setTimeout(resolve, 200))
      setFlash(false)

      if (i < shotsCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 800))
      }
    }

    stopCamera()
    onPhotosCapture(capturedPhotos)
  }

  const handleSwitchCamera = async () => {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: streamRef.current ? 'environment' : 'user' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error('Error switching camera:', error)
      startCamera()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-black relative">
      {/* Video Stream */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center px-6">
            <div className="space-y-3">
              <p className="text-lg font-semibold">Camera unavailable</p>
              <p className="text-sm text-white/80">{cameraError}</p>
              <Button variant="secondary" onClick={startCamera}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Flash Effect */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Countdown */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-9xl font-bold text-white drop-shadow-2xl">
                {countdown}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-medium">
              {mode === 'series' ? `${capturedCount}/3` : 'Single Photo'}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwitchCamera}
              className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
            >
              <SwitchCamera className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-center gap-8">
            <Button
              variant="ghost"
              size="icon"
              className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
            >
              <Sparkles className="w-6 h-6" />
            </Button>

            {/* Capture Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCapture}
              disabled={countdown !== null}
              className="relative w-20 h-20 rounded-full bg-white shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-2 rounded-full border-4 border-black" />
            </motion.button>

            <Button
              variant="ghost"
              size="icon"
              className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
            >
              <Camera className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
