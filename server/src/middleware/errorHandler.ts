import { Request, Response, NextFunction } from 'express'

interface HttpError extends Error {
  statusCode?: number
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500
  const message = statusCode === 500 ? 'Internal server error' : err.message
  res.status(statusCode).json({ error: message })
}
