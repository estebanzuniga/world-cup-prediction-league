import { useEffect, useState } from 'react'
import { useLeague } from '../contexts/LeagueContext'
import LeagueSelect from '../components/LeagueSelect'
import PredictionsModal from '../components/PredictionsModal'
import { InformationCircleIcon } from '../components/icons'
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
  if (pos === 1) return <span className="text-xl">🥇</span>
  if (pos === 2) return <span className="text-xl">🥈</span>
  if (pos === 3) return <span className="text-xl">🥉</span>
  return <span className="text-sm font-semibold text-gray-400">{pos}</span>
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
  const [showInfo, setShowInfo] = useState(false)

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
      {/* League title */}
      <div className="mb-3 w-full rounded-lg bg-gray-800/40 px-3 py-2 text-center text-sm text-gray-400">
        {leagues.length > 1 ? (
          <LeagueSelect className="w-full text-lg font-bold" leagues={leagues} value={league} onChange={setLeague} />
        ) : (
          <h1 className="truncate text-lg font-bold text-white">{league.name}</h1>
        )}
      </div>

      {/* Sub-header: member count + actions */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          {entries.length} miembro{entries.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPredictions(true)}
            className="shrink-0 rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
          >
            Ver pronósticos
          </button>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-700 p-1.5 text-sm font-medium text-white transition hover:bg-gray-600"
            aria-label="Cómo se calculan los puntos"
          >
            <InformationCircleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

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
                <Rank pos={entry.position} />
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

      {showInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/60 sm:flex sm:items-center sm:justify-center sm:p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-gray-800 shadow-xl sm:relative sm:inset-auto sm:w-full sm:max-w-sm sm:rounded-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-gray-600 sm:hidden" />

            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <h2 className="text-lg font-bold text-white">Sistema de puntuación</h2>
              <button
                onClick={() => setShowInfo(false)}
                className="text-gray-400 transition hover:text-white"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 px-5 pb-8 pt-1">
              <p className="pb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Fase de grupos</p>

              {[
                { pts: '3', color: 'text-green-400', title: 'Marcador exacto', desc: 'Predijiste el resultado exacto' },
                { pts: '1', color: 'text-amber-400', title: 'Resultado correcto', desc: 'Victoria, empate o derrota bien — marcador no' },
                { pts: '0', color: 'text-gray-500',  title: 'Incorrecto', desc: 'El resultado no coincide' },
              ].map(({ pts, color, title, desc }) => (
                <div key={title} className="flex items-center gap-4 rounded-lg bg-gray-700/50 px-4 py-2.5">
                  <span className={`w-8 shrink-0 text-center text-xl font-bold ${color}`}>{pts}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}

              <p className="pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Fase eliminatoria <span className="font-normal normal-case text-gray-600">· Puntos aumentan por ronda</span>
              </p>

              {[
                { pts: '5–10', color: 'text-green-400',   title: 'Marcador exacto + clasificado', desc: 'Marcador y equipo clasificado correctos' },
                { pts: '3–7',  color: 'text-emerald-400', title: 'Clasificado + diferencia', desc: 'Clasificado y margen de goles correctos · En empate: marcador o clasificado (no ambos)' },
                { pts: '2–5',  color: 'text-amber-400',   title: 'Solo clasificado', desc: 'Equipo clasificado correcto, margen no' },
                { pts: '1–3',  color: 'text-gray-400',    title: 'Goles de un equipo', desc: 'Acertaste los goles de un equipo, clasificado no' },
              ].map(({ pts, color, title, desc }) => (
                <div key={title} className="flex items-center gap-4 rounded-lg bg-gray-700/50 px-4 py-2.5">
                  <span className={`w-10 shrink-0 text-center text-sm font-bold ${color}`}>{pts}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
