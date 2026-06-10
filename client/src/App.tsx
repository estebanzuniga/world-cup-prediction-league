import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
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

function RequireAuth() {
  return getToken() ? <Outlet /> : <Navigate to="/login" replace />
}

function AppLayout() {
  return (
    <LeagueProvider>
      <div className="min-h-screen bg-gray-900">
        <Nav />
        <Outlet />
      </div>
    </LeagueProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<MatchesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
