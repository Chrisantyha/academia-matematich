import { notFound } from 'next/navigation'

// Página de prueba retirada: mostraba un video sin iniciar sesión. Se deja
// respondiendo 404 (este archivo se puede borrar del repositorio).
export default function TestVideo() {
  notFound()
}
