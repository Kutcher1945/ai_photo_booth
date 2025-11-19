import type { DeliveryMethod } from '@/components/screens/DeliveryMethodScreen'

type SendPayload = {
  recipient: string
  photos: string[]
}

export type ChannelResult = {
  channel: DeliveryMethod
  success: boolean
  detail: string
  error?: string
}

type SendOutcome = {
  success: boolean
  attempts: ChannelResult[]
}

const channelPriority: DeliveryMethod[] = ['email', 'sms', 'telegram']

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const channelSenders: Record<
  DeliveryMethod,
  (payload: SendPayload) => Promise<string>
> = {
  email: async (payload) => {
    await delay(400)
    // In real life, plug in your email provider call here.
    return `Sent ${payload.photos.length} photo(s) to ${payload.recipient} by email`
  },
  sms: async (payload) => {
    await delay(500)
    // Swap this placeholder with an SMS gateway call.
    return `Sent download links for ${payload.photos.length} photo(s) via SMS to ${payload.recipient}`
  },
  telegram: async (payload) => {
    await delay(450)
    // Replace with Telegram Bot API call.
    return `Delivered ${payload.photos.length} photo(s) to @${payload.recipient.replace('@', '')} on Telegram`
  },
}

const shouldFail = (channel: DeliveryMethod) => {
  const failRate: Record<DeliveryMethod, number> = {
    email: 0.2,
    sms: 0.25,
    telegram: 0.15,
  }
  return Math.random() < failRate[channel]
}

export async function sendPhotosWithFallback(
  payload: SendPayload,
  preferred: DeliveryMethod
): Promise<SendOutcome> {
  const order = [preferred, ...channelPriority.filter((c) => c !== preferred)]
  const attempts: ChannelResult[] = []

  for (const channel of order) {
    try {
      if (shouldFail(channel)) {
        throw new Error(`${channel} provider unavailable`)
      }

      const detail = await channelSenders[channel](payload)
      attempts.push({ channel, success: true, detail })

      return { success: true, attempts }
    } catch (error) {
      attempts.push({
        channel,
        success: false,
        detail: `Failed to send via ${channel}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { success: false, attempts }
}
