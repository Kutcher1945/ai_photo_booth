'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Download, Send, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface PreviewScreenProps {
  photos: string[]
  onRetake: () => void
  onSend: () => void
}

export default function PreviewScreen({ photos, onRetake, onSend }: PreviewScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleDownload = () => {
    photos.forEach((photo, index) => {
      const link = document.createElement('a')
      link.href = photo
      link.download = `photo-${index + 1}.jpg`
      link.click()
    })
  }

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col max-w-4xl mx-auto w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Preview</h1>
            <p className="text-muted-foreground mt-1">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} captured
            </p>
          </div>
        </div>

        {/* Photo Display */}
        <div className="flex-1 flex items-center justify-center mb-8">
          <div className="relative w-full max-w-2xl aspect-[4/3]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-border/50"
              >
                <img
                  src={photos[currentIndex] || "/placeholder.svg"}
                  alt={`Photo ${currentIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-background/80 backdrop-blur-md shadow-lg hover:bg-background"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-background/80 backdrop-blur-md shadow-lg hover:bg-background"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>

                {/* Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'bg-white w-8'
                          : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-3 gap-4"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={onRetake}
            className="h-14 rounded-2xl"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Retake
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleDownload}
            className="h-14 rounded-2xl"
          >
            <Download className="w-5 h-5 mr-2" />
            Save
          </Button>
          <Button
            size="lg"
            onClick={onSend}
            className="h-14 rounded-2xl"
          >
            <Send className="w-5 h-5 mr-2" />
            Send
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
