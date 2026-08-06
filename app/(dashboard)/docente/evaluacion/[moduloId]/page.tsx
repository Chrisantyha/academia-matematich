'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import TextoMath from '@/components/ui/TextoMath'
import Combobox from '@/components/ui/Combobox'
import { generarPlantilla, type TipoPlantilla } from '@/lib/plantillas'

type TipoPregunta = 'opcion_multiple' | 'verdadero_falso' | 'numerica' | 'par_numerico' | 'texto_algebraico' | 'radical' | 'raices_cuadratica' | 'fraccion_algebraica'
type TipoRespuesta = 'numerica' | 'par_numerico' | 'texto_algebraico' | 'radical' | 'raices_cuadratica' | 'fraccion_algebraica'

interface Pregunta {
  tipo: TipoPregunta
  pregunta: string
  opciones: string[]
  respuesta_correcta: string
  tolerancia: number
  orden: number
  es_plantilla: boolean
  tipo_plantilla: TipoPlantilla | ''
  parametros: Record<string, number>
}

type VistaPrevia = { texto: string; respuesta: string } | { error: string }

const TIPO_SEGUN_PLANTILLA: Record<TipoPlantilla, TipoRespuesta> = {
  ecuacion_lineal: 'numerica',
  regla_de_tres: 'numerica',
  sistema_2x2: 'par_numerico',
  factorizacion_trinomio: 'texto_algebraico',
  factor_comun: 'texto_algebraico',
  sistema_2x2_fracciones: 'par_numerico',
  ecuacion_lineal_radical: 'radical',
  factorizacion_exponentes_negativos: 'texto_algebraico',
  factorizacion_grado_3_4: 'texto_algebraico',
  ecuacion_cuadratica: 'raices_cuadratica',
  limite_racional_directo: 'numerica',
  limite_indeterminado: 'numerica',
  derivada_polinomio: 'texto_algebraico',
  derivada_racional: 'fraccion_algebraica',
  derivada_potencias_negativas: 'texto_algebraico',
  trig_identidad: 'numerica',
  trig_ecuacion_simple: 'numerica',
  trig_razones_triangulo: 'numerica',
  limite_raiz: 'numerica',
  factorizacion_trinomio_lider: 'texto_algebraico',
  factorizacion_agrupacion: 'texto_algebraico',
  factorizacion_suma_cubos: 'texto_algebraico',
  factorizacion_diferencia_cubos: 'texto_algebraico',
  factorizacion_combinada: 'texto_algebraico',
}

const LABEL_TIPO_PLANTILLA: Record<TipoPlantilla, string> = {
  ecuacion_lineal: 'Ecuación lineal',
  sistema_2x2: 'Sistema de ecuaciones 2x2',
  factorizacion_trinomio: 'Factorización de trinomio',
  factor_comun: 'Factor común',
  regla_de_tres: 'Regla de tres',
  sistema_2x2_fracciones: 'Sistema de ecuaciones 2x2 (fracciones)',
  ecuacion_lineal_radical: 'Ecuación lineal con solución radical',
  factorizacion_exponentes_negativos: 'Factorización con exponentes negativos',
  factorizacion_grado_3_4: 'Factorización de polinomio (grado 3 o 4)',
  ecuacion_cuadratica: 'Ecuación cuadrática (fórmula general)',
  limite_racional_directo: 'Límite racional (sustitución directa)',
  limite_indeterminado: 'Límite indeterminado (0/0)',
  derivada_polinomio: 'Derivada de polinomio (grado 2 a 4)',
  derivada_racional: 'Derivada racional (regla del cociente)',
  derivada_potencias_negativas: 'Derivada con exponentes negativos',
  trig_identidad: 'Identidad trigonométrica',
  trig_ecuacion_simple: 'Ecuación trigonométrica simple',
  trig_razones_triangulo: 'Razones trigonométricas en triángulo rectángulo',
  limite_raiz: 'Límite con raíz (racionalización)',
  factorizacion_trinomio_lider: 'Factorización de trinomio con coeficiente líder',
  factorizacion_agrupacion: 'Factorización por agrupación',
  factorizacion_suma_cubos: 'Factorización: suma de cubos',
  factorizacion_diferencia_cubos: 'Factorización: diferencia de cubos',
  factorizacion_combinada: 'Factorización combinada (varias técnicas)',
}

const OPCIONES_TIPO_PLANTILLA = (Object.entries(LABEL_TIPO_PLANTILLA) as [TipoPlantilla, string][]).map(
  ([value, label]) => ({ value, label })
)

