import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getToken, isApiError } from '../api'
import { joinLeague } from '../api/leagues'
import { useLeague } from '../contexts/LeagueContext'

// Used in two modes:
//   /join        — manual code entry form (inside AppLayout, authenticated)
//   /join/:code  — auto-join via invite link (outside AppLayout, handles unauthed state)
export default function JoinPage() {
  const { code } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const { refreshLeagues } = useLeague()

  // ── Auto-join mode (invite link) ──────────────────────────────────────────
  const [autoError, setAutoError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    if (!getToken()) return

    joinLeague(code).then(result => {
      if (isApiError(result)) {
        if (result.statusCode === 409) {
          refreshLeagues()
          navigate('/leaderboard', { replace: true })
          return
        }
        setAutoError(result.error)
        return
      }
      refreshLeagues()
      navigate('/leaderboard', { replace: true })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (code) {
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

    if (autoError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
          <div className="text-center">
            <p className="text-red-400">{autoError}</p>
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

  // ── Manual-entry mode ─────────────────────────────────────────────────────
  return <ManualJoinForm onJoined={() => { refreshLeagues(); navigate('/leaderboard') }} />
}

function ManualJoinForm({ onJoined }: { onJoined: () => void }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = input.trim().toUpperCase()
    if (!code) return
    setLoading(true)
    setError(null)
    const result = await joinLeague(code)
    setLoading(false)
    if (isApiError(result)) {
      if (result.statusCode === 409) { onJoined(); return }
      setError(result.error)
      return
    }
    onJoined()
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-1 text-lg font-bold text-white">Unirse a una liga</h1>
      <p className="mb-6 text-sm text-gray-400">
        Ingresa el código de invitación que te compartió el dueño de la liga.
      </p>

      <form onSubmit={handleSubmit} className="rounded-xl bg-gray-800 p-6">
        <label htmlFor="code" className="block text-sm font-medium text-gray-300">
          Código de invitación
        </label>
        <input
          id="code"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          placeholder="XXXXXXXX"
          className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-center font-mono text-lg tracking-widest text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none uppercase"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="mt-4 w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Uniéndote…' : 'Unirse'}
        </button>
      </form>
    </main>
  )
}
