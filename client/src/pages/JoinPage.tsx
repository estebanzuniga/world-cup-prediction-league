import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isApiError } from '../api'
import { joinLeague } from '../api/leagues'

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { navigate('/'); return }

    joinLeague(token).then(result => {
      if (isApiError(result)) {
        setError(result.error)
      } else {
        navigate('/', { replace: true })
      }
    })
  }, [token, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-4xl">⚽</span>
          <h1 className="mt-4 text-xl font-bold text-white">No se pudo unir a la liga</h1>
          <p className="mt-2 text-sm text-red-400">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="text-center">
        <span className="text-4xl">⚽</span>
        <p className="mt-4 text-sm text-gray-400">Uniéndote a la liga…</p>
      </div>
    </div>
  )
}
