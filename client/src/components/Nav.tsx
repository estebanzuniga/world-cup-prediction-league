import { NavLink, useNavigate } from 'react-router-dom'
import { logout, removeToken } from '../api'
import { useLeague } from '../contexts/LeagueContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'text-sm font-semibold text-white'
    : 'text-sm text-gray-400 transition hover:text-white'

export default function Nav() {
  const navigate = useNavigate()
  const { isOwner } = useLeague()

  async function handleLogout() {
    await logout()
    removeToken()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-6">
          <span className="text-xl">⚽</span>
          <NavLink to="/" end className={linkClass}>Matches</NavLink>
          <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
          {isOwner && <NavLink to="/invite" className={linkClass}>Invite</NavLink>}
        </nav>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
