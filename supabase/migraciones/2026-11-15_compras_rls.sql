-- Cierra los permisos de escritura sobre "compras" desde el navegador.
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de publicar el código que
-- escribe las compras con el cliente admin (app/api/payphone/*,
-- lib/payphone-aprobar.ts). Si se corre antes, las compras dejan de
-- registrarse hasta que ese código esté en producción.
--
-- Qué había: "Sistema actualiza compras" (UPDATE, using true) y "Sistema
-- inserta compras" (INSERT, with check true) aplicaban a cualquier usuario,
-- no solo al servidor. Con la clave pública de la app, cualquiera podía
-- marcar una compra como aprobada, o insertar una ya aprobada, y obtener
-- los cursos sin pagar. "Insertar compra propia" permitía además insertar
-- una fila propia con cualquier estado y monto.
--
-- El servidor usa la service role key, que no pasa por RLS, así que no
-- necesita ninguna de estas políticas. Queda solo la de lectura: cada
-- alumno ve sus propias compras.

drop policy if exists "Sistema actualiza compras" on public.compras;
drop policy if exists "Sistema inserta compras" on public.compras;
drop policy if exists "Insertar compra propia" on public.compras;

alter table public.compras enable row level security;
