import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import leaguesRouter from './routes/leagues'
import matchesRouter from './routes/matches'
import predictionsRouter from './routes/predictions'
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

app.use(errorHandler)

export default app
