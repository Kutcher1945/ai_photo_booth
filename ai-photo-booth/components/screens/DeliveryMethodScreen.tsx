'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Phone, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type DeliveryMethod = 'email' | 'sms' | 'telegram'

interface DeliveryMethodScreenProps {
  onSelectMethod: (method: DeliveryMethod) => void
  onBack: () => void
}

const deliveryMethods = [
  {
    id: 'email' as DeliveryMethod,
    title: 'Email',
    description: 'Receive photos via email',
    icon: Mail,
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    id: 'sms' as DeliveryMethod,
    title: 'SMS',
    description: 'Get photos via text message',
    icon: Phone,
    color: 'from-green-500/20 to-emerald-500/20'
  },
  {
    id: 'telegram' as DeliveryMethod,
    title: 'Telegram',
    description: 'Share photos on Telegram',
    icon: Send,
    color: 'from-sky-500/20 to-blue-500/20'
  }
]

export default function DeliveryMethodScreen({ onSelectMethod, onBack }: DeliveryMethodScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col max-w-2xl mx-auto w-full"
      >
        {/* Header */}
        <div className="relative flex items-center justify-center mb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="absolute left-0 w-12 h-12 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Delivery Method</h1>
            <p className="text-muted-foreground mt-2">
              How would you like to receive your photos?
            </p>
          </div>
        </div>

        {/* Delivery Method Cards */}
        <div className="grid gap-6 flex-1 content-start">
          {deliveryMethods.map((method, index) => {
            const Icon = method.icon
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Button
                  variant="outline"
                  onClick={() => onSelectMethod(method.id)}
                  className="w-full h-auto p-8 rounded-3xl border-2 hover:border-primary/50 hover:bg-secondary/50 transition-all group"
                >
                  <div className="flex items-center gap-6 w-full">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-xl font-semibold mb-1">{method.title}</h3>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Helper Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          You'll enter your contact details after taking photos
        </motion.div>
      </motion.div>
    </div>
  )
}
