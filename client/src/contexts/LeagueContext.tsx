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
}

const LeagueContext = createContext<LeagueContextValue>({
  league: null,
  leagues: [],
  setLeague: () => {},
  loading: true,
  isOwner: false,
})

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [league, setLeagueState] = useState<League | null>(null)
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyLeagues().then(result => {
      setLoading(false)
      if (isApiError(result)) return
      setLeagues(result.data.leagues)
      if (result.data.leagues.length > 0) setLeagueState(result.data.leagues[0])
    })
  }, [])

  const isOwner = leagues.some(l => l.createdBy === getCurrentUserId())

  return (
    <LeagueContext.Provider value={{ league, leagues, setLeague: setLeagueState, loading, isOwner }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague() {
  return useContext(LeagueContext)
}
