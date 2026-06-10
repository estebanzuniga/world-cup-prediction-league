import { useEffect, useMemo, useState } from 'react'
import { getCurrentUserId } from '../api'
import LeagueSelect from '../components/LeagueSelect'
import { useLeague } from '../contexts/LeagueContext'

export default function InvitePage() {
  const { leagues, loading } = useLeague()
  const [league, setLeague] = useState<(typeof leagues)[0] | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  
  const ownedLeagues = useMemo(() => leagues.filter(l => l.createdBy === getCurrentUserId()), [leagues])

  useEffect(() => {
    if (ownedLeagues.length > 0 && !league) setLeague(ownedLeagues[0])
  }, [ownedLeagues, league])

  const isOwner = !!league && league.createdBy === getCurrentUserId()

  async function handleCopyCode() {
    await navigator.clipboard.writeText(league!.inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2500)
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/join/${league!.inviteCode}`
    await navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Cargando…</div>
  }

  if (ownedLeagues.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-gray-400">Esta página solo está disponible para el dueño de la liga.</p>
      </main>
    )
  }

  if (!league) return null

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-lg font-bold text-white">Invitar amigos</h1>
      <p className="mb-4 text-sm text-gray-400">
        Comparte este código o enlace para invitar gente a{' '}
        <span className="text-white">{league?.name}</span>.
      </p>

      <LeagueSelect className="mb-8" leagues={ownedLeagues} value={league} onChange={setLeague} />

      {isOwner ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-800 p-8 text-center shadow">
            <div className="relative mb-4 flex items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Código de invitación
              </p>
              <button
                onClick={handleCopyCode}
                className={`absolute right-0 px-3 py-1 rounded-lg text-sm font-medium transition ${
                  copiedCode
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {copiedCode ? '¡Copiado!' : 'Copiar código'}
              </button>
            </div>
            <p className="font-mono text-5xl font-bold tracking-widest text-white">
              {league.inviteCode}
            </p>
          </div>

          <div className="rounded-xl bg-gray-800 px-6 py-5 shadow">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Obtener enlace
            </p>
            <div className="flex items-center gap-3">
              <p className="flex-1 truncate font-mono text-sm text-gray-400">
                {`${window.location.origin}/join/${league.inviteCode}`}
              </p>
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-3 py-1 rounded-lg text-sm font-medium transition ${
                  copiedLink
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {copiedLink ? '¡Copiado!' : 'Copiar enlace'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-800 p-8 text-center text-gray-400 shadow">
          Solo el dueño de <span className="text-white">{league.name}</span> puede compartir su
          código de invitación
        </div>
      )}
    </main>
  )
}
