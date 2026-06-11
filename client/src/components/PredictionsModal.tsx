import { useEffect, useState } from 'react'
import {
  getLeaguePredictions,
  type FinishedMatchWithPredictions,
} from '../api/leagues'
import { isApiError } from '../api'

interface Props {
  leagueId: string
  members: { userId: string; name: string }[]
  onClose: () => void
}

function MatchCrest({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="h-6 w-6 overflow-hidden rounded-full ring-1 ring-white/20">
      {url
        ? <img src={url} alt={name} className="h-full w-full object-cover" />
        : <div className="h-full w-full bg-white/10" />
      }
    </div>
  )
}

const BREAKDOWN_STYLES = {
  exact: 'text-green-400',
  result: 'text-amber-400',
  none: 'text-gray-500',
} as const

export default function PredictionsModal({ leagueId, members, onClose }: Props) {
  const [matches, setMatches] = useState<FinishedMatchWithPredictions[]>([])
  const [selectedUserId, setSelectedUserId] = useState(members[0]?.userId ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fall back to the first member if the selected one left the list (league switch)
  const effectiveUserId = members.some(m => m.userId === selectedUserId)
    ? selectedUserId
    : members[0]?.userId ?? ''

  useEffect(() => {
    setLoading(true)
    setError(null)
    getLeaguePredictions(leagueId).then(result => {
      setLoading(false)
      if (isApiError(result)) { setError(result.error); return }
      setMatches(result.data.matches)
    })
  }, [leagueId])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 sm:flex sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      {/* Bottom sheet on mobile, centered modal on sm+ */}
      <div
        className="fixed inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-gray-800 shadow-xl sm:relative sm:inset-auto sm:w-full sm:max-w-md sm:rounded-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle (mobile only) */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-gray-600 sm:hidden" />

        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-4">
          <h2 className="text-lg font-bold text-white">Pronósticos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="shrink-0 px-5 pb-3">
          <select
            value={effectiveUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-white focus:border-blue-400 focus:outline-none"
          >
            {members.map(m => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[env(safe-area-inset-bottom,1rem)]">
          {loading && <p className="py-8 text-center text-gray-500">Cargando…</p>}
          {error && <p className="py-8 text-center text-red-400">{error}</p>}
          {!loading && !error && matches.length === 0 && (
            <p className="py-8 text-center text-gray-500">Aún no hay partidos en curso o finalizados.</p>
          )}
          {!loading &&
            !error &&
            matches.map(match => {
              const pred = match.predictions.find(p => p.userId === effectiveUserId)
              const isLive = match.status === 'LIVE' || (match.status !== 'FINISHED' && new Date(match.kickoffTime) <= new Date())
              const scoreDisplay = match.homeScore !== null && match.awayScore !== null
                ? `${match.homeScore}–${match.awayScore}`
                : '?–?'
              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between border-t border-gray-700 py-3 first:border-t-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MatchCrest url={match.homeTeamCrestUrl} name={match.homeTeam} />
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-sm font-bold text-white">{scoreDisplay}</span>
                    </div>
                    <MatchCrest url={match.awayTeamCrestUrl} name={match.awayTeam} />
                    {isLive && (
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    )}
                  </div>
                  {pred ? (
                    <div className="ml-3 shrink-0 text-right">
                      <span className="font-mono text-sm text-gray-300">
                        {pred.predictedHome}–{pred.predictedAway}
                      </span>
                      {!isLive && pred.breakdown !== null && (
                        <span className={`ml-2 text-xs font-semibold ${BREAKDOWN_STYLES[pred.breakdown]}`}>
                          {pred.points} pts
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="ml-3 shrink-0 text-xs text-gray-500">Sin pronóstico</span>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
