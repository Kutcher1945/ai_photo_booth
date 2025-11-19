'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Home, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SuccessScreenProps {
  onReset: () => void
}

export default function SuccessScreen({ onReset }: SuccessScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 pointer-events-none" />
      
      {/* Confetti Effect */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
            y: -20,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight + 20 : 1000,
            rotate: 360,
            opacity: 0,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: 'easeIn',
          }}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][
              Math.floor(Math.random() * 5)
            ],
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center space-y-8 max-w-md relative z-10"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.2,
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
          className="inline-flex"
        >
          <div className="relative">
            <CheckCircle2 className="w-24 h-24 text-accent" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute inset-0 rounded-full bg-accent/20"
            />
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="space-y-3"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
            Photos Sent Successfully!
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Your photos have been delivered. Check your inbox or messages.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 pt-4"
        >
          <Button
            size="lg"
            onClick={onReset}
            className="h-14 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onReset}
            className="h-14 px-8 rounded-2xl"
          >
            <Camera className="w-5 h-5 mr-2" />
            Take More Photos
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
