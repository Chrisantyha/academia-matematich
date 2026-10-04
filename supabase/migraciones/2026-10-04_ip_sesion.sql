-- Una sola sesión activa por cuenta (evita compartir usuario y contraseña).
-- Ejecutar una sola vez en el SQL Editor de Supabase, en producción, antes
-- de publicar el proxy.ts y el login/page.tsx que usan estas columnas.
--
-- Qué hace: agrega a "perfiles" la IP desde la que cada cuenta inició
-- sesión por última vez. app/(auth)/login/page.tsx la actualiza al iniciar
-- sesión; proxy.ts la revisa en cada petición y cierra la sesión si ya no
-- coincide (alguien volvió a iniciar sesión con la misma cuenta desde otro
-- lugar). Si esta migración no corre, esa verificación simplemente no hace
-- nada (falla en silencio) — no rompe el resto de la plataforma.

alter table public.perfiles
  add column if not exists ip_sesion text,
  add column if not exists ip_sesion_en timestamptz;

comment on column public.perfiles.ip_sesion is
  'IP desde la que esta cuenta inició sesión por última vez (app/(auth)/login/page.tsx). Si una petición posterior llega con otra IP, proxy.ts cierra esa sesión.';
comment on column public.perfiles.ip_sesion_en is
  'Fecha/hora en que se registró ip_sesion.';