const LABEL_TIPO_RESPUESTA: Record<TipoRespuesta, string> = {
  numerica: 'numérica',
  par_numerico: 'par de valores (x, y)',
  texto_algebraico: 'texto algebraico',
  radical: 'radical (ej: 2√3)',
  raices_cuadratica: 'dos raíces (sin orden fijo)',
  fraccion_algebraica: 'fracción algebraica (numerador y denominador)',
}

const DEFAULTS_PARAMETROS: Record<TipoPlantilla, Record<string, number>> = {
  ecuacion_lineal: { a_min: 1, a_max: 10, b_min: -10, b_max: 10, x_min: -10, x_max: 10 },
  sistema_2x2: { a_min: 1, a_max: 10, b_min: 1, b_max: 10, x_min: -10, x_max: 10, y_min: -10, y_max: 10 },
  factorizacion_trinomio: { p_min: -10, p_max: 10, q_min: -10, q_max: 10 },
  factor_comun: { a_min: -20, a_max: 20, b_min: -20, b_max: 20 },
  regla_de_tres: { a_min: 1, a_max: 20, k_min: 1, k_max: 20, c_min: 1, c_max: 20 },
  sistema_2x2_fracciones: { num_min: 1, num_max: 5, den_min: 2, den_max: 5, x_min: -10, x_max: 10, y_min: -10, y_max: 10 },
  ecuacion_lineal_radical: { a_min: 1, a_max: 5, k_min: 1, k_max: 5, n_min: 2, n_max: 10 },
  factorizacion_exponentes_negativos: { exp_min: -4, exp_max: -1, coef_min: -10, coef_max: 10 },
  factorizacion_grado_3_4: { grado: 3, raiz_min: -6, raiz_max: 6 },
  ecuacion_cuadratica: { a_min: 1, a_max: 3, r_min: -8, r_max: 8 },
  limite_racional_directo: { a_min: 1, a_max: 10, b_min: -10, b_max: 10, c_min: 1, c_max: 10, d_min: -10, d_max: 10, x0_min: -5, x0_max: 5 },
  limite_indeterminado: { x0_min: -6, x0_max: 6, r_num_min: -6, r_num_max: 6, r_den_min: -6, r_den_max: 6 },
  derivada_polinomio: { grado: 3, coef_min: -8, coef_max: 8 },
  derivada_racional: { a_min: 1, a_max: 8, b_min: -8, b_max: 8, c_min: 1, c_max: 8, d_min: -8, d_max: 8 },
  derivada_potencias_negativas: { exp_min: -5, exp_max: -1, coef_min: -10, coef_max: 10 },
  trig_identidad: { k_min: -8, k_max: 8, escala_max: 3 },
  trig_ecuacion_simple: { t_max: 3 },
  trig_razones_triangulo: { escala_max: 3 },
  limite_raiz: { p_min: -6, p_max: 6, k_min: 1, k_max: 8, a_min: -10, a_max: 10 },
  factorizacion_trinomio_lider: { p_min: -5, p_max: 5, q_min: -10, q_max: 10, r_min: -5, r_max: 5, s_min: -10, s_max: 10 },
  factorizacion_agrupacion: { p_min: -5, p_max: 5, q_min: -10, q_max: 10, r_min: -5, r_max: 5, s_min: -10, s_max: 10 },
  factorizacion_suma_cubos: { k_min: 1, k_max: 4, m_min: -6, m_max: 6 },
  factorizacion_diferencia_cubos: { k_min: 1, k_max: 4, m_min: -6, m_max: 6 },
  factorizacion_combinada: { g_min: 2, g_max: 6, p_min: -5, p_max: 5, q_min: -8, q_max: 8, r_min: -5, r_max: 5, s_min: -8, s_max: 8 },
}

