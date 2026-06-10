import { useState } from 'react'
import { useLeague } from '../contexts/LeagueContext'

export default function InvitePage() {
  const { league, loading, isOwner } = useLeague()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/join/${league!.inviteCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Loading…</div>
  }

  if (!league || !isOwner) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-gray-400">This page is only available to the league owner.</p>
      </main>
    )
  }

  const joinUrl = `${window.location.origin}/join/${league.inviteCode}`

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-lg font-bold text-white">Invite friends</h1>
      <p className="mb-8 text-sm text-gray-400">
        Share this code or link to invite people to{' '}
        <span className="text-white">{league.name}</span>.
      </p>

      <div className="rounded-xl bg-gray-800 p-8 text-center shadow">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Invite code
        </p>
        <p className="font-mono text-5xl font-bold tracking-widest text-white">
          {league.inviteCode}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-gray-800 px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-gray-400">
          {joinUrl}
        </span>
        <button
          onClick={handleCopy}
          className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </main>
  )
}
