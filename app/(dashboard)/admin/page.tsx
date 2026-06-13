import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'

const docentes = [
  { nombre: 'Dr. Ramirez', especialidad: 'Calculo · Algebra', cursos: 4, alumnos: 248, estado: 'Activo' },
  { nombre: 'Prof. Mendoza', especialidad: 'Fisica', cursos: 2, alumnos: 89, estado: 'Activo' },
  { nombre: 'Dra. Torres', especialidad: 'Estadistica', cursos: 1, alumnos: 34, estado: 'Revision' },
  { nombre: 'Ing. Castro', especialidad: 'Geometria', cursos: 0, alumnos: 0, estado: 'Pendiente' },
]

const cursos = [
  { nombre: 'Calculo Diferencial', docente: 'Dr. Ramirez', lecciones: 48, alumnos: 142, estado: 'Publicado', ingresos: '$1,278' },
  { nombre: 'Algebra Lineal', docente: 'Dr. Ramirez', lecciones: 42, alumnos: 63, estado: 'Publicado', ingresos: '$567' },
  { nombre: 'Mecanica Clasica', docente: 'Prof. Mendoza', lecciones: 38, alumnos: 89, estado: 'Publicado', ingresos: '$801' },
  { nombre: 'Ecuaciones Diferenciales', docente: 'Dr. Ramirez', lecciones: 22, alumnos: 0, estado: 'En revision', ingresos: '—' },
  { nombre: 'Probabilidad y Estadistica', docente: 'Dra. Torres', lecciones: 8, alumnos: 0, estado: 'En revision', ingresos: '—' },
]

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* TOP BAR */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">Administrador</span>
          <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-sm">
            AD
          </div>
        </div>
      </div>

      <div className="flex">

        {/* SIDEBAR */}
        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Plataforma</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>📊</span> Dashboard Global
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>👥</span> Usuarios
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>👨‍🏫</span> Docentes
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🎬</span> Cursos
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>📋</span> Revision de contenido
          </a>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-4">Finanzas</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>💰</span> Ingresos
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>💸</span> Pagos a docentes
          </a>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-4">Configuracion</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>⚙️</span> Config. plataforma
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🔐</span> Roles y permisos
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>📡</span> Cloudflare Stream
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>💳</span> Stripe / MercadoPago
          </a>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        {/* CONTENIDO */}
        <div className="flex-1 p-8">

          {/* ALERTAS */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-3 rounded-xl mb-3">
            ⏳ 2 cursos pendientes de revision y aprobacion.
          </div>
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl mb-6">
            ✅ Pago mensual a 3 docentes procesado correctamente — $412 total.
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Alumnos registrados', value: '1,247', sub: '+89 este mes', color: 'text-yellow-500' },
              { label: 'Ingresos del mes', value: '$1,386', sub: '↑ 23% vs mes anterior', color: 'text-green-400' },
              { label: 'Cursos publicados', value: '14', sub: '3 en revision', color: 'text-sky-400' },
              { label: 'Docentes activos', value: '6', sub: '2 pendientes', color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{s.label}</div>
                <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* GRAFICO INGRESOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
            <h3 className="text-base font-bold mb-6">Ingresos mensuales de la plataforma (USD)</h3>
            <div className="flex items-end gap-3 h-36">
              {[
                { mes: 'Ene', alto: 14 },
                { mes: 'Feb', alto: 25 },
                { mes: 'Mar', alto: 36 },
                { mes: 'Abr', alto: 47 },
                { mes: 'May', alto: 58 },
                { mes: 'Jun', alto: 100 },
              ].map((b) => (
                <div key={b.mes} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-yellow-500 rounded-t-lg hover:bg-yellow-400 cursor-pointer transition-colors"
                    style={{ height: `${b.alto}%` }}
                  ></div>
                  <span className="text-xs text-slate-500 font-mono">{b.mes}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TABLA DOCENTES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold">Docentes registrados</h3>
              <button className="bg-yellow-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors">
                + Agregar docente
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Docente</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Especialidad</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Cursos</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Alumnos</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Estado</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Accion</th>
                </tr>
              </thead>
              <tbody>
                {docentes.map((d) => (
                  <tr key={d.nombre} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-semibold">{d.nombre}</td>
                    <td className="px-6 py-4 text-slate-400">{d.especialidad}</td>
                    <td className="px-6 py-4 text-slate-400">{d.cursos}</td>
                    <td className="px-6 py-4 text-slate-400">{d.alumnos}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        d.estado === 'Activo' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                        d.estado === 'Revision' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                        'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                      }`}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-yellow-500 text-xs font-semibold hover:text-yellow-400 transition-colors">
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TABLA CURSOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold">Gestion de cursos</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Curso</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Docente</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Lecciones</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Alumnos</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Estado</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Ingresos</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Accion</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((c) => (
                  <tr key={c.nombre} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-semibold">{c.nombre}</td>
                    <td className="px-6 py-4 text-slate-400">{c.docente}</td>
                    <td className="px-6 py-4 text-slate-400">{c.lecciones}</td>
                    <td className="px-6 py-4 text-slate-400">{c.alumnos}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        c.estado === 'Publicado'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-yellow-500 font-bold">{c.ingresos}</td>
                    <td className="px-6 py-4">
                      <button className={`text-xs font-semibold transition-colors ${
                        c.estado === 'En revision'
                          ? 'text-green-400 hover:text-green-300'
                          : 'text-yellow-500 hover:text-yellow-400'
                      }`}>
                        {c.estado === 'En revision' ? 'Aprobar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ROLES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold mb-6 pb-4 border-b border-slate-800">Roles y permisos del sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  rol: 'SUPERADMIN', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10',
                  permisos: 'Acceso total · Configura plataforma · Gestiona usuarios · Aprueba docentes y cursos · Ve todos los ingresos · Configura Stripe y Cloudflare'
                },
                {
                  rol: 'DOCENTE', color: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-500/10',
                  permisos: 'Sube y edita sus cursos · Ve sus alumnos · Accede a sus analiticas · Ve sus ganancias · Crea ejercicios · Responde mensajes'
                },
                {
                  rol: 'ALUMNO', color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10',
                  permisos: 'Ve y compra cursos · Reproduce videos · Hace ejercicios · Ve su progreso · Descarga certificados · Gestiona su perfil'
                },
              ].map((r) => (
                <div key={r.rol} className={`${r.bg} border ${r.border} rounded-xl p-4`}>
                  <div className={`text-xs font-bold ${r.color} mb-3 tracking-widest`}>{r.rol}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{r.permisos}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}