import { useEffect, useState } from 'react'
import type { Match } from '../api/matches'
import { getMatches } from '../api/matches'
import { isApiError } from '../api'
import { useNavigate } from 'react-router-dom'
import { removeToken, logout } from '../api'
import MatchCard from '../components/MatchCard'
import { useLeague } from '../contexts/LeagueContext'
import { ChevronDownIcon } from '../components/icons'

function toDateKey(iso: string) {
  // Key by the user's local calendar day, not the UTC one
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateLabel(iso: string) {
  // Spanish weekday/month names, in the user's local timezone
  return new Date(iso).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function groupByDate(matches: Match[]): [string, string, Match[]][] {
  const map = new Map<string, { label: string; matches: Match[] }>()
  for (const m of matches) {
    const key = toDateKey(m.kickoffTime)
    if (!map.has(key)) map.set(key, { label: formatDateLabel(m.kickoffTime), matches: [] })
    map.get(key)!.matches.push(m)
  }
  return [...map.entries()].map(([key, { label, matches }]) => [key, label, matches])
}

function MatchdaySection({
  label,
  matches,
  onUnauthorized,
}: {
  label: string
  matches: Match[]
  onUnauthorized: () => void
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </h2>
      <div className="space-y-2">
        {matches.map(m => (
          <MatchCard key={m.id} match={m} onUnauthorized={onUnauthorized} />
        ))}
      </div>
    </section>
  )
}

function PastMatchesSection({
  groups,
  onUnauthorized,
}: {
  groups: [string, string, Match[]][]
  onUnauthorized: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-800/40">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-700/30 rounded-xl"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700">
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
        <span className="text-sm font-semibold text-gray-300">Resultados anteriores</span>
      </button>

      {open && (
        <div className="border-t border-gray-700/60 px-4 pb-4 pt-4 space-y-6">
          {groups.map(([key, label, dayMatches]) => (
            <MatchdaySection
              key={key}
              label={label}
              matches={dayMatches}
              onUnauthorized={onUnauthorized}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MatchesPage() {
  const navigate = useNavigate()
  const { league, loading: leagueLoading } = useLeague()
  const [matches, setMatches] = useState<Match[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUnauthorized() {
    await logout()
    removeToken()
    navigate('/login')
  }

  useEffect(() => {
    if (leagueLoading || !league) return
    setMatchesLoading(true)
    getMatches().then(result => {
      setMatchesLoading(false)
      if (isApiError(result)) {
        if (result.statusCode === 401) { handleUnauthorized(); return }
        setError(result.error)
        return
      }
      setMatches(result.data.matches)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueLoading, league])

  const loading = leagueLoading || matchesLoading

  const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'LIVE')
  const past = matches.filter(m => m.status === 'FINISHED')

  const upcomingGroups = groupByDate(
    [...upcoming].sort((a, b) => a.kickoffTime.localeCompare(b.kickoffTime)),
  )
  const pastGroups = groupByDate(
    [...past].sort((a, b) => b.kickoffTime.localeCompare(a.kickoffTime)),
  )

  const liveCount = matches.filter(m => m.status === 'LIVE').length

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Cargando…</div>
  }

  if (!league) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold text-white">Aún no estás en una liga</p>
        <p className="mt-2 text-sm text-gray-400">
          Necesitas que te inviten a una liga antes de poder hacer pronósticos.
          Pídele el enlace de invitación al dueño de la liga.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {liveCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-900/30 px-3 py-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-sm font-medium text-green-400">{liveCount} partido{liveCount > 1 ? 's' : ''} en vivo</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {!error && (
        <div className="space-y-6">
          {pastGroups.length > 0 && (
            <PastMatchesSection
              groups={pastGroups}
              onUnauthorized={handleUnauthorized}
            />
          )}

          {upcomingGroups.length > 0 && (
            <div>
              <h1 className="mb-4 text-lg font-bold text-white">Próximos partidos</h1>
              <div className="space-y-6">
                {upcomingGroups.map(([key, label, dayMatches]) => (
                  <MatchdaySection
                    key={key}
                    label={label}
                    matches={dayMatches}
                    onUnauthorized={handleUnauthorized}
                  />
                ))}
              </div>
            </div>
          )}

          {upcomingGroups.length === 0 && pastGroups.length === 0 && (
            <p className="py-20 text-center text-gray-500">Aún no hay partidos.</p>
          )}
        </div>
      )}
    </main>
  )
}
