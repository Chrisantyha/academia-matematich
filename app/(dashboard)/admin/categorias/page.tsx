import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'
import TablaCategorias from '@/components/admin/TablaCategorias'

export default async function CategoriasAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const perfil = await getPerfil(user.id)

  if (perfil?.rol !== 'admin') {
    redirect(perfil?.rol === 'docente' ? '/docente' : '/alumno')
  }

  const nombre = perfil?.nombre || user.email?.split('@')[0] || 'Administrador'

  const admin = createAdminSupabaseClient()
  const { data: categorias } = await admin
    .from('categorias')
    .select('id, nombre, created_at')
    .order('nombre', { ascending: true })

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">{nombre}</span>
          <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-sm">
            AD
          </div>
        </div>
      </div>

      <div className="flex">

        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Plataforma</div>
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors"
          >
            <span>📊</span> Dashboard Global
          </Link>
          <Link
            href="/admin/usuarios"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors"
          >
            <span>👥</span> Usuarios
          </Link>
          <Link
            href="/admin/categorias"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500"
          >
            <span>🏷️</span> Categorías
          </Link>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 p-8">
          <TablaCategorias categorias={categorias || []} />
        </div>

      </div>
    </main>
  )
}
