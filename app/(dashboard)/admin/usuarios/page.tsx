import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'
import TablaUsuarios from '@/components/admin/TablaUsuarios'

export default async function UsuariosAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Debes iniciar sesión.</p>
      </main>
    )
  }

  const perfil = await getPerfil(user.id)
  const nombre = perfil?.nombre || user.email?.split('@')[0] || 'Administrador'

  if (perfil?.rol !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">No autorizado.</p>
      </main>
    )
  }

  const admin = createAdminSupabaseClient()

  const [{ data: usuarios }, { data: cursos }] = await Promise.all([
    admin
      .from('perfiles')
      .select('id, nombre, email, rol, created_at')
      .order('created_at', { ascending: false }),
    admin.from('cursos').select('docente_id'),
  ])

  const cursosPorDocente = new Map<string, number>()
  for (const c of cursos || []) {
    if (!c.docente_id) continue
    cursosPorDocente.set(c.docente_id, (cursosPorDocente.get(c.docente_id) || 0) + 1)
  }

  const usuariosConDatos = (usuarios || []).map((u) => ({
    ...u,
    totalCursos: cursosPorDocente.get(u.id) || 0,
  }))

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
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500"
          >
            <span>👥</span> Usuarios
          </Link>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 p-8">
          <TablaUsuarios usuarios={usuariosConDatos} adminActualId={user.id} />
        </div>

      </div>
    </main>
  )
}
