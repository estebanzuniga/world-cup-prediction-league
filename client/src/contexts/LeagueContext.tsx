import { createContext, useContext, useEffect, useState } from 'react'
import type { League } from '../api/leagues'
import { getMyLeagues } from '../api/leagues'
import { isApiError, getCurrentUserId } from '../api'

interface LeagueContextValue {
  league: League | null
  leagues: League[]
  setLeague: (l: League) => void
  loading: boolean
  isOwner: boolean
  refreshLeagues: () => void
  refreshKey: number
}

const LeagueContext = createContext<LeagueContextValue>({
  league: null,
  leagues: [],
  setLeague: () => {},
  loading: true,
  isOwner: false,
  refreshLeagues: () => {},
  refreshKey: 0,
})

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [league, setLeagueState] = useState<League | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    getMyLeagues().then(result => {
      setLoading(false)
      if (isApiError(result)) return
      const fetched = result.data.leagues
      setLeagues(fetched)
      setLeagueState(prev => prev ?? fetched[0] ?? null)
    })
  }, [refreshKey])

  const isOwner = leagues.some(l => l.createdBy === getCurrentUserId())
  const refreshLeagues = () => {
    setLoading(true)
    setRefreshKey(k => k + 1)
  }

  return (
    <LeagueContext.Provider value={{ league, leagues, setLeague: setLeagueState, loading, isOwner, refreshLeagues, refreshKey }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague() {
  return useContext(LeagueContext)
}
