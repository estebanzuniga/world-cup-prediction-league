import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import PWAInstall from '@khmyznikov/pwa-install/react-legacy'
import { getToken } from './api'
import { LeagueProvider, useLeague } from './contexts/LeagueContext'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import Nav from './components/Nav'
import { ChevronDownIcon } from './components/icons'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MatchesPage from './pages/MatchesPage'
import LeaderboardPage from './pages/LeaderboardPage'
import InvitePage from './pages/InvitePage'
import JoinPage from './pages/JoinPage'
import ProfilePage from './pages/ProfilePage'

function SessionGuard() {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = () => navigate('/login', { replace: true })
    window.addEventListener('session-expired', handler)
    return () => window.removeEventListener('session-expired', handler)
  }, [navigate])
  return null
}

function RequireAuth() {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />
  }
  return <Outlet />
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 shadow-lg transition-opacity hover:bg-gray-600 active:scale-95"
      aria-label="Volver arriba"
    >
      <ChevronDownIcon className="h-5 w-5 rotate-180 text-white" />
    </button>
  )
}

function AppInner() {
  const { refreshLeagues, loading } = useLeague()
  const { isRefreshing, setIsRefreshing } = usePullToRefresh(refreshLeagues)

  useEffect(() => {
    if (!loading) setIsRefreshing(false)
  }, [loading, setIsRefreshing])

  return (
    <>
      {isRefreshing && (
        <div className="flex justify-center py-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-green-400" />
        </div>
      )}
      <Outlet />
      <Nav />
      <ScrollToTopButton />
    </>
  )
}

function AppLayout() {
  return (
    <LeagueProvider>
      <div className="min-h-screen bg-gray-900 pb-24" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <AppInner />
      </div>
    </LeagueProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <PWAInstall
        name="Goalcaster"
        icon="/icon-512.png"
        description="Pronostica los partidos del Mundial 2026 y compite con tus amigos."
        manifestUrl="/manifest.webmanifest"
      />
      <SessionGuard />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<MatchesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/join/:token" element={<JoinPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
