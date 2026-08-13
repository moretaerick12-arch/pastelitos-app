import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pastelitos Patria - Acceso',
  description: 'Inicia sesión en Pastelitos Patria',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-100 to-amber-200 dark:from-slate-950 dark:via-slate-900 dark:to-orange-950 p-4 sm:p-8">
      <div className="w-full max-w-md animate-fade-in">
        {children}
      </div>
    </div>
  )
}
