import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useLeague } from '../contexts/LeagueContext'
import LeagueSelect from '../components/LeagueSelect'
import { getLeagueHistory, type HistoryMember, type HistoryDataPoint } from '../api/leagues'
import { isApiError } from '../api'

function shortName(full: string) {
  const parts = full.trim().split(/\s+/)
  return parts.length >= 2 ? `${parts[0]} ${parts[1][0]}.` : parts[0]
}

const LINE_COLORS = [
  '#4ade80',
  '#60a5fa',
  '#f87171',
  '#facc15',
  '#a78bfa',
  '#fb923c',
  '#34d399',
  '#38bdf8',
  '#fbbf24',
  '#f472b6',
  '#22d3ee',
  '#818cf8',
  '#a3e635',
]

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

interface TooltipData {
  payload: TooltipEntry[]
}

function TooltipPopover({ data, mouseY, members }: {
  data: TooltipData
  mouseY: number
  members: HistoryMember[]
}) {
  const point = data.payload[0].payload
  const sorted = [...data.payload].sort((a, b) => b.value - a.value)
  const flipY = mouseY > window.innerHeight * 0.65

  return createPortal(
    <div
      className="pointer-events-none rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl"
      style={{
        position: 'fixed',
        zIndex: 9999,
        width: 'max-content',
        left: '50%',
        transform: 'translateX(-50%)',
        ...(flipY ? { bottom: window.innerHeight - mouseY + 12 } : { top: mouseY + 12 }),
      }}
    >
      <p className="mb-2 text-center text-xs font-semibold text-gray-300">
        {point.index === 0 ? 'Inicio' : `Partido ${point.index}: ${point.label}`}
      </p>
      {sorted.map((entry) => {
        const member = members.find((m) => m.userId === entry.dataKey)
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.stroke }} />
            <span className="text-gray-300">{member ? shortName(member.name) : entry.dataKey}</span>
            <span className="ml-auto pl-4 font-bold text-white">{entry.value} pts</span>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

export default function HistoryPage() {
  const { leagues, loading: leagueLoading, refreshKey } = useLeague()
  const [league, setLeague] = useState<(typeof leagues)[0] | null>(null)
  const [members, setMembers] = useState<HistoryMember[]>([])
  const [history, setHistory] = useState<HistoryDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const tooltipDataRef = useRef<TooltipData | null>(null)
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
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth
      })
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
          <div
            ref={scrollRef}
            className="overflow-x-auto"
            style={{ height: 'calc(100dvh - 320px)', minHeight: 220 }}
            onMouseMove={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setCursorPos(null)}
          >
            <div style={{ width: chartWidth, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                >
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
                      const p = props as { active?: boolean; payload?: TooltipEntry[]; coordinate?: { x: number; y: number } }
                      tooltipDataRef.current = (p.active && p.payload?.length)
                        ? { payload: p.payload }
                        : null
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
          <p className="mb-1 text-center text-xs text-gray-500">Partido</p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-2">
            {members.map((member, i) => (
              <div key={member.userId} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
                />
                <span className="text-xs text-gray-300">{shortName(member.name)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cursorPos && tooltipDataRef.current && (
        <TooltipPopover
          data={tooltipDataRef.current}
          mouseY={cursorPos.y}
          members={members}
        />
      )}
    </main>
  )
}
