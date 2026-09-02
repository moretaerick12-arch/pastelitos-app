'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2500)
    } catch (err: any) {
      console.error('Error actualizando contraseña:', err)
      setError(err.message || 'No se pudo actualizar la contraseña. El enlace puede haber expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="backdrop-blur-xl bg-[#181824]/90 dark:bg-slate-900/90 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] border border-white/10 p-8 w-full max-w-md mx-auto text-white">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/25 text-2xl">
          🔑
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Nueva Contraseña
        </h1>
        <p className="text-gray-400 text-xs">
          Ingresa y confirma tu nueva contraseña de acceso
        </p>
      </div>

      {success ? (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="font-bold text-white text-base">¡Contraseña Actualizada!</h3>
          <p className="text-xs text-gray-300">
            Tu contraseña se ha cambiado correctamente. Redirigiendo al inicio de sesión...
          </p>
        </div>
      ) : (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="block w-full rounded-xl border border-white/10 bg-[#101018] px-3.5 py-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Confirmar Contraseña
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
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
                Guardando...
              </>
            ) : (
              'Guardar Nueva Contraseña'
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al Inicio de Sesión
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
