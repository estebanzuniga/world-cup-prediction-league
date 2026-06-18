import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword, isApiError } from '../api'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await resetPassword(token, password)
    setLoading(false)
    if (isApiError(result)) {
      setError(result.error)
      return
    }
    navigate('/login', { replace: true })
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
        <div className="w-full max-w-sm rounded-xl bg-gray-800 p-6 text-center">
          <p className="text-red-400">Enlace inválido o expirado.</p>
          <Link to="/login" className="mt-4 block text-sm text-blue-400 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">⚽</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Goalcaster</h1>
          <p className="mt-1 text-sm text-gray-400">Nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-gray-800 p-6 shadow-lg">
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
                placeholder="Repite la contraseña"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-blue-400 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
