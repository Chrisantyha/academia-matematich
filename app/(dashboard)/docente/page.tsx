import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'

const misCursos = [
  { icono: '∫', nombre: 'Calculo Diferencial', lecciones: 48, alumnos: 142, estado: 'Publicado', ingresos: '$1,278' },
  { icono: 'A', nombre: 'Algebra Lineal', lecciones: 42, alumnos: 63, estado: 'Publicado', ingresos: '$567' },
  { icono: 'S', nombre: 'Calculo Integral', lecciones: 51, alumnos: 43, estado: 'Publicado', ingresos: '$387' },
  { icono: '∇', nombre: 'Ecuaciones Diferenciales', lecciones: 22, alumnos: 0, estado: 'En revision', ingresos: '—' },
]

export default function DocenteDashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* TOP BAR */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">Dr. Ramirez</span>
          <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-sm">
            DR
          </div>
        </div>
      </div>

      <div className="flex">

        {/* SIDEBAR */}
        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Mi contenido</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>📊</span> Mi Panel
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🎬</span> Mis cursos
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>➕</span> Crear curso
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>📁</span> Subir videos
          </a>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-4">Alumnos</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>👥</span> Mis estudiantes
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>📈</span> Analiticas
          </a>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-4">Finanzas</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>💰</span> Mis ganancias
          </a>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <LogoutButton />
          </div>
        </aside>

        {/* CONTENIDO */}
        <div className="flex-1 p-8">

          {/* ALERTA */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-3 rounded-xl mb-6">
            📣 Tu curso Calculo Diferencial fue aprobado y ya esta publicado.
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Estudiantes totales', value: '248', sub: '+12 este mes', color: 'text-yellow-500' },
              { label: 'Cursos publicados', value: '3', sub: '1 en revision', color: 'text-sky-400' },
              { label: 'Horas de contenido', value: '18h', sub: '141 lecciones', color: 'text-green-400' },
              { label: 'Ganancias del mes', value: '$186', sub: '30% del precio', color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{s.label}</div>
                <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* GRAFICO GANANCIAS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
            <h3 className="text-base font-bold mb-6">Ganancias mensuales (USD)</h3>
            <div className="flex items-end gap-3 h-32">
              {[
                { mes: 'Ene', valor: 48, alto: 30 },
                { mes: 'Feb', valor: 72, alto: 45 },
                { mes: 'Mar', valor: 96, alto: 60 },
                { mes: 'Abr', valor: 128, alto: 80 },
                { mes: 'May', valor: 112, alto: 70 },
                { mes: 'Jun', valor: 186, alto: 100 },
              ].map((b) => (
                <div key={b.mes} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-yellow-500 rounded-t-lg transition-all hover:bg-yellow-400 cursor-pointer"
                    style={{ height: `${b.alto}%` }}
                    title={`$${b.valor}`}
                  ></div>
                  <span className="text-xs text-slate-500 font-mono">{b.mes}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TABLA CURSOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold">Mis cursos</h3>
              <button className="bg-yellow-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-yellow-400 transition-colors">
                + Nuevo curso
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Curso</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Lecciones</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Alumnos</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Estado</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {misCursos.map((c) => (
                  <tr key={c.nombre} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{c.icono}</span>
                        <span className="font-semibold">{c.nombre}</span>
                      </div>
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SUBIR VIDEO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold mb-6 pb-4 border-b border-slate-800">Subir nueva leccion</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Curso</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors">
                  <option>Ecuaciones Diferenciales</option>
                  <option>Calculo Diferencial</option>
                  <option>Algebra Lineal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Titulo de la leccion</label>
                <input
                  type="text"
                  placeholder="Ej: Metodo de variables separables"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:border-yellow-500/50 transition-colors cursor-pointer">
              <div className="text-4xl mb-3">☁️</div>
              <div className="text-slate-400 text-sm">
                Arrastra tu video aqui o <span className="text-yellow-500 font-semibold">haz click para seleccionar</span>
              </div>
              <div className="text-slate-600 text-xs mt-2">MP4 · maximo 4GB · Cloudflare Stream</div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="bg-yellow-500 text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors text-sm">
                Subir leccion
              </button>
              <button className="border border-slate-700 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-sm">
                Guardar borrador
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}