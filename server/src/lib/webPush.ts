import webpush from 'web-push'

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT ?? 'mailto:admin@goalcaster.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export interface Subscription {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPush(sub: Subscription, payload: PushPayload): Promise<'ok' | 'gone'> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 'ok'
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return 'ok'
  } catch (err: unknown) {
    const status = (err as Record<string, unknown>)?.statusCode
    if (status === 410) return 'gone'
    console.error('[webPush] send failed:', (err as Error).message)
    return 'ok'
  }
}
