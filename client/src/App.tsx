import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { getToken } from './api'
import { LeagueProvider } from './contexts/LeagueContext'
import Nav from './components/Nav'
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

function AppLayout() {
  return (
    <LeagueProvider>
      <div className="min-h-screen bg-gray-900 pb-24">
        <Outlet />
        <Nav />
      </div>
    </LeagueProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