const CAMPOS_PARAMETROS: Record<TipoPlantilla, { clave: string; label: string }[]> = {
  ecuacion_lineal: [
    { clave: 'a_min', label: 'a mínimo' }, { clave: 'a_max', label: 'a máximo' },
    { clave: 'b_min', label: 'b mínimo' }, { clave: 'b_max', label: 'b máximo' },
    { clave: 'x_min', label: 'Solución x mínima' }, { clave: 'x_max', label: 'Solución x máxima' },
  ],
  sistema_2x2: [
    { clave: 'a_min', label: 'a mínimo' }, { clave: 'a_max', label: 'a máximo' },
    { clave: 'b_min', label: 'b mínimo' }, { clave: 'b_max', label: 'b máximo' },
    { clave: 'x_min', label: 'Solución x mínima' }, { clave: 'x_max', label: 'Solución x máxima' },
    { clave: 'y_min', label: 'Solución y mínima' }, { clave: 'y_max', label: 'Solución y máxima' },
  ],
  factorizacion_trinomio: [
    { clave: 'p_min', label: 'Raíz p mínima' }, { clave: 'p_max', label: 'Raíz p máxima' },
    { clave: 'q_min', label: 'Raíz q mínima' }, { clave: 'q_max', label: 'Raíz q máxima' },
  ],
  factor_comun: [
    { clave: 'a_min', label: 'a mínimo' }, { clave: 'a_max', label: 'a máximo' },
    { clave: 'b_min', label: 'b mínimo' }, { clave: 'b_max', label: 'b máximo' },
  ],
  regla_de_tres: [
    { clave: 'a_min', label: 'Cantidad base mínima' }, { clave: 'a_max', label: 'Cantidad base máxima' },
    { clave: 'k_min', label: 'Precio unitario mínimo' }, { clave: 'k_max', label: 'Precio unitario máximo' },
    { clave: 'c_min', label: 'Cantidad consultada mínima' }, { clave: 'c_max', label: 'Cantidad consultada máxima' },
  ],
  sistema_2x2_fracciones: [
    { clave: 'num_min', label: 'Numerador mínimo' }, { clave: 'num_max', label: 'Numerador máximo' },
    { clave: 'den_min', label: 'Denominador mínimo' }, { clave: 'den_max', label: 'Denominador máximo' },
    { clave: 'x_min', label: 'Solución x mínima' }, { clave: 'x_max', label: 'Solución x máxima' },
    { clave: 'y_min', label: 'Solución y mínima' }, { clave: 'y_max', label: 'Solución y máxima' },
  ],
  ecuacion_lineal_radical: [
    { clave: 'a_min', label: 'Coeficiente a mínimo' }, { clave: 'a_max', label: 'Coeficiente a máximo' },
    { clave: 'k_min', label: 'Coeficiente de la respuesta mínimo' }, { clave: 'k_max', label: 'Coeficiente de la respuesta máximo' },
    { clave: 'n_min', label: 'Radicando mínimo' }, { clave: 'n_max', label: 'Radicando máximo' },
  ],
  factorizacion_exponentes_negativos: [
    { clave: 'exp_min', label: 'Exponente mínimo (negativo)' }, { clave: 'exp_max', label: 'Exponente máximo (negativo)' },
    { clave: 'coef_min', label: 'Coeficiente mínimo' }, { clave: 'coef_max', label: 'Coeficiente máximo' },
  ],
  factorizacion_grado_3_4: [
    { clave: 'grado', label: 'Grado (3 o 4)' },
    { clave: 'raiz_min', label: 'Raíz mínima' }, { clave: 'raiz_max', label: 'Raíz máxima' },
  ],
  ecuacion_cuadratica: [
    { clave: 'a_min', label: 'Coeficiente líder mínimo' }, { clave: 'a_max', label: 'Coeficiente líder máximo' },
    { clave: 'r_min', label: 'Raíz mínima' }, { clave: 'r_max', label: 'Raíz máxima' },
  ],
  limite_racional_directo: [
    { clave: 'a_min', label: 'Numerador: coef. x mínimo' }, { clave: 'a_max', label: 'Numerador: coef. x máximo' },
    { clave: 'b_min', label: 'Numerador: constante mínima' }, { clave: 'b_max', label: 'Numerador: constante máxima' },
    { clave: 'c_min', label: 'Denominador: coef. x mínimo' }, { clave: 'c_max', label: 'Denominador: coef. x máximo' },
    { clave: 'd_min', label: 'Denominador: constante mínima' }, { clave: 'd_max', label: 'Denominador: constante máxima' },
    { clave: 'x0_min', label: 'Punto x0 mínimo' }, { clave: 'x0_max', label: 'Punto x0 máximo' },
  ],
  limite_indeterminado: [
    { clave: 'x0_min', label: 'Punto x0 mínimo' }, { clave: 'x0_max', label: 'Punto x0 máximo' },
    { clave: 'r_num_min', label: 'Segunda raíz del numerador mínima' }, { clave: 'r_num_max', label: 'Segunda raíz del numerador máxima' },
    { clave: 'r_den_min', label: 'Segunda raíz del denominador mínima' }, { clave: 'r_den_max', label: 'Segunda raíz del denominador máxima' },
  ],
  derivada_polinomio: [
    { clave: 'grado', label: 'Grado (2, 3 o 4)' },
    { clave: 'coef_min', label: 'Coeficiente mínimo' }, { clave: 'coef_max', label: 'Coeficiente máximo' },
  ],
  derivada_racional: [
    { clave: 'a_min', label: 'Numerador: coef. x mínimo' }, { clave: 'a_max', label: 'Numerador: coef. x máximo' },
    { clave: 'b_min', label: 'Numerador: constante mínima' }, { clave: 'b_max', label: 'Numerador: constante máxima' },
    { clave: 'c_min', label: 'Denominador: coef. x mínimo' }, { clave: 'c_max', label: 'Denominador: coef. x máximo' },
    { clave: 'd_min', label: 'Denominador: constante mínima' }, { clave: 'd_max', label: 'Denominador: constante máxima' },
  ],
  derivada_potencias_negativas: [
    { clave: 'exp_min', label: 'Exponente mínimo (negativo)' }, { clave: 'exp_max', label: 'Exponente máximo (negativo)' },
    { clave: 'coef_min', label: 'Coeficiente mínimo' }, { clave: 'coef_max', label: 'Coeficiente máximo' },
  ],
  trig_identidad: [
    { clave: 'k_min', label: 'Factor/coeficiente mínimo' }, { clave: 'k_max', label: 'Factor/coeficiente máximo' },
    { clave: 'escala_max', label: 'Factor de escala máximo de la terna (1 = primitiva)' },
  ],
  trig_ecuacion_simple: [
    { clave: 't_max', label: 'Multiplicador máximo del coeficiente' },
  ],
  trig_razones_triangulo: [
    { clave: 'escala_max', label: 'Factor de escala máximo de la terna (1 = primitiva)' },
  ],
  limite_raiz: [
    { clave: 'p_min', label: 'Coeficiente p mínimo' }, { clave: 'p_max', label: 'Coeficiente p máximo' },
    { clave: 'k_min', label: 'k mínimo (raíz exacta resultante)' }, { clave: 'k_max', label: 'k máximo (raíz exacta resultante)' },
    { clave: 'a_min', label: 'Punto a mínimo' }, { clave: 'a_max', label: 'Punto a máximo' },
  ],
  factorizacion_trinomio_lider: [
    { clave: 'p_min', label: 'Coeficiente líder p (binomio 1) mínimo' }, { clave: 'p_max', label: 'Coeficiente líder p (binomio 1) máximo' },
    { clave: 'q_min', label: 'Constante q (binomio 1) mínima' }, { clave: 'q_max', label: 'Constante q (binomio 1) máxima' },
    { clave: 'r_min', label: 'Coeficiente líder r (binomio 2) mínimo' }, { clave: 'r_max', label: 'Coeficiente líder r (binomio 2) máximo' },
    { clave: 's_min', label: 'Constante s (binomio 2) mínima' }, { clave: 's_max', label: 'Constante s (binomio 2) máxima' },
  ],
  factorizacion_agrupacion: [
    { clave: 'p_min', label: 'Coeficiente líder p (binomio 1) mínimo' }, { clave: 'p_max', label: 'Coeficiente líder p (binomio 1) máximo' },
    { clave: 'q_min', label: 'Constante q (binomio 1) mínima' }, { clave: 'q_max', label: 'Constante q (binomio 1) máxima' },
    { clave: 'r_min', label: 'Coeficiente líder r (binomio 2) mínimo' }, { clave: 'r_max', label: 'Coeficiente líder r (binomio 2) máximo' },
    { clave: 's_min', label: 'Constante s (binomio 2) mínima' }, { clave: 's_max', label: 'Constante s (binomio 2) máxima' },
  ],
  factorizacion_suma_cubos: [
    { clave: 'k_min', label: 'Coeficiente k mínimo' }, { clave: 'k_max', label: 'Coeficiente k máximo' },
    { clave: 'm_min', label: 'Término m mínimo' }, { clave: 'm_max', label: 'Término m máximo' },
  ],
  factorizacion_diferencia_cubos: [
    { clave: 'k_min', label: 'Coeficiente k mínimo' }, { clave: 'k_max', label: 'Coeficiente k máximo' },
    { clave: 'm_min', label: 'Término m mínimo' }, { clave: 'm_max', label: 'Término m máximo' },
  ],
  factorizacion_combinada: [
    { clave: 'g_min', label: 'Factor común g mínimo' }, { clave: 'g_max', label: 'Factor común g máximo' },
    { clave: 'p_min', label: 'Coeficiente/raíz p mínimo' }, { clave: 'p_max', label: 'Coeficiente/raíz p máximo' },
    { clave: 'q_min', label: 'Constante/raíz q mínima' }, { clave: 'q_max', label: 'Constante/raíz q máxima' },
    { clave: 'r_min', label: 'Coeficiente líder r (si aplica) mínimo' }, { clave: 'r_max', label: 'Coeficiente líder r (si aplica) máximo' },
    { clave: 's_min', label: 'Constante s (si aplica) mínima' }, { clave: 's_max', label: 'Constante s (si aplica) máxima' },
  ],
}

