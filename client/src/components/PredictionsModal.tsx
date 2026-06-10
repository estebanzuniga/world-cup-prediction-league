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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-gray-800 p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Pronósticos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <select
          value={effectiveUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          className="mb-4 w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-white focus:border-blue-400 focus:outline-none"
        >
          {members.map(m => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>

        <div className="overflow-y-auto">
          {loading && <p className="py-8 text-center text-gray-500">Cargando…</p>}
          {error && <p className="py-8 text-center text-red-400">{error}</p>}
          {!loading && !error && matches.length === 0 && (
            <p className="py-8 text-center text-gray-500">Aún no hay partidos finalizados.</p>
          )}
          {!loading &&
            !error &&
            matches.map(match => {
              const pred = match.predictions.find(p => p.userId === effectiveUserId)
              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between border-t border-gray-700 py-2.5 first:border-t-0"
                >
                  <p className="min-w-0 truncate text-sm text-white">
                    {match.homeTeam}{' '}
                    <span className="font-mono font-bold">
                      {match.homeScore}–{match.awayScore}
                    </span>{' '}
                    {match.awayTeam}
                  </p>
                  {pred ? (
                    <div className="ml-3 shrink-0 text-right">
                      <span className="font-mono text-sm text-gray-300">
                        {pred.predictedHome}–{pred.predictedAway}
                      </span>
                      <span
                        className={`ml-2 text-xs font-semibold ${BREAKDOWN_STYLES[pred.breakdown]}`}
                      >
                        {pred.points} pts
                      </span>
                    </div>
                  ) : (
                    <span className="ml-3 py-1 shrink-0 text-xs text-gray-500">Sin pronóstico</span>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
