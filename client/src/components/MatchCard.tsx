import { useState } from 'react'
import type { Match, MyPrediction } from '../api/matches'
import { submitPrediction } from '../api/predictions'
import { isApiError } from '../api'

interface Props {
  match: Match
  onUnauthorized: () => void
}

function PointsBadge({ breakdown, points }: { breakdown: NonNullable<MyPrediction['breakdown']>; points: number }) {
  const styles = {
    exact:  'bg-green-600 text-white',
    result: 'bg-amber-500 text-white',
    none:   'bg-gray-600 text-gray-300',
  } as const

  const labels = {
    exact:  `${points} pts ✓`,
    result: `${points} pt`,
    none:   '0 pts',
  } as const

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[breakdown]}`}>
      {labels[breakdown]}
    </span>
  )
}

function ScoreInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={2}
      placeholder="–"
      value={value}
      onFocus={e => e.target.select()}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
      className="w-11 rounded border border-gray-600 bg-gray-700 px-1 py-1 text-center text-lg font-mono text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
    />
  )
}

function formatKickoff(iso: string) {
  // No explicit locale or timeZone: render in the user's own
  return new Date(iso).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MatchCard({ match, onUnauthorized }: Props) {
  const [home, setHome] = useState(
    match.myPrediction ? String(match.myPrediction.predictedHome) : ''
  )
  const [away, setAway] = useState(
    match.myPrediction ? String(match.myPrediction.predictedAway) : ''
  )
  const [prediction, setPrediction] = useState<MyPrediction | null>(match.myPrediction)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isUpcoming = match.status === 'SCHEDULED'
  const isLive = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (home === '' || away === '') return
    const predictedHome = Number(home)
    const predictedAway = Number(away)
    setSaving(true)
    setError(null)
    const result = await submitPrediction(match.id, predictedHome, predictedAway)
    setSaving(false)
    if (isApiError(result)) {
      if (result.statusCode === 401) { onUnauthorized(); return }
      if (result.statusCode === 403) { setError('Los pronósticos están cerrados para este partido.'); return }
      setError(result.error)
      return
    }
    setPrediction({ predictedHome, predictedAway, points: null, breakdown: null })
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 2500)
  }

  const hasExisting = prediction !== null

  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-800 px-4 py-3 shadow-sm">
      <span className="text-xs text-gray-400 mb-2">{formatKickoff(match.kickoffTime)}</span>

      {/* Match row */}
      <div className="relative flex w-full items-center gap-3">
        {/* Home team */}
        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-white">
          {match.homeTeam}
        </span>

        {/* Center: score or form */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isFinished && (
            <span className="font-mono text-xl font-bold text-white">
              {match.homeScore} – {match.awayScore}
            </span>
          )}

          {isLive && (
            <span className="font-mono text-xl font-bold text-green-400">
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </span>
          )}

          {isUpcoming && (
            <form
              id={`predict-${match.id}`}
              onSubmit={handleSubmit}
              className="flex items-center gap-1.5"
            >
              <ScoreInput value={home} onChange={setHome} />
              <span className="text-gray-400">–</span>
              <ScoreInput value={away} onChange={setAway} />
            </form>
          )}
        </div>

        {/* Away team */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
          {match.awayTeam}
        </span>
      </div>

      {/* Sub-rows for upcoming matches: feedback, then kickoff time, then submit */}
      { isUpcoming && (
        <div className="mt-2 flex flex-col items-center gap-1">
          { prediction &&
            <div className="min-h-[1rem] text-xs">
              {error && <span className="text-red-400">{error}</span>}
              {savedAt && !error && <span className="text-green-400">¡Guardado!</span>}
              {!error && !savedAt && hasExisting && (
                <span className="text-gray-500">
                  Tu pronóstico: {prediction!.predictedHome}–{prediction!.predictedAway}
                </span>
              )}
            </div>
          }
          <button
            type="submit"
            form={`predict-${match.id}`}
            disabled={saving || home === '' || away === ''}
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? '…' : hasExisting ? 'Actualizar' : 'Pronosticar'}
          </button>
        </div>
      )}

      {/* Sub-row: user prediction for finished matches, feedback for upcoming */}
      {isFinished && prediction && (
        <p className="mt-1.5 text-right text-xs text-gray-400">
          Tu pronóstico: {prediction.predictedHome}–{prediction.predictedAway}
        </p>
      )}

      {/* Status row: live/finished badges, then user prediction for finished matches, then feedback for upcoming */}
      {(isLive || isFinished) && (
        <div className="py-2">
          {isLive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
              EN VIVO
            </span>
          )}
          {isFinished && prediction && (
            <PointsBadge breakdown={prediction.breakdown ?? 'none'} points={prediction.points ?? 0} />
          )}
          {isFinished && !prediction && (
            <span className="text-xs text-gray-500">Sin pronóstico</span>
          )}
        </div>
      )}

    </div>
  )
}
