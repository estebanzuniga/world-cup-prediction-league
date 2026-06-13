import { useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentUserId, isApiError } from '../api'
import LeagueSelect from '../components/LeagueSelect'
import { useLeague } from '../contexts/LeagueContext'
import { createInviteToken, type InviteToken } from '../api/leagues'

const VISIBLE_SECONDS = 15

export default function InvitePage() {
  const { leagues, loading } = useLeague()
  const [league, setLeague] = useState<(typeof leagues)[0] | null>(null)
  const [token, setToken] = useState<InviteToken | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ownedLeagues = useMemo(
    () => leagues.filter(l => l.createdBy === getCurrentUserId()),
    [leagues],
  )

  useEffect(() => {
    if (ownedLeagues.length > 0 && !league) setLeague(ownedLeagues[0])
  }, [ownedLeagues, league])

  // Clear countdown when league changes
  useEffect(() => {
    setToken(null)
    setSecondsLeft(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [league?.id])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function startCountdown() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSecondsLeft(VISIBLE_SECONDS)
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          setToken(null)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  async function handleGenerate() {
    if (!league || generating) return
    setGenerating(true)
    setError(null)
    const result = await createInviteToken(league.id)
    setGenerating(false)
    if (isApiError(result)) { setError(result.error); return }
    setToken(result.data)
    setCopied(false)
    startCountdown()
  }

  async function handleCopy() {
    if (!token) return
    await navigator.clipboard.writeText(`${window.location.origin}/join/${token.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) return <div className="py-20 text-center text-gray-500">Cargando…</div>

  if (ownedLeagues.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-gray-400">Esta página solo está disponible para el creador de la liga.</p>
      </main>
    )
  }

  if (!league) return null

  const inviteUrl = token ? `${window.location.origin}/join/${token.token}` : null

  return (
    <main className="mx-auto max-w-sm px-4 py-6">
      <h1 className="mb-1 text-lg font-bold text-white">Invitar amigos</h1>
      <p className="mb-6 text-sm text-gray-400">
        Genera un enlace de un solo uso y compártelo. El enlace desaparecerá de esta pantalla en {VISIBLE_SECONDS} segundos.
      </p>

      <LeagueSelect className="mb-6" leagues={ownedLeagues} value={league} onChange={setLeague} />

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        {generating ? 'Generando…' : 'Generar enlace de invitación'}
      </button>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {token && inviteUrl && (
        <div className="mt-6 rounded-xl bg-gray-800 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Enlace de invitación
            </span>
            <span className="text-xs font-semibold text-amber-400">
              Desaparece en {secondsLeft}s
            </span>
          </div>

          <p className="mb-4 break-all font-mono text-sm text-white">
            {inviteUrl}
          </p>

          <button
            onClick={handleCopy}
            className={`w-full rounded-lg py-2 text-sm font-medium transition ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
          </button>
        </div>
      )}
    </main>
  )
}
