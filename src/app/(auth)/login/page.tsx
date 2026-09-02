'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Truck, Sparkles, KeyRound, Mail, Lock, ArrowRight } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email({ message: 'Correo electrónico inválido' }),
  password: z.string().min(4, { message: 'La contraseña debe tener al menos 4 caracteres' }),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Quick 1-click login helper
  const handleQuickLogin = (role: 'admin' | 'repartidor') => {
    // Set demo_role cookie valid for 30 days
    document.cookie = `demo_role=${role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    if (role === 'admin') {
      router.push('/')
    } else {
      router.push('/ruta')
    }
  }

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Clear any previous demo cookie
        document.cookie = 'demo_role=; path=/; max-age=0'

        // Fetch role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()
        
        const role = profile?.role

        if (role === 'admin') {
          router.push('/')
        } else {
          router.push('/ruta')
        }
        
        router.refresh()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Error al iniciar sesión con Supabase. Puedes usar los botones de acceso directo abajo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="backdrop-blur-xl bg-[#181824]/90 dark:bg-slate-900/90 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] border border-white/10 p-8 w-full transition-all duration-300 max-w-md mx-auto text-white">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/25 text-2xl">
          🥟
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Pastelitos Patria
        </h1>
        <p className="text-gray-400 text-xs">
          Sistema de Distribución, Ventas y Finanzas B2B
        </p>
      </div>

      {/* 1-Click Fast Access Buttons */}
      <div className="space-y-3 mb-6">
        <p className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Acceso Rápido Directo
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 hover:from-amber-500/30 hover:to-orange-500/20 border border-amber-500/30 text-white font-bold text-xs transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Administrador</span>
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

      <div className="relative flex py-2 items-center mb-5">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink mx-3 text-[11px] text-gray-500 font-semibold uppercase">O ingresa con tu cuenta</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5" htmlFor="email">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            Correo electrónico
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            className="block w-full rounded-xl border border-white/10 bg-[#101018] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
            placeholder="admin@pastelitos.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5" htmlFor="password">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Contraseña
          </label>
          <input
            {...register('password')}
            id="password"
            type="password"
            className="block w-full rounded-xl border border-white/10 bg-[#101018] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex flex-col gap-1">
            <span>⚠️ {error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold py-3 px-4 shadow-lg shadow-amber-500/20 focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-sm"
        >
          {loading ? 'Iniciando sesión...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
