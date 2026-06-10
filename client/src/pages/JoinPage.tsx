import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getToken, isApiError } from '../api'
import { joinLeague } from '../api/leagues'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) return // render unauthenticated state below

    if (!code) { setError('Enlace de invitación inválido.'); return }

    joinLeague(code).then(result => {
      if (isApiError(result)) {
        // Already a member → just land on the leaderboard
        if (result.statusCode === 409) { navigate('/leaderboard', { replace: true }); return }
        setError(result.error)
        return
      }
      navigate('/leaderboard', { replace: true })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!getToken()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
        <div className="text-center">
          <span className="text-4xl">⚽</span>
          <h1 className="mt-4 text-xl font-bold text-white">Inicia sesión para unirte a esta liga</h1>
          <p className="mt-2 text-sm text-gray-400">Necesitas una cuenta para aceptar esta invitación.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-gray-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
            Ir a los partidos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <p className="text-gray-400">Uniéndote a la liga…</p>
    </div>
  )
}
