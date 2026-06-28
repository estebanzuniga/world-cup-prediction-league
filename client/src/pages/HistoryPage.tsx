import { useEffect, useRef, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useLeague } from '../contexts/LeagueContext'
import LeagueSelect from '../components/LeagueSelect'
import { getLeagueHistory, type HistoryMember, type HistoryDataPoint } from '../api/leagues'
import { isApiError } from '../api'

const LINE_COLORS = [
  '#f87171',
  '#f472b6',
  '#60a5fa',
  '#facc15',
  '#a78bfa',
  '#fb923c',
  '#34d399',
  '#38bdf8',
  '#fbbf24',
  '#4ade80',
  '#22d3ee',
  '#818cf8',
  '#a3e635',
]

function shortName(full: string) {
  const parts = full.trim().split(/\s+/)
  return parts.length >= 2 ? `${parts[0]} ${parts[1][0]}.` : parts[0]
}

interface ChartPoint {
  index: number
  label: string
  [userId: string]: number | string
}

interface TooltipEntry {
  dataKey: string
  value: number
  stroke: string
  payload: ChartPoint
}

export default function HistoryPage() {
  const { leagues, loading: leagueLoading, refreshKey } = useLeague()
  const [league, setLeague] = useState<(typeof leagues)[0] | null>(null)
  const [members, setMembers] = useState<HistoryMember[]>([])
  const [history, setHistory] = useState<HistoryDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipData, setTipData] = useState<{ payload: TooltipEntry[]; point: ChartPoint } | null>(null)
  const lastIndexRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (leagues.length > 0 && !league) setLeague(leagues[0])
  }, [leagues, league])

  useEffect(() => {
    if (!league) return
    setLoading(true)
    setError(null)
    getLeagueHistory(league.id).then((result) => {
      setLoading(false)
      if (isApiError(result)) { setError(result.error); return }
      setMembers(result.data.members)
      setHistory(result.data.history)
    })
  }, [league, refreshKey])

  useEffect(() => {
    if (history.length === 0 || !scrollRef.current) return
    const el = scrollRef.current
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth })
    })
  }, [history])

  if (leagueLoading || loading) {
    return <div className="py-20 text-center text-gray-500">Cargando…</div>
  }

  if (!league) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold text-white">Aún no estás en una liga</p>
        <p className="mt-2 text-sm text-gray-400">
          Necesitas que te inviten a una liga antes de poder ver la evolución de puntos.
          Pídele el enlace de invitación al dueño de la liga.
        </p>
      </main>
    )
  }

  if (error) {
    return <div className="py-20 text-center text-red-400">{error}</div>
  }

  const startEntry: ChartPoint = { index: 0, label: 'Inicio' }
  for (const m of members) startEntry[m.userId] = 0
  const chartData: ChartPoint[] = [
    startEntry,
    ...history.map((pt, i) => {
      const entry: ChartPoint = { index: i + 1, label: pt.label }
      for (const [uid, pts] of Object.entries(pt.cumulative)) entry[uid] = pts
      return entry
    }),
  ]

  const chartWidth = Math.max(360, chartData.length * 32)
  const tip = tipData

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-2 w-full rounded-lg bg-gray-800/40 px-3 py-2 text-center">
        {leagues.length > 1 ? (
          <LeagueSelect className="w-full text-lg font-bold" leagues={leagues} value={league} onChange={setLeague} />
        ) : (
          <h1 className="truncate text-lg font-bold text-white">{league.name}</h1>
        )}
      </div>

      <h1 className="mb-4 text-lg font-bold text-white">Evolución de puntos</h1>

      {history.length === 0 ? (
        <div className="rounded-xl bg-gray-800 px-6 py-10 text-center text-gray-500">
          Aún no hay partidos finalizados — ¡vuelve después del primer partido!
        </div>
      ) : (
        <div className="rounded-xl bg-gray-800 p-4 shadow">

          {/* Info panel */}
          <div className="mb-3 flex min-h-[52px] flex-col items-center justify-center rounded-lg bg-gray-700/40 px-3 py-2">
            {tip ? (
              <>
                <p className="mb-1.5 text-center text-xs font-semibold text-gray-300">
                  {tip.point.index === 0 ? 'Inicio' : `Partido ${tip.point.index}: ${tip.point.label}`}
                </p>
                <div className="flex flex-wrap justify-center gap-y-1">
                  {[...tip.payload].sort((a, b) => b.value - a.value).map((entry) => {
                    const member = members.find((m) => m.userId === entry.dataKey)
                    return (
                      <div key={entry.dataKey} className="flex w-1/2 items-center justify-center gap-1.5 text-xs">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: entry.stroke }} />
                        <span className="text-gray-300">{member ? shortName(member.name) : entry.dataKey}</span>
                        <span className="font-bold text-white">{entry.value} pts</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-center text-xs text-gray-600">Toca el gráfico para ver detalles</p>
            )}
          </div>

          {/* Chart */}
          <div
            ref={scrollRef}
            className="overflow-x-auto"
            style={{ height: 'calc(100dvh - 500px)', minHeight: 200 }}
            onMouseLeave={() => { lastIndexRef.current = null; setTipData(null) }}
          >
            <div style={{ width: chartWidth, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis
                    dataKey="index"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={(props: unknown) => {
                      const p = props as { active?: boolean; payload?: TooltipEntry[] }
                      if (!p.active || !p.payload?.length) {
                        if (lastIndexRef.current !== null) {
                          lastIndexRef.current = null
                          queueMicrotask(() => setTipData(null))
                        }
                      } else {
                        const index = (p.payload[0].payload as ChartPoint).index
                        if (index !== lastIndexRef.current) {
                          lastIndexRef.current = index
                          const point = p.payload[0].payload as ChartPoint
                          const payload = p.payload as TooltipEntry[]
                          queueMicrotask(() => setTipData({ payload, point }))
                        }
                      }
                      return null
                    }}
                    cursor={{ stroke: '#4b5563', strokeWidth: 1 }}
                  />
                  {members.map((member, i) => (
                    <Line
                      key={member.userId}
                      type="monotone"
                      dataKey={member.userId}
                      name={member.name}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-1 text-center text-xs text-gray-500">Partido</p>

        </div>
      )}
    </main>
  )
}
