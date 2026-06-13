import Link from 'next/link'

const cursosEnProgreso = [
  { icono: '∫', tag: 'Calculo I', nombre: 'Calculo Diferencial desde cero', progreso: 68, leccionActual: 33, totalLecciones: 48 },
  { icono: 'A', tag: 'Algebra Lineal', nombre: 'Matrices y Sistemas de Ecuaciones', progreso: 35, leccionActual: 15, totalLecciones: 42 },
  { icono: 'F', tag: 'Fisica I', nombre: 'Mecanica Clasica', progreso: 10, leccionActual: 4, totalLecciones: 38 },
]

const logros = [
  { icono: '🔥', nombre: 'Racha de 7 dias', desc: 'Estudia 7 dias seguidos', obtenido: true },
  { icono: '⚡', nombre: 'Velocista', desc: '5 lecciones en un dia', obtenido: true },
  { icono: '🎯', nombre: 'Primer curso', desc: 'Inscribiste tu primer curso', obtenido: true },
  { icono: '🎓', nombre: 'Graduado', desc: 'Completa un curso entero', obtenido: false },
]

export default function AlumnoDashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* TOP BAR */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">Bienvenido, Alejandro</span>
          <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center text-yellow-500 font-bold text-sm">
            AP
          </div>
        </div>
      </div>

      <div className="flex">

        {/* SIDEBAR */}
        <aside className="w-56 min-h-screen border-r border-slate-800 p-4 flex flex-col gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-2">Principal</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium text-sm border-l-2 border-yellow-500">
            <span>🏠</span> Inicio
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>▶</span> Mis cursos
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🔍</span> Explorar
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>📊</span> Mi progreso
          </a>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600 px-3 py-2 mt-4">Aprendizaje</div>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🎯</span> Ejercicios
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🏆</span> Logros
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
            <span>🎓</span> Certificados
          </a>
          <div className="mt-auto pt-4 border-t border-slate-800">
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
              <span>⚙️</span> Configuracion
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors">
              <span>🚪</span> Cerrar sesion
            </a>
          </div>
        </aside>

        {/* CONTENIDO */}
        <div className="flex-1 p-8">

          {/* BIENVENIDA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Bienvenido de vuelta, Alejandro 👋</h2>
              <p className="text-slate-400 text-sm">Tienes 2 lecciones pendientes en Calculo Diferencial.</p>
            </div>
            <button className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors">
              ▶ Continuar
            </button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Horas estudiadas', value: '24h', sub: 'Esta semana: 3.5h', color: 'text-yellow-500' },
              { label: 'Lecciones completadas', value: '47', sub: '3 esta semana', color: 'text-green-400' },
              { label: 'Cursos activos', value: '3', sub: '1 sin empezar', color: 'text-sky-400' },
              { label: 'Racha actual', value: '🔥 7', sub: 'Tu record', color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">{s.label}</div>
                <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* CURSOS EN PROGRESO */}
          <h3 className="text-lg font-bold mb-4">Continuar estudiando</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {cursosEnProgreso.map((c) => (
              <div key={c.nombre} className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-yellow-500/40 transition-colors">
                <div className="text-3xl mb-3">{c.icono}</div>
                <div className="text-xs text-yellow-500 font-bold uppercase tracking-widest mb-1">{c.tag}</div>
                <div className="text-sm font-semibold mb-3 leading-snug">{c.nombre}</div>
                <div className="h-1.5 bg-slate-800 rounded-full mb-2">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ width: `${c.progreso}%` }}
                  ></div>
                </div>
                <div className="text-xs text-yellow-500 font-mono">{c.progreso}% · Leccion {c.leccionActual}/{c.totalLecciones}</div>
              </div>
            ))}
          </div>

          {/* LOGROS */}
          <h3 className="text-lg font-bold mb-4">Logros</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {logros.map((l) => (
              <div key={l.nombre} className={`bg-slate-900 border border-slate-800 rounded-xl p-4 text-center ${!l.obtenido ? 'opacity-40' : ''}`}>
                <div className="text-3xl mb-2">{l.icono}</div>
                <div className="text-sm font-semibold mb-1">{l.nombre}</div>
                <div className="text-xs text-slate-500">{l.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </main>
  )
}