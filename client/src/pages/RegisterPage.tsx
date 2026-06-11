import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isApiError, saveToken } from '../api'
import { apiFetch } from '../api/client'

type FieldErrors = { name: string; email: string; password: string }

function validateName(v: string) {
  return v.trim() ? '' : 'El nombre es obligatorio.'
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Ingresa un correo electrónico válido.'
}

function validatePassword(v: string) {
  return v.length >= 8 ? '' : 'La contraseña debe tener al menos 8 caracteres.'
}

const inputBase = 'mt-1 w-full rounded-lg border bg-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none'
const inputNormal = `${inputBase} border-gray-600 focus:border-blue-400`
const inputError = `${inputBase} border-red-500 focus:border-red-500`

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') ?? '/'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ name: '', email: '', password: '' })
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function setFieldError(field: keyof FieldErrors, msg: string) {
    setFieldErrors(prev => ({ ...prev, [field]: msg }))
  }

  function handleNameChange(v: string) {
    setName(v)
    if (fieldErrors.name) setFieldError('name', validateName(v))
  }

  function handleEmailChange(v: string) {
    setEmail(v)
    if (fieldErrors.email) setFieldError('email', validateEmail(v))
  }

  function handlePasswordChange(v: string) {
    setPassword(v)
    if (fieldErrors.password) setFieldError('password', validatePassword(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setFieldErrors(errors)

    if (errors.name || errors.email || errors.password || password !== confirm) return

    setLoading(true)
    setApiError(null)

    const registerResult = await apiFetch<{ user: { id: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email, password }),
    })

    if (isApiError(registerResult)) {
      setLoading(false)
      setApiError(registerResult.error)
      return
    }

    const loginResult = await apiFetch<{ accessToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    setLoading(false)

    if (isApiError(loginResult)) {
      navigate('/login')
      return
    }

    saveToken(loginResult.data.accessToken)
    navigate(from, { replace: true })
  }

  const confirmMismatch = confirm.length > 0 && confirm !== password

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">⚽</span>
          <h1 className="mt-2 text-2xl font-bold text-white">Crear cuenta</h1>
          <p className="mt-1 text-sm text-gray-400">Goalcaster · Mundial 2026</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="rounded-xl bg-gray-800 p-6 shadow-lg">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nombre</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                onBlur={() => setFieldError('name', validateName(name))}
                className={fieldErrors.name ? inputError : inputNormal}
                placeholder="Tu nombre"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                onBlur={() => setFieldError('email', validateEmail(email))}
                className={fieldErrors.email ? inputError : inputNormal}
                placeholder="tu@ejemplo.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => handlePasswordChange(e.target.value)}
                onBlur={() => setFieldError('password', validatePassword(password))}
                className={fieldErrors.password ? inputError : inputNormal}
                placeholder="••••••••"
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={confirmMismatch ? inputError : inputNormal}
                placeholder="••••••••"
              />
              {confirmMismatch && (
                <p className="mt-1 text-xs text-red-400">Las contraseñas no coinciden.</p>
              )}
            </div>
          </div>

          {apiError && <p className="mt-3 text-sm text-red-400">{apiError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          ¿Ya tienes una cuenta?{' '}
          <Link to={from !== '/' ? `/login?from=${encodeURIComponent(from)}` : '/login'} className="text-blue-400 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
