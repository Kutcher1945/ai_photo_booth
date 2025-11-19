'use client'

import { motion } from 'framer-motion'
import { Camera, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WelcomeScreenProps {
  onStart: () => void
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center space-y-8 max-w-2xl relative z-10"
      >
        {/* Logo and Title */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 backdrop-blur-sm">
            <Camera className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
            Photo Booth Pro
            <span className="block text-primary mt-2">Web</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto text-pretty">
            Create stunning photos with professional filters and effects
          </p>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            onClick={onStart}
            className="h-16 px-12 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 animate-pulse-ring"
          >
            <Camera className="w-5 h-5 mr-2" />
            Get Started
          </Button>
        </motion.div>

        {/* How it Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12"
        >
          {[
            {
              icon: Camera,
              title: 'Choose Mode',
              description: 'Select your preferred photo style',
            },
            {
              icon: Sparkles,
              title: 'Capture',
              description: 'Take amazing photos with effects',
            },
            {
              icon: Zap,
              title: 'Share',
              description: 'Send via email, SMS, or download',
            },
          ].map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground text-center text-pretty">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-6 text-sm text-muted-foreground"
      >
        Powered by modern web technology
      </motion.footer>
    </div>
  )
}
