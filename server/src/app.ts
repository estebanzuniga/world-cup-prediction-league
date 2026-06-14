import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { join } from 'path'
import { existsSync } from 'fs'
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import leaguesRouter from './routes/leagues'
import matchesRouter from './routes/matches'
import predictionsRouter from './routes/predictions'
import usersRouter from './routes/users'
import pushRouter from './routes/push'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/leagues', leaguesRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/predictions', predictionsRouter)
app.use('/api/users', usersRouter)
app.use('/api/push', pushRouter)

app.use(errorHandler)

// Serve the Vite build in production (must be after API routes + error handler)
const clientDist = join(__dirname, '../../client/dist')
if (process.env.NODE_ENV === 'production' && existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')))
}

export default app
