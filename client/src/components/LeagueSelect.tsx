import type { League } from '../api/leagues'

export default function LeagueSelect({
  className = '',
  leagues,
  value,
  onChange,
}: {
  className?: string
  leagues: League[]
  value: League | null
  onChange: (l: League) => void
}) {
  if (!value || leagues.length < 2) return null

  const selectedId = leagues.find(l => l.id === value.id) ? value.id : (leagues[0]?.id ?? '')

  return (
    <select
      value={selectedId}
      onChange={e => {
        const next = leagues.find(l => l.id === e.target.value)
        if (next) onChange(next)
      }}
      className={`block rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white focus:border-blue-400 focus:outline-none ${className}`}
    >
      {leagues.map(l => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  )
}
