import { useEffect, useState } from 'react'
import {
  getLeaguePredictions,
  type FinishedMatchWithPredictions,
} from '../api/leagues'
import { isApiError } from '../api'
import { toSpanish } from '../utils/countryNames'

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

const KNOCKOUT_STAGES = new Set(['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'])

const BREAKDOWN_STYLES: Record<string, string> = {
  exact:    'text-green-400',
  adv_diff: 'text-emerald-400',
  adv_only: 'text-amber-400',
  result:   'text-amber-400',
  one_team: 'text-gray-400',
  none:     'text-gray-500',
}

function matchLabel(match: FinishedMatchWithPredictions) {
  const d = new Date(match.kickoffTime)
  const day = d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  return `${toSpanish(match.homeTeam)} vs ${toSpanish(match.awayTeam)} · ${day}`
}

export default function PredictionsModal({ leagueId, members, onClose }: Props) {
  const [matches, setMatches] = useState<FinishedMatchWithPredictions[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getLeaguePredictions(leagueId).then(result => {
      setLoading(false)
      if (isApiError(result)) { setError(result.error); return }
      setMatches(result.data.matches)
    })
  }, [leagueId])

  const effectiveMatchId = selectedMatchId ?? matches[0]?.id ?? ''
  const selectedMatch = matches.find(m => m.id === effectiveMatchId) ?? matches[0]

  const isLive = selectedMatch
    ? selectedMatch.status === 'LIVE' || (selectedMatch.status !== 'FINISHED' && new Date(selectedMatch.kickoffTime) <= new Date())
    : false

  const scoreDisplay = selectedMatch && selectedMatch.homeScore !== null && selectedMatch.awayScore !== null
    ? `${selectedMatch.homeScore}–${selectedMatch.awayScore}`
    : '?–?'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 sm:flex sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
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

        {/* Match selector */}
        {!loading && !error && matches.length > 0 && (
          <div className="shrink-0 px-5 pb-3">
            <select
              value={effectiveMatchId}
              onChange={e => setSelectedMatchId(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-white focus:border-blue-400 focus:outline-none"
            >
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  {matchLabel(m)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[env(safe-area-inset-bottom,1rem)]">
          {loading && <p className="py-8 text-center text-gray-500">Cargando…</p>}
          {error && <p className="py-8 text-center text-red-400">{error}</p>}
          {!loading && !error && matches.length === 0 && (
            <p className="py-8 text-center text-gray-500">Aún no hay partidos en curso o finalizados.</p>
          )}

          {!loading && !error && selectedMatch && (
            <>
              {/* Match score header */}
              <div className="mb-3 flex items-center justify-center gap-3 rounded-lg bg-gray-700/50 py-3">
                <MatchCrest url={selectedMatch.homeTeamCrestUrl} name={selectedMatch.homeTeam} />
                <div className="text-center">
                  <div className="font-mono text-xl font-bold text-white">{scoreDisplay}</div>
                </div>
                <MatchCrest url={selectedMatch.awayTeamCrestUrl} name={selectedMatch.awayTeam} />
                {isLive && (
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                )}
              </div>

              {/* Member predictions */}
              {members.map(member => {
                const pred = selectedMatch.predictions.find(p => p.userId === member.userId)
                const isPredictedDraw = pred && pred.predictedHome === pred.predictedAway
                const isKnockout = selectedMatch.stage && KNOCKOUT_STAGES.has(selectedMatch.stage)
                const advancingTeamName = isPredictedDraw && isKnockout && pred.predictedAdvancing
                  ? toSpanish(pred.predictedAdvancing === 'HOME' ? selectedMatch.homeTeam : selectedMatch.awayTeam)
                  : null
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between border-t border-gray-700 py-3 first:border-t-0"
                  >
                    <span className="text-sm text-white">{member.name}</span>
                    {pred ? (
                      <div className="ml-3 shrink-0 text-right">
                        <span className="font-mono text-sm text-gray-300">
                          {pred.predictedHome}–{pred.predictedAway}
                          {advancingTeamName && (
                            <span className="ml-1 font-sans text-xs text-gray-400">({advancingTeamName})</span>
                          )}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
