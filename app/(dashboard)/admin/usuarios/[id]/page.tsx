import Link from 'next/link'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import BotonConfirmar from '@/components/admin/BotonConfirmar'
import FormCredenciales from '@/components/admin/FormCredenciales'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { getPerfil } from '@/lib/db'
import { revocarCompra, resetearIntentoExamen, resetearProgresoCurso, eliminarCertificado } from '@/lib/actions/admin-alumno'

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  docente: 'Docente',
  alumno: 'Alumno',
}

export default async function DetalleAlumnoAdmin({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  const { data: alumno } = await admin
    .from('perfiles')
    .select('id, nombre, email, rol, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!alumno) {
    redirect('/admin/usuarios')
  }

  const [
    { data: compras },
    { data: progresoRaw },
    { data: intentosRaw },
    { data: certificados },
  ] = await Promise.all([
    admin
      .from('compras')
      .select('id, monto, estado, created_at, cursos (titulo)')
      .eq('alumno_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('progreso')
      .select('leccion_id, lecciones (curso_id, cursos (titulo))')
      .eq('alumno_id', id)
      .eq('completado', true),
    admin
      .from('intentos')
      .select('id, evaluacion_id, creado_en, evaluaciones (titulo, curso_id, cursos (titulo))')
      .eq('alumno_id', id)
      .order('creado_en', { ascending: false }),
    admin
      .from('certificados')
      .select('id, codigo_verificacion, fecha_emision, cursos (titulo)')
      .eq('alumno_id', id)
      .order('fecha_emision', { ascending: false }),
  ])

  // Progreso agrupado por curso
  const progresoPorCurso = new Map<string, { titulo: string; completadas: number }>()
  for (const p of (progresoRaw || []) as any[]) {
    const cursoId = p.lecciones?.curso_id
    if (!cursoId) continue
    const titulo = p.lecciones?.cursos?.titulo || 'Curso'
    const entrada = progresoPorCurso.get(cursoId) || { titulo, completadas: 0 }
    entrada.completadas += 1
    progresoPorCurso.set(cursoId, entrada)
  }

  const cursoIdsConProgreso = [...progresoPorCurso.keys()]
  const { data: leccionesPorCurso } = cursoIdsConProgreso.length
    ? await admin.from('lecciones').select('id, curso_id').in('curso_id', cursoIdsConProgreso)
    : { data: [] as { id: string; curso_id: string }[] }

  const totalLeccionesPorCurso = new Map<string, number>()
  for (const l of leccionesPorCurso || []) {
    totalLeccionesPorCurso.set(l.curso_id, (totalLeccionesPorCurso.get(l.curso_id) || 0) + 1)
  }

  const progresoCursos = cursoIdsConProgreso.map((cursoId) => ({
    cursoId,
    titulo: progresoPorCurso.get(cursoId)!.titulo,
    completadas: progresoPorCurso.get(cursoId)!.completadas,
    total: totalLeccionesPorCurso.get(cursoId) || 0,
  }))

  // Resultados de evaluación asociados a los intentos
  const intentoIds = (intentosRaw || []).map((i: any) => i.id)
  const { data: resultados } = intentoIds.length
    ? await admin
        .from('resultados_evaluacion')
        .select('id, intento_id, puntaje, aprobado, created_at')
        .in('intento_id', intentoIds)
    : { data: [] as any[] }

  const resultadoPorIntento = new Map<string, any>()
  for (const r of resultados || []) {
    resultadoPorIntento.set(r.intento_id, r)
  }

  const intentos = (intentosRaw || []) as any[]

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
          <Link
            href="/admin/categorias"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors"
          >
            <span>🏷️</span> Categorías
          </Link>
          <Link
            href="/admin/ofertas"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800/50 font-medium text-sm transition-colors"
          >
            <span>🎁</span> Ofertas
          </Link>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        <div className="flex-1 p-8 max-w-4xl">

          <Link href="/admin/usuarios" className="text-slate-400 text-sm hover:text-white transition-colors">
            ← Volver a Usuarios
          </Link>

          {/* HEADER ALUMNO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 my-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{alumno.nombre || 'Sin nombre'}</h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {ROL_LABEL[alumno.rol] || alumno.rol}
              </span>
            </div>
            <p className="text-slate-400 text-sm">{alumno.email}</p>
            <p className="text-slate-500 text-xs mt-2">
              Registrado el {new Date(alumno.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* CREDENCIALES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold">Credenciales de acceso</h2>
              <p className="text-slate-500 text-xs mt-1">
                Cambia el correo o la contraseña con la que esta persona inicia sesión. Úsalo si perdió acceso a su correo original.
              </p>
            </div>
            <div className="p-6">
              <FormCredenciales usuarioId={alumno.id} emailActual={alumno.email} />
            </div>
          </div>

          {/* COMPRAS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold">Compras</h2>
            </div>
            {!compras || compras.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Sin compras registradas.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {compras.map((compra: any) => (
                  <div key={compra.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold text-sm">{compra.cursos?.titulo || 'Curso eliminado'}</div>
                      <div className="text-slate-500 text-xs mt-1">
                        ${compra.monto} · {new Date(compra.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        compra.estado === 'aprobado'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : compra.estado === 'revocado'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {compra.estado}
                      </span>
                      {compra.estado === 'aprobado' && (
                        <form action={revocarCompra}>
                          <input type="hidden" name="compraId" value={compra.id} />
                          <input type="hidden" name="alumnoId" value={id} />
                          <BotonConfirmar
                            mensaje={`¿Revocar la compra de "${compra.cursos?.titulo || 'este curso'}"? El alumno perderá el acceso.`}
                            className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
                          >
                            Revocar
                          </BotonConfirmar>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PROGRESO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold">Progreso por curso</h2>
            </div>
            {progresoCursos.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Sin progreso registrado.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {progresoCursos.map((p) => (
                  <div key={p.cursoId} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold text-sm">{p.titulo}</div>
                      <div className="text-slate-500 text-xs mt-1">
                        {p.completadas} de {p.total} lecciones completadas
                      </div>
                    </div>
                    <form action={resetearProgresoCurso}>
                      <input type="hidden" name="alumnoId" value={id} />
                      <input type="hidden" name="cursoId" value={p.cursoId} />
                      <BotonConfirmar
                        mensaje={`¿Resetear el progreso de "${p.titulo}"? Se borrarán las lecciones marcadas como completadas.`}
                        className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
                      >
                        Resetear progreso de este curso
                      </BotonConfirmar>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INTENTOS DE EVALUACION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold">Intentos de evaluación</h2>
            </div>
            {intentos.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Sin intentos registrados.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {intentos.map((intento) => {
                  const resultado = resultadoPorIntento.get(intento.id)
                  return (
                    <div key={intento.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-semibold text-sm">
                          {intento.evaluaciones?.titulo || 'Evaluación'}
                          <span className="text-slate-500 font-normal"> · {intento.evaluaciones?.cursos?.titulo || 'Curso'}</span>
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          {new Date(intento.creado_en).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {resultado && (
                            <>
                              {' · '}
                              Puntaje: {resultado.puntaje} ·{' '}
                              <span className={resultado.aprobado ? 'text-green-400' : 'text-red-400'}>
                                {resultado.aprobado ? 'Aprobado' : 'No aprobado'}
                              </span>
                            </>
                          )}
                          {!resultado && ' · Sin calificar'}
                        </div>
                      </div>
                      <form action={resetearIntentoExamen}>
                        <input type="hidden" name="intentoId" value={intento.id} />
                        <input type="hidden" name="alumnoId" value={id} />
                        <BotonConfirmar
                          mensaje="¿Resetear este intento de evaluación? Se borrará el intento y su resultado, si existe."
                          className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
                        >
                          Resetear intento
                        </BotonConfirmar>
                      </form>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* CERTIFICADOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold">Certificados</h2>
            </div>
            {!certificados || certificados.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">Sin certificados emitidos.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {certificados.map((cert: any) => (
                  <div key={cert.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold text-sm">{cert.cursos?.titulo || 'Curso'}</div>
                      <div className="text-slate-500 text-xs mt-1">
                        Emitido el {new Date(cert.fecha_emision).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {' · '}
                        <span className="font-mono text-yellow-500">{cert.codigo_verificacion}</span>
                      </div>
                    </div>
                    <form action={eliminarCertificado}>
                      <input type="hidden" name="certificadoId" value={cert.id} />
                      <input type="hidden" name="alumnoId" value={id} />
                      <BotonConfirmar
                        mensaje={`¿Eliminar el certificado de "${cert.cursos?.titulo || 'este curso'}"? Esta acción no se puede deshacer.`}
                        className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors"
                      >
                        Eliminar certificado
                      </BotonConfirmar>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}
