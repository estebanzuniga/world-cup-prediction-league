import { NavLink } from 'react-router-dom'
import { useLeague } from '../contexts/LeagueContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'text-sm font-semibold text-white'
    : 'text-sm text-gray-400 transition hover:text-white'

export default function Nav() {
  const { isOwner } = useLeague()

  return (
    <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-6">
          <span className="text-xl">⚽</span>
          <NavLink to="/" end className={linkClass}>Partidos</NavLink>
          <NavLink to="/leaderboard" className={linkClass}>Posiciones</NavLink>
          {isOwner && <NavLink to="/invite" className={linkClass}>Invitar</NavLink>}
          <NavLink to="/join" className={linkClass}>Unirse</NavLink>
        </nav>
        <NavLink to="/profile" className={linkClass}>Perfil</NavLink>
      </div>
    </header>
  )
}
