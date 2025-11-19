'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Phone, SendIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { DeliveryMethod } from './DeliveryMethodScreen'
import { enqueueNotification } from '@/lib/notificationsApi'

interface SendPhotoScreenProps {
  photos: string[]
  deliveryMethod: DeliveryMethod
  onSent: () => void
  onBack: () => void
}

export default function SendPhotoScreen({ photos, deliveryMethod, onSent, onBack }: SendPhotoScreenProps) {
  const [contactInfo, setContactInfo] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [notificationPhone, setNotificationPhone] = useState('')

  const validateInput = () => {
    const value = contactInfo.trim()
    if (!value) return 'Please enter your contact details.'
    if (deliveryMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) return 'Please enter a valid email address.'
    }
    if (deliveryMethod === 'telegram') {
      if (!value.startsWith('@') && !/^\d+$/.test(value)) {
        return 'Enter your @username or your numeric Telegram chat ID (start the bot first).'
      }
    }
    if (notificationPhone.trim()) {
      if (!/^\+\d{7,15}$/.test(notificationPhone.trim())) {
        return 'Enter a valid phone number in international format (e.g. +123456789).'
      }
    }
    return null
  }

  const handleSend = async () => {
    const recipient = contactInfo.trim()
    const validation = validateInput()
    if (validation) {
      setValidationError(validation)
      return
    }

    setIsSending(true)
    setError(null)
    setTaskId(null)
    setValidationError(null)

    try {
      const result = await enqueueNotification({
        recipient,
        photos,
        preferredMethod: deliveryMethod,
        notificationPhone: notificationPhone.trim() || undefined,
      })

      if (result.accepted) {
        setTaskId(result.taskId ?? null)
      }

      onSent()
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send. Please try again.'
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  const getInputConfig = () => {
    switch (deliveryMethod) {
      case 'email':
        return {
          icon: Mail,
          label: 'Email Address',
          placeholder: 'your@email.com',
          type: 'email' as const
        }
      case 'sms':
        return {
          icon: Phone,
          label: 'Phone Number',
          placeholder: '+1 (555) 000-0000',
          type: 'tel' as const
        }
      case 'telegram':
        return {
          icon: SendIcon,
          label: 'Telegram Username or Chat ID',
          placeholder: '@username (start the bot first)',
          type: 'text' as const
        }
    }
  }

  const inputConfig = getInputConfig()
  const Icon = inputConfig.icon

  return (
    <div className="min-h-screen flex flex-col bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col max-w-2xl mx-auto w-full"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-12 h-12 rounded-xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Send Photos</h1>
            <p className="text-muted-foreground mt-1">
              Enter your {inputConfig.label.toLowerCase()} to receive photos
            </p>
          </div>
        </div>

        {/* Photo Preview */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 border-border shadow-lg"
            >
              <img
                src={photo || "/placeholder.svg"}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Contact Input - Single input based on selected method */}
        <div className="space-y-6 flex-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-3"
          >
            <Label htmlFor="contact" className="text-base font-semibold flex items-center gap-2">
              <Icon className="w-5 h-5 text-primary" />
              {inputConfig.label}
            </Label>
            <Input
              id="contact"
              type={inputConfig.type}
              placeholder={inputConfig.placeholder}
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="h-14 rounded-xl px-4 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {deliveryMethod === 'telegram'
                ? 'Start @ai_photo_booth_bot in Telegram, then enter your @username or chat ID.'
                : `We\u2019ll start with ${inputConfig.label.toLowerCase()} and fall back to other channels if needed.`}
            </p>
            {validationError && (
              <p className="text-sm text-destructive mt-1">{validationError}</p>
            )}
          </motion.div>
          {(deliveryMethod === 'email' || deliveryMethod === 'telegram') && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="space-y-3"
            >
              <Label htmlFor="notification-phone" className="text-base font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                SMS confirmation (optional)
              </Label>
              <Input
                id="notification-phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={notificationPhone}
                onChange={(e) => setNotificationPhone(e.target.value)}
                className="h-14 rounded-xl px-4 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll text this number once your photos are delivered via {deliveryMethod}.
              </p>
            </motion.div>
          )}
        </div>

        {/* Send Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="pt-8"
        >
          <Button
            size="lg"
            onClick={handleSend}
            disabled={!contactInfo.trim() || isSending || photos.length === 0}
            className="w-full h-16 rounded-2xl text-lg"
          >
            {isSending ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <SendIcon className="w-5 h-5 mr-2" />
                Send Photos
              </>
            )}
          </Button>
          {error && (
            <p className="text-sm text-destructive mt-3">
              {error}
            </p>
          )}
          {taskId && (
            <p className="text-sm text-muted-foreground mt-3">
              Delivery queued. Task ID: {taskId}
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
