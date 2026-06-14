import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { prisma } from '../lib/prisma'

const router = Router()
router.use(requireAuth)

router.post('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint, keys } = req.body as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Invalid subscription payload' })
      return
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: req.user!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: req.user!.id, p256dh: keys.p256dh, auth: keys.auth },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.delete('/subscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body as { endpoint: string }
    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint' })
      return
    }
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user!.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
