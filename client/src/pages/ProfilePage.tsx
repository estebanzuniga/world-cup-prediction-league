import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isApiError, logout, removeToken } from '../api'
import { getMe, updateAvatarColor, type UserProfile } from '../api/users'
import { usePushNotifications } from '../hooks/usePushNotifications'

const AVATAR_COLORS = [
  { value: 'bg-blue-600',   label: 'Azul' },
  { value: 'bg-purple-600', label: 'Morado' },
  { value: 'bg-green-600',  label: 'Verde' },
  { value: 'bg-rose-600',   label: 'Rosa' },
  { value: 'bg-amber-600',  label: 'Ámbar' },
  { value: 'bg-cyan-600',   label: 'Cian' },
]

function defaultColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length].value
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const push = usePushNotifications()

  useEffect(() => {
    getMe().then(result => {
      if (isApiError(result)) { setError(result.error); return }
      setUser(result.data.user)
      setColor(result.data.user.avatarColor)
    })
  }, [])

  async function handleColorSelect(value: string) {
    if (saving || value === color) return
    setColor(value)
    setSaving(true)
    const result = await updateAvatarColor(value)
    setSaving(false)
    if (isApiError(result)) setError(result.error)
  }

  async function handleLogout() {
    await logout()
    removeToken()
    navigate('/login')
  }

  if (!user) {
    return <div className="py-20 text-center text-gray-500">Cargando…</div>
  }

  const activeColor = color ?? defaultColor(user.name)

  return (
    <main className="mx-auto max-w-sm px-4 py-6">
      <h1 className="mb-8 text-lg font-bold text-white">Mi perfil</h1>

      {/* Avatar preview */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white transition-colors ${activeColor}`}
        >
          {initials(user.name)}
        </div>
        <div className="text-center">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
      </div>

      {/* Color picker */}
      <div className="mb-8 rounded-xl bg-gray-800 p-6">
        <p className="mb-4 text-sm font-semibold text-gray-300">Color del avatar</p>
        <div className="flex gap-3">
          {AVATAR_COLORS.map(({ value, label }) => (
            <button
              key={value}
              aria-label={label}
              onClick={() => handleColorSelect(value)}
              disabled={saving}
              className={`h-9 w-9 rounded-full transition-transform ${value} ${
                activeColor === value
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
            />
          ))}
        </div>
        {saving && <p className="mt-3 text-xs text-gray-500">Guardando…</p>}
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>

      {/* Push notifications */}
      {push.supported && push.permission !== 'denied' && (
        <div className="mb-4 rounded-xl bg-gray-800 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-300">Notificaciones</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {push.subscribed
                  ? 'Recibirás alertas de resultados y partidos próximos'
                  : 'Actívalas para no perderte ningún partido'}
              </p>
            </div>
            <button
              onClick={push.subscribed ? push.unsubscribe : push.subscribe}
              disabled={push.loading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                push.subscribed ? 'bg-emerald-500' : 'bg-gray-600'
              }`}
              role="switch"
              aria-checked={push.subscribed}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  push.subscribed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {push.error && <p className="mt-2 text-xs text-red-400">{push.error}</p>}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-xl bg-gray-800 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-gray-700 hover:text-red-300"
      >
        Cerrar sesión
      </button>

      <p className="mt-8 text-center text-xs text-gray-600">Creado por Esteban ⚽</p>
    </main>
  )
}
