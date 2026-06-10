import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()
router.use(requireAuth)

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, avatarColor: true },
    })
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

const ALLOWED_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-green-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
]

router.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { avatarColor } = req.body ?? {}
    if (!ALLOWED_COLORS.includes(avatarColor)) {
      res.status(400).json({ error: 'Invalid avatar color' })
      return
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarColor },
      select: { id: true, avatarColor: true },
    })
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

export default router
