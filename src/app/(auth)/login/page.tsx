'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  User
} from 'lucide-react'
import { userService } from '@/lib/services/userService'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  
  const [isForgotMode, setIsForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Load remembered user identifier on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pastelistos_remember_user')
      if (saved) {
        setIdentifier(saved)
        setRememberMe(true)
      }
    } catch {
      // ignore storage error
    }
  }, [])

  // 1-Click Fast Access Bypass
  const handleQuickLogin = (role: 'admin' | 'repartidor') => {
    document.cookie = `demo_role=${role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    if (role === 'admin') {
      router.push('/')
    } else {
      router.push('/ruta')
    }
  }

  // Handle Login Submit (Email or Username)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setError('Por favor ingresa tu correo o nombre de usuario.')
      return
    }
    if (!password) {
      setError('Por favor ingresa tu contraseña.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Remember me storage
      if (rememberMe) {
        localStorage.setItem('pastelistos_remember_user', identifier.trim())
      } else {
        localStorage.removeItem('pastelistos_remember_user')
      }

      // Resolve identifier to email (supports username like 'admin', 'erick', 'nene' or full email)
      const resolvedEmail = await userService.resolveEmailFromIdentifier(identifier)

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: password,
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Clear demo cookie
        document.cookie = 'demo_role=; path=/; max-age=0'

        // Fetch role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()
        
        const role = profile?.role || 'admin'
        if (role === 'admin') {
          router.push('/')
        } else {
          router.push('/ruta')
        }
        router.refresh()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(
        err.message?.includes('Invalid login credentials')
          ? 'Correo, usuario o contraseña incorrectos. Verifica tus datos o usa los accesos directos arriba.'
          : err.message || 'Error al iniciar sesión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Handle Password Reset Request
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      setError('Ingresa tu correo para recibir el enlace de recuperación.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const email = await userService.resolveEmailFromIdentifier(resetEmail)
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/reset-password`
        : 'https://pastelistos-app.vercel.app/reset-password'

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (resetError) throw resetError

      setResetSent(true)
    } catch (err: any) {
      console.error('Reset error:', err)
      setError(err.message || 'No se pudo enviar el correo de recuperación. Verifica el correo ingresado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="backdrop-blur-xl bg-[#181824]/95 dark:bg-slate-900/95 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-white/10 p-7 sm:p-8 w-full transition-all duration-300 max-w-md mx-auto text-white">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/25 text-2xl">
          🥟
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Pastelitos Patria
        </h1>
        <p className="text-gray-400 text-xs">
          {isForgotMode ? 'Recuperación de Contraseña' : 'Sistema de Distribución y Finanzas B2B'}
        </p>
      </div>

      {!isForgotMode ? (
        <>
          {/* 1-Click Fast Access Buttons */}
          <div className="space-y-2.5 mb-6">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Acceso Rápido Directo
            </p>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 hover:from-amber-500/30 hover:to-orange-500/20 border border-amber-500/30 text-white font-bold text-xs transition-all shadow-md group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('repartidor')}
                className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 hover:from-blue-500/30 hover:to-cyan-500/20 border border-blue-500/30 text-white font-bold text-xs transition-all shadow-md group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span>Repartidor</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="relative flex py-1.5 items-center mb-4">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-[11px] text-gray-500 font-semibold uppercase">O ingresa con tus datos</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email or Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Correo o Nombre de Usuario
                </span>
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="block w-full rounded-xl border border-white/10 bg-[#101018] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                placeholder="ej. erick@pastelitos.com o erick"
              />
            </div>

            {/* Password with Show/Hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setResetEmail(identifier)
                    setIsForgotMode(true)
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-white/10 bg-[#101018] px-3.5 py-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#101018] text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-gray-300 cursor-pointer select-none">
                Recordar mi usuario en este dispositivo
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold py-3 px-4 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-70 cursor-pointer text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </>
      ) : (
        /* Forgot Password View */
        <div className="space-y-4">
          {resetSent ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-white text-base">¡Enlace Enviado!</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Hemos enviado un correo a <strong className="text-amber-400">{resetEmail}</strong> con las instrucciones para restablecer tu contraseña.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetSent(false)
                  setIsForgotMode(false)
                }}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all mt-2"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                Ingresa tu correo electrónico o nombre de usuario y te enviaremos un enlace para que crees una nueva contraseña.
              </p>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Correo Electrónico o Usuario
                </label>
                <input
                  type="text"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="ej. erick@pastelitos.com"
                  className="block w-full rounded-xl border border-white/10 bg-[#101018] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold py-3 px-4 shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando enlace...
                  </>
                ) : (
                  'Enviar Enlace de Recuperación'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setIsForgotMode(false)
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-semibold text-xs transition-colors"
              >
                Cancelar y Volver
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
