import webpush from 'web-push'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return
  webpush.setVapidDetails(
    VAPID_SUBJECT ?? 'mailto:admin@goalcaster.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
  vapidConfigured = true
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
  ensureVapid()
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[webPush] VAPID keys not set — skipping push')
    return 'ok'
  }
  try {
    const response = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    console.log('[webPush] sent OK — status:', response.statusCode, 'endpoint:', sub.endpoint.slice(-30))
    return 'ok'
  } catch (err: unknown) {
    const status = (err as Record<string, unknown>)?.statusCode
    const body = (err as Record<string, unknown>)?.body
    console.error('[webPush] send failed — status:', status, 'body:', body, 'endpoint:', sub.endpoint.slice(-30))
    if (status === 410) return 'gone'
    return 'ok'
  }
}
