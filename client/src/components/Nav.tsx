import { NavLink } from 'react-router-dom'
import { useLeague } from '../contexts/LeagueContext'
import { CalendarIcon, TrophyIcon, EnvelopeIcon, UserIcon } from './icons'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
    isActive ? 'text-white' : 'text-gray-500'
  }`

export default function Nav() {
  const { isOwner } = useLeague()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex">
        <NavLink to="/" end className={tabClass}>
          <CalendarIcon className="text-sky-400" />
          Partidos
        </NavLink>
        <NavLink to="/leaderboard" className={tabClass}>
          <TrophyIcon className="text-amber-400" />
          Posiciones
        </NavLink>
        {isOwner && (
          <NavLink to="/invite" className={tabClass}>
            <EnvelopeIcon className="text-violet-400" />
            Invitar
          </NavLink>
        )}
        <NavLink to="/profile" className={tabClass}>
          <UserIcon className="text-emerald-400" />
          Perfil
        </NavLink>
      </div>
    </nav>
  )
}