export default function CrearEvaluacionPage() {
  const params = useParams()
  const router = useRouter()
  const moduloId = params.moduloId as string
  const supabase = createClient()

  const [evaluacionId, setEvaluacionId] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [notaMinima, setNotaMinima] = useState(70)
  const [intentos, setIntentos] = useState(3)
  const [cantidadAMostrar, setCantidadAMostrar] = useState<number | ''>('')
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [previews, setPreviews] = useState<Record<number, VistaPrevia>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarExistente() {
      const { data: evalExistente } = await supabase
        .from('evaluaciones')
        .select('id, titulo, nota_minima, intentos_permitidos, cantidad_a_mostrar')
        .eq('modulo_id', moduloId)
        .maybeSingle()

      if (evalExistente) {
        setEvaluacionId(evalExistente.id)
        setTitulo(evalExistente.titulo)
        setNotaMinima(evalExistente.nota_minima)
        setIntentos(evalExistente.intentos_permitidos)
        setCantidadAMostrar(evalExistente.cantidad_a_mostrar ?? '')

        const { data: pregExistentes } = await supabase
          .from('preguntas')
          .select('tipo, pregunta, opciones, respuesta_correcta, tolerancia, orden, es_plantilla, tipo_plantilla, parametros')
          .eq('evaluacion_id', evalExistente.id)
          .order('orden', { ascending: true })

        setPreguntas((pregExistentes || []).map((p: any) => ({
          ...p,
          opciones: p.opciones || [],
          respuesta_correcta: p.respuesta_correcta || '',
          es_plantilla: p.es_plantilla || false,
          tipo_plantilla: p.tipo_plantilla || '',
          parametros: p.parametros || {},
        })))
      }
      setCargando(false)
    }
    cargarExistente()
  }, [moduloId])

  function crearPreguntaVacia(orden: number): Pregunta {
    return {
      tipo: 'opcion_multiple',
      pregunta: '',
      opciones: ['', '', '', ''],
      respuesta_correcta: '',
      tolerancia: 0,
      orden,
      es_plantilla: false,
      tipo_plantilla: '',
      parametros: {},
    }
  }

  function agregarPregunta() {
    setPreguntas((prev) => [...prev, crearPreguntaVacia(prev.length + 1)])
  }

  function actualizarPregunta(index: number, campo: string, valor: any) {
    setPreguntas((prev) => {
      const nuevas = [...prev]
      nuevas[index] = { ...nuevas[index], [campo]: valor }
      if (campo === 'tipo') {
        if (valor === 'verdadero_falso') {
          nuevas[index].opciones = ['Verdadero', 'Falso']
          nuevas[index].respuesta_correcta = ''
        } else if (valor === 'opcion_multiple') {
          nuevas[index].opciones = ['', '', '', '']
          nuevas[index].respuesta_correcta = ''
        } else if (valor === 'numerica') {
          nuevas[index].opciones = []
          nuevas[index].respuesta_correcta = ''
        }
      }
      return nuevas
    })
  }

  function actualizarOpcion(preguntaIndex: number, opcionIndex: number, valor: string) {
    setPreguntas((prev) => {
      const nuevas = [...prev]
      const opciones = [...nuevas[preguntaIndex].opciones]
      opciones[opcionIndex] = valor
      nuevas[preguntaIndex] = { ...nuevas[preguntaIndex], opciones }
      return nuevas
    })
  }

  function limpiarPreview(index: number) {
    setPreviews((prev) => {
      const copia = { ...prev }
      delete copia[index]
      return copia
    })
  }

  function cambiarEsPlantilla(index: number, esPlantilla: boolean) {
    setPreguntas((prev) => {
      const nuevas = [...prev]
      if (esPlantilla) {
        const tipoPlantilla: TipoPlantilla = 'ecuacion_lineal'
        nuevas[index] = {
          ...nuevas[index],
          es_plantilla: true,
          tipo_plantilla: tipoPlantilla,
          parametros: { ...DEFAULTS_PARAMETROS[tipoPlantilla] },
          tipo: TIPO_SEGUN_PLANTILLA[tipoPlantilla],
        }
      } else {
        nuevas[index] = {
          ...nuevas[index],
          es_plantilla: false,
          tipo_plantilla: '',
          parametros: {},
          tipo: 'opcion_multiple',
          opciones: ['', '', '', ''],
          respuesta_correcta: '',
        }
      }
      return nuevas
    })
    limpiarPreview(index)
  }

  function actualizarTipoPlantilla(index: number, tipoPlantilla: TipoPlantilla) {
    setPreguntas((prev) => {
      const nuevas = [...prev]
      nuevas[index] = {
        ...nuevas[index],
        tipo_plantilla: tipoPlantilla,
        parametros: { ...DEFAULTS_PARAMETROS[tipoPlantilla] },
        tipo: TIPO_SEGUN_PLANTILLA[tipoPlantilla],
      }
      return nuevas
    })
    limpiarPreview(index)
  }

  function actualizarParametro(index: number, clave: string, valor: number) {
    setPreguntas((prev) => {
      const nuevas = [...prev]
      nuevas[index] = {
        ...nuevas[index],
        parametros: { ...nuevas[index].parametros, [clave]: valor },
      }
      return nuevas
    })
    limpiarPreview(index)
  }

  function generarVistaPrevia(index: number) {
    const p = preguntas[index]
    if (!p.tipo_plantilla) return
    try {
      const resultado = generarPlantilla(p.tipo_plantilla, p.parametros)
      const correcta = resultado.respuestaCorrecta
      const respuestaTexto =
        typeof correcta === 'string'
          ? correcta
          : 'x' in correcta
            ? `x=${correcta.x}, y=${correcta.y}`
            : 'x1' in correcta
              ? `x1=${correcta.x1}, x2=${correcta.x2}`
              : `(${correcta.numerador})/(${correcta.denominador})`
      setPreviews((prev) => ({ ...prev, [index]: { texto: resultado.preguntaTexto, respuesta: respuestaTexto } }))
    } catch (err) {
      setPreviews((prev) => ({ ...prev, [index]: { error: err instanceof Error ? err.message : 'Error al generar' } }))
    }
  }

  function eliminarPregunta(index: number) {
    setPreguntas((prev) => prev.filter((_, i) => i !== index))
  }

  async function guardarEvaluacion() {
    if (!titulo) {
      setError('El título es obligatorio')
      return
    }
    if (preguntas.length === 0) {
      setError('Agrega al menos una pregunta')
      return
    }
    for (const p of preguntas) {
      if (p.es_plantilla) continue
      if (!p.pregunta.trim()) {
        setError('Todas las preguntas fijas deben tener texto')
        return
      }
      if (!p.respuesta_correcta.toString().trim()) {
        setError('Todas las preguntas fijas deben tener respuesta correcta')
        return
      }
    }
    if (cantidadAMostrar !== '' && cantidadAMostrar > preguntas.length) {
      setError('La cantidad a mostrar no puede ser mayor a la cantidad de preguntas del banco')
      return
    }

    setGuardando(true)
    setError('')

    const { data: moduloData } = await supabase
      .from('modulos')
      .select('curso_id')
      .eq('id', moduloId)
      .single()

    let evalId = evaluacionId

    if (evalId) {
      const { error: updateError } = await supabase
        .from('evaluaciones')
        .update({
          titulo,
          nota_minima: notaMinima,
          intentos_permitidos: intentos,
          cantidad_a_mostrar: cantidadAMostrar === '' ? null : cantidadAMostrar,
        })
        .eq('id', evalId)

      if (updateError) {
        setError('Error al actualizar evaluación')
        setGuardando(false)
        return
      }

      const { error: deleteError } = await supabase
        .from('preguntas')
        .delete()
        .eq('evaluacion_id', evalId)

      if (deleteError) {
        setError('Error al actualizar las preguntas')
        setGuardando(false)
        return
      }
    } else {
      const { data: evalData, error: evalError } = await supabase
        .from('evaluaciones')
        .insert({
          modulo_id: moduloId,
          curso_id: moduloData?.curso_id,
          titulo,
          nota_minima: notaMinima,
          intentos_permitidos: intentos,
          cantidad_a_mostrar: cantidadAMostrar === '' ? null : cantidadAMostrar,
        })
        .select()
        .single()

      if (evalError) {
        setError('Error al guardar evaluación')
        setGuardando(false)
        return
      }
      evalId = evalData.id
    }

    for (const p of preguntas) {
      const { error: insertError } = await supabase.from('preguntas').insert({
        evaluacion_id: evalId,
        tipo: p.tipo,
        pregunta: p.es_plantilla ? '' : p.pregunta,
        opciones: !p.es_plantilla && (p.tipo === 'opcion_multiple' || p.tipo === 'verdadero_falso') ? p.opciones : null,
        respuesta_correcta: p.es_plantilla ? null : p.respuesta_correcta,
        tolerancia: p.es_plantilla ? 0 : p.tolerancia,
        orden: p.orden,
        es_plantilla: p.es_plantilla,
        tipo_plantilla: p.es_plantilla ? p.tipo_plantilla : null,
        parametros: p.es_plantilla ? p.parametros : null,
      })

      if (insertError) {
        console.error('Error al guardar pregunta:', insertError)
        setError(`Error al guardar la pregunta ${p.orden}: ${insertError.message}. No se completó el guardado — revisa e intenta de nuevo.`)
        setGuardando(false)
        return
      }
    }

    alert(evaluacionId ? 'Evaluación actualizada correctamente' : 'Evaluación guardada correctamente')
    router.push(`/docente/curso/${moduloData?.curso_id}`)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Exacta<span className="text-yellow-500">Lab</span>
        </Link>
        <button
          onClick={() => router.back()}
          className="text-slate-400 text-sm hover:text-white transition-colors"
        >
          ← Volver
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-12">

        <div className="mb-8">
          <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">
            {evaluacionId ? 'Editar evaluación' : 'Crear evaluación'}
          </div>
          <h1 className="text-3xl font-bold">
            {evaluacionId ? 'Editar evaluación del módulo' : 'Nueva evaluación del módulo'}
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Puedes usar LaTeX en las preguntas. Ejemplo: $x^2$ o $$\frac{"{x}"}{"{2}"}$$
          </p>
        </div>

        {cargando ? (
          <div className="text-slate-400 text-sm">Cargando...</div>
        ) : (
        <>

        {/* CONFIG GENERAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-bold mb-4">Configuración general</h2>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Título de la evaluación
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Evaluación Módulo 1 — Límites"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Nota mínima para aprobar (%)
              </label>
              <input
                type="number"
                value={notaMinima}
                onChange={(e) => setNotaMinima(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Intentos permitidos
              </label>
              <input
                type="number"
                value={intentos}
                onChange={(e) => setIntentos(parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Cantidad de preguntas a mostrar (banco aleatorio)
            </label>
            <input
              type="number"
              value={cantidadAMostrar}
              onChange={(e) => setCantidadAMostrar(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              placeholder="Todas"
              min="1"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
            />
            <p className="text-slate-500 text-xs mt-2">
              Vacío = se muestran todas las preguntas del banco. Si se define, cada alumno recibe esa cantidad elegida al azar del banco.
            </p>
          </div>
        </div>

        {/* PREGUNTAS */}
        <div className="space-y-4 mb-6">
          {preguntas.map((p, index) => (
            <div key={index} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-yellow-500">
                  Pregunta {index + 1}
                </span>
                <button
                  onClick={() => eliminarPregunta(index)}
                  className="text-red-400 text-xs hover:text-red-300 transition-colors"
                >
                  Eliminar
                </button>
              </div>

              {/* FIJA / PLANTILLA */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  ¿Pregunta fija o plantilla?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cambiarEsPlantilla(index, false)}
                    className={`py-3 rounded-xl border font-semibold transition-colors ${
                      !p.es_plantilla
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    Fija
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarEsPlantilla(index, true)}
                    className={`py-3 rounded-xl border font-semibold transition-colors ${
                      p.es_plantilla
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    Plantilla
                  </button>
                </div>
              </div>

              {/* TIPO (solo fija) */}
              {!p.es_plantilla && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Tipo de pregunta
                  </label>
                  <select
                    value={p.tipo}
                    onChange={(e) => actualizarPregunta(index, 'tipo', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="opcion_multiple">Opción múltiple</option>
                    <option value="verdadero_falso">Verdadero / Falso</option>
                    <option value="numerica">Respuesta numérica</option>
                  </select>
                </div>
              )}

              {/* PREGUNTA (solo fija: en plantilla el enunciado se genera solo) */}
              {!p.es_plantilla && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Pregunta (puedes usar LaTeX con $formula$)
                  </label>
                  <textarea
                    value={p.pregunta}
                    onChange={(e) => actualizarPregunta(index, 'pregunta', e.target.value)}
                    placeholder="Ej: ¿Cuál es la derivada de $x^2$?"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors resize-none"
                  />
                  {p.pregunta && (
                    <div className="mt-2 bg-slate-800 rounded-lg px-4 py-2 text-sm">
                      <span className="text-slate-500 text-xs">Vista previa: </span>
                      <TextoMath texto={p.pregunta} />
                    </div>
                  )}
                </div>
              )}

              {/* OPCIONES MULTIPLE */}
              {!p.es_plantilla && p.tipo === 'opcion_multiple' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Opciones
                  </label>
                  {p.opciones.map((op, opIndex) => (
                    <div key={opIndex} className="flex items-center gap-3 mb-2">
                      <span className="text-slate-400 text-sm w-6 font-mono">
                        {String.fromCharCode(65 + opIndex)})
                      </span>
                      <input
                        type="text"
                        value={op}
                        onChange={(e) => actualizarOpcion(index, opIndex, e.target.value)}
                        placeholder={`Opción ${String.fromCharCode(65 + opIndex)}`}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors text-sm"
                      />
                    </div>
                  ))}
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Respuesta correcta
                    </label>
                    <select
                      value={p.respuesta_correcta}
                      onChange={(e) => actualizarPregunta(index, 'respuesta_correcta', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                    >
                      <option value="">Selecciona la correcta</option>
                      {p.opciones.map((op, opIndex) => (
                        <option key={opIndex} value={String.fromCharCode(65 + opIndex)}>
                          {String.fromCharCode(65 + opIndex)}) {op}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* VERDADERO FALSO */}
              {!p.es_plantilla && p.tipo === 'verdadero_falso' && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Respuesta correcta
                  </label>
                  <select
                    value={p.respuesta_correcta}
                    onChange={(e) => actualizarPregunta(index, 'respuesta_correcta', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="">Selecciona</option>
                    <option value="Verdadero">Verdadero</option>
                    <option value="Falso">Falso</option>
                  </select>
                </div>
              )}

              {/* NUMERICA */}
              {!p.es_plantilla && p.tipo === 'numerica' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Respuesta correcta
                    </label>
                    <input
                      type="number"
                      value={p.respuesta_correcta}
                      onChange={(e) => actualizarPregunta(index, 'respuesta_correcta', e.target.value)}
                      placeholder="Ej: 12"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Tolerancia (±)
                    </label>
                    <input
                      type="number"
                      value={p.tolerancia}
                      onChange={(e) => actualizarPregunta(index, 'tolerancia', parseFloat(e.target.value))}
                      placeholder="Ej: 0.1"
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* PLANTILLA */}
              {p.es_plantilla && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Tipo de plantilla
                  </label>
                  <Combobox
                    opciones={OPCIONES_TIPO_PLANTILLA}
                    value={p.tipo_plantilla}
                    onChange={(valor) => actualizarTipoPlantilla(index, valor as TipoPlantilla)}
                    placeholder="Busca una plantilla (ej: trig, deriv, factor)..."
                  />

                  {p.tipo_plantilla && (
                    <p className="text-slate-500 text-xs mt-2 mb-4">
                      Tipo de respuesta: {LABEL_TIPO_RESPUESTA[TIPO_SEGUN_PLANTILLA[p.tipo_plantilla]]}
                    </p>
                  )}

                  {p.tipo_plantilla && (
                    <>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Rangos de generación
                      </label>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {CAMPOS_PARAMETROS[p.tipo_plantilla].map(({ clave, label }) => (
                          <div key={clave}>
                            <label className="block text-xs text-slate-400 mb-1">{label}</label>
                            <input
                              type="number"
                              value={p.parametros[clave] ?? 0}
                              onChange={(e) => actualizarParametro(index, clave, parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-yellow-500 transition-colors text-sm"
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => generarVistaPrevia(index)}
                        className="border border-slate-700 text-yellow-500 font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors text-sm"
                      >
                        Vista previa
                      </button>

                      {previews[index] && (
                        <div className="mt-3 bg-slate-800 rounded-lg px-4 py-3 text-sm">
                          {'error' in previews[index] ? (
                            <span className="text-red-400">{(previews[index] as { error: string }).error}</span>
                          ) : (
                            <>
                              <div className="text-slate-500 text-xs mb-1">Vista previa:</div>
                              <div className="whitespace-pre-line mb-2">
                                <TextoMath texto={(previews[index] as { texto: string; respuesta: string }).texto} />
                              </div>
                              <div className="text-green-400 text-xs">
                                Respuesta correcta: {(previews[index] as { texto: string; respuesta: string }).respuesta}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>

        {/* AGREGAR PREGUNTA */}
        <button
          onClick={agregarPregunta}
          className="w-full border-2 border-dashed border-slate-700 rounded-2xl py-4 text-slate-400 hover:border-yellow-500/50 hover:text-yellow-500 transition-colors mb-6 font-semibold"
        >
          + Agregar pregunta
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={guardarEvaluacion}
            disabled={guardando}
            className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : evaluacionId ? 'Guardar cambios' : 'Guardar evaluación'}
          </button>
          <button
            onClick={() => router.back()}
            className="border border-slate-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
        </div>

        </>
        )}

      </div>
    </main>
  )
}
