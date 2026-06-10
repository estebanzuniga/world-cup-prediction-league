import { useEffect, useState } from 'react'
import { useLeague } from '../contexts/LeagueContext'
import { getLeaderboard, type LeaderboardEntry } from '../api/leagues'
import { isApiError } from '../api'

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600',
  'bg-rose-600', 'bg-amber-600', 'bg-cyan-600',
]

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
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

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(name)}`}
    >
      {initials(name)}
    </div>
  )
}

export default function LeaderboardPage() {
  const { league, loading: leagueLoading } = useLeague()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!league) return
    setLoading(true)
    getLeaderboard(league.id).then(result => {
      setLoading(false)
      if (isApiError(result)) { setError(result.error); return }
      setEntries(result.data.leaderboard)
    })
  }, [league])

  if (leagueLoading || loading) {
    return (
      <div className="py-20 text-center text-gray-500">Loading…</div>
    )
  }

  if (!league) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-gray-400">You are not in a league yet.</p>
        <p className="mt-1 text-sm text-gray-500">
          Ask someone to share an invite link, or create a league from the Invite page.
        </p>
      </main>
    )
  }

  if (error) {
    return <div className="py-20 text-center text-red-400">{error}</div>
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-lg font-bold text-white">{league.name}</h1>
      <p className="mb-6 text-sm text-gray-400">
        {entries.length} member{entries.length !== 1 ? 's' : ''}
      </p>

      <div className="overflow-hidden rounded-xl bg-gray-800 shadow">
        {entries.length === 0 ? (
          <p className="px-6 py-10 text-center text-gray-500">
            No points yet — predict some matches!
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

              <Avatar name={entry.name} url={entry.avatarUrl} />

              <span className="min-w-0 flex-1 truncate font-medium text-white">
                {entry.name}
              </span>

              <div className="flex items-center gap-5 text-sm">
                <div className="text-right">
                  <span className="text-xl font-bold text-white">{entry.totalPoints}</span>
                  <span className="ml-1 text-xs text-gray-400">pts</span>
                </div>
                <div className="w-16 text-right text-xs text-gray-400">
                  <span className="font-semibold text-white">{entry.exactScoreCount}</span>{' '}
                  exact
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
