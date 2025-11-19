'use client'

import { motion } from 'framer-motion'
import { Camera, Images, Sparkles, Palette, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PhotoMode } from '@/app/page'

interface ModeSelectScreenProps {
  onSelectMode: (mode: PhotoMode) => void
  onBack: () => void
}

const modes = [
  {
    id: 'single' as PhotoMode,
    icon: Camera,
    title: 'Single Photo',
    description: 'Capture one perfect moment',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'series' as PhotoMode,
    icon: Images,
    title: 'Photo Series',
    description: 'Take 3 consecutive shots',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    id: 'filters' as PhotoMode,
    icon: Sparkles,
    title: 'Funny Filters',
    description: 'Add creative effects',
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    id: 'background' as PhotoMode,
    icon: Palette,
    title: 'Background Effects',
    description: 'Change your background',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
]

export default function ModeSelectScreen({ onSelectMode, onBack }: ModeSelectScreenProps) {
  return (
    <div className="min-h-screen flex flex-col p-6 relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center mb-12 relative"
      >
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="rounded-full w-12 h-12 absolute left-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Choose Mode
          </h1>
          <p className="text-muted-foreground mt-2">
            Select your photography style
          </p>
        </div>
      </motion.div>

      {/* Mode Grid */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl"
        >
          {modes.map((mode, index) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectMode(mode.id)}
              className="relative group cursor-pointer"
            >
              <div className={`
                relative overflow-hidden rounded-3xl p-8 h-64
                bg-gradient-to-br ${mode.gradient}
                backdrop-blur-md bg-card/50
                border border-border/50
                shadow-lg hover:shadow-2xl
                transition-all duration-300
              `}>
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-background/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <mode.icon className="w-8 h-8 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {mode.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
