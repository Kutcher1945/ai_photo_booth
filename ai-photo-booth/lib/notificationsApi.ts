import type { DeliveryMethod } from '@/components/screens/DeliveryMethodScreen'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

type SendRequest = {
  recipient: string
  photos: string[]
  preferredMethod: DeliveryMethod
  notificationPhone?: string
}

type SendResponse = {
  accepted: boolean
  taskId?: string
  requiresTelegramStart?: boolean
  sessionId?: string
  deepLink?: string
  username?: string
}

export async function enqueueNotification({
  recipient,
  photos,
  preferredMethod,
  notificationPhone,
}: SendRequest): Promise<SendResponse> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/send/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient,
      photos,
      preferred_method: preferredMethod,
      notification_phone: notificationPhone,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return {
    accepted: Boolean(data?.accepted),
    taskId: data?.task_id,
    requiresTelegramStart: data?.requires_telegram_start,
    sessionId: data?.session_id,
    deepLink: data?.deep_link,
    username: data?.username,
  }
}

export async function checkTelegramSession(sessionId: string): Promise<{
  isLinked: boolean
  isSent: boolean
  taskId?: string
  expired: boolean
}> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/telegram/session/?session_id=${sessionId}`
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to check session status')
  }

  return {
    isLinked: data?.is_linked || false,
    isSent: data?.is_sent || false,
    taskId: data?.task_id,
    expired: data?.expired || false,
  }
}
