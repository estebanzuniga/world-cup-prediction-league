import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword, isApiError } from '../api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const result = await forgotPassword(email)
    setLoading(false)
    if (isApiError(result)) {
      setError(result.error)
      return
    }
    setMessage(result.data.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">⚽</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Goalcaster</h1>
          <p className="mt-1 text-sm text-gray-400">Recuperar contraseña</p>
        </div>

        <div className="rounded-xl bg-gray-800 p-6 shadow-lg">
          {message ? (
            <div className="text-center">
              <p className="text-sm text-green-400">{message}</p>
              <p className="mt-2 text-xs text-gray-500">Revisa tu bandeja de entrada (y spam).</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-400">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
                  placeholder="tu@ejemplo.com"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-blue-400 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
