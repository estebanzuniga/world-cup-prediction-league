import { useEffect, useState } from 'react'
import { useLeague } from '../contexts/LeagueContext'
import LeagueSelect from '../components/LeagueSelect'
import PredictionsModal from '../components/PredictionsModal'
import { getLeaderboard, type LeaderboardEntry } from '../api/leagues'
import { isApiError } from '../api'

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600',
  'bg-rose-600', 'bg-amber-600', 'bg-cyan-600',
]

function resolveColor(entry: Pick<LeaderboardEntry, 'name' | 'avatarColor'>) {
  return entry.avatarColor ?? AVATAR_COLORS[entry.name.charCodeAt(0) % AVATAR_COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function Rank({ pos }: { pos: number }) {
  if (pos === 0) return <span className="text-xl">🥇</span>
  if (pos === 1) return <span className="text-xl">🥈</span>
  if (pos === 2) return <span className="text-xl">🥉</span>
  return <span className="text-sm font-semibold text-gray-400">{pos + 1}</span>
}

function Avatar({ entry }: { entry: Pick<LeaderboardEntry, 'name' | 'avatarUrl' | 'avatarColor'> }) {
  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt={entry.name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${resolveColor(entry)}`}
    >
      {initials(entry.name)}
    </div>
  )
}

export default function LeaderboardPage() {
  const { leagues, loading: leagueLoading, refreshKey } = useLeague()
  const [league, setLeague] = useState<(typeof leagues)[0] | null>(null)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPredictions, setShowPredictions] = useState(false)

  useEffect(() => {
    if (leagues.length > 0 && !league) setLeague(leagues[0])
  }, [leagues, league])

  useEffect(() => {
    if (!league) return
    setLoading(true)
    setError(null)
    getLeaderboard(league.id).then(result => {
      setLoading(false)
      if (isApiError(result)) { setError(result.error); return }
      setEntries(result.data.leaderboard)
    })
  }, [league?.id, league, refreshKey])

  if (leagueLoading || loading) {
    return (
      <div className="py-20 text-center text-gray-500">Cargando…</div>
    )
  }

  if (!league) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold text-white">Aún no estás en una liga</p>
        <p className="mt-2 text-sm text-gray-400">
          Necesitas que te inviten a una liga antes de poder hacer pronósticos.
          Pídele el enlace de invitación al dueño de la liga.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Si ya te han invitado a una liga pero no aparece aquí, intenta refrescando la página.
        </p>
      </main>
    )
  }

  if (error) {
    return <div className="py-20 text-center text-red-400">{error}</div>
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {leagues.length > 1 ? (
            <LeagueSelect className="w-full text-lg font-bold" leagues={leagues} value={league} onChange={setLeague} />
          ) : (
            <h1 className="truncate text-lg font-bold text-white">{league.name}</h1>
          )}
        </div>
        <button
          onClick={() => setShowPredictions(true)}
          className="shrink-0 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-600"
        >
          Ver pronósticos
        </button>
      </div>
      <p className="mb-6 text-sm text-gray-400">
        {entries.length} miembro{entries.length !== 1 ? 's' : ''}
      </p>

      <div className="overflow-hidden rounded-xl bg-gray-800 shadow">
        {entries.length === 0 ? (
          <p className="px-6 py-10 text-center text-gray-500">
            Aún no hay puntos — ¡pronostica algunos partidos!
          </p>
        ) : (
          entries.map((entry, i) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-gray-700' : ''}`}
            >
              <div className="flex w-8 items-center justify-center">
                <Rank pos={i} />
              </div>

              <Avatar entry={entry} />

              <span className="min-w-0 flex-1 truncate font-medium text-white">
                {entry.name}
              </span>

              <div className="flex items-center gap-3 text-sm">
                <div className="text-right">
                  <span className="text-xl font-bold text-white">{entry.totalPoints}</span>
                  <span className="ml-1 text-xs text-gray-400">pts</span>
                </div>
                <div className="hidden w-20 text-right text-xs text-gray-400 sm:block">
                  <span className="font-semibold text-white">{entry.exactScoreCount}</span>{' '}
                  exactos
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showPredictions && (
        <PredictionsModal
          leagueId={league.id}
          members={entries.map(e => ({ userId: e.userId, name: e.name }))}
          onClose={() => setShowPredictions(false)}
        />
      )}
    </main>
  )
}
