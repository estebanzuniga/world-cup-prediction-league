import { useState } from 'react'
import type { Match, MyPrediction } from '../api/matches'
import { submitPrediction } from '../api/predictions'
import { isApiError } from '../api'

interface Props {
  match: Match
  onUnauthorized: () => void
}

function PointsBadge({ breakdown, points }: { breakdown: MyPrediction['breakdown']; points: number }) {
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
  value: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={e => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
      className="w-11 rounded border border-gray-600 bg-gray-700 px-1 py-1 text-center text-lg font-mono text-white focus:border-blue-400 focus:outline-none"
    />
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

export default function MatchCard({ match, onUnauthorized }: Props) {
  const [home, setHome] = useState(match.myPrediction?.predictedHome ?? 0)
  const [away, setAway] = useState(match.myPrediction?.predictedAway ?? 0)
  const [prediction, setPrediction] = useState<MyPrediction | null>(match.myPrediction)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isUpcoming = match.status === 'SCHEDULED'
  const isLive = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await submitPrediction(match.id, home, away)
    setSaving(false)
    if (isApiError(result)) {
      if (result.statusCode === 401) { onUnauthorized(); return }
      if (result.statusCode === 403) { setError('Predictions are locked for this match.'); return }
      setError(result.error)
      return
    }
    setPrediction({ predictedHome: home, predictedAway: away, points: 0, breakdown: 'none' })
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 2500)
  }

  const hasExisting = prediction !== null

  return (
    <div className="rounded-lg bg-gray-800 px-4 py-3 shadow-sm">
      {/* Match row */}
      <div className="flex items-center gap-3">
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
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <ScoreInput value={home} onChange={setHome} />
              <span className="text-gray-400">–</span>
              <ScoreInput value={away} onChange={setAway} />
              <button
                type="submit"
                disabled={saving}
                className="ml-1 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? '…' : hasExisting ? 'Update' : 'Predict'}
              </button>
            </form>
          )}
        </div>

        {/* Away team */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
          {match.awayTeam}
        </span>

        {/* Right slot: time, live badge, or points badge */}
        <div className="ml-2 shrink-0 text-right">
          {isUpcoming && (
            <span className="text-xs text-gray-400">{formatTime(match.kickoffTime)} UTC</span>
          )}
          {isLive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
              LIVE
            </span>
          )}
          {isFinished && prediction && (
            <PointsBadge breakdown={prediction.breakdown} points={prediction.points} />
          )}
          {isFinished && !prediction && (
            <span className="text-xs text-gray-500">No pick</span>
          )}
        </div>
      </div>

      {/* Sub-row: user prediction for finished matches, feedback for upcoming */}
      {isFinished && prediction && (
        <p className="mt-1.5 text-right text-xs text-gray-400">
          Your pick: {prediction.predictedHome}–{prediction.predictedAway}
        </p>
      )}

      {isUpcoming && (
        <div className="mt-1 min-h-[1.25rem] text-right text-xs">
          {error && <span className="text-red-400">{error}</span>}
          {savedAt && !error && (
            <span className="text-green-400">Saved!</span>
          )}
          {!error && !savedAt && hasExisting && (
            <span className="text-gray-500">
              Current pick: {prediction!.predictedHome}–{prediction!.predictedAway}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
