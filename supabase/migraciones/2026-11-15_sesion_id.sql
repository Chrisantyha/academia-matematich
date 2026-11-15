-- Una sola sesión activa por cuenta, por identificador de sesión (reemplaza
-- la comparación por IP de 2026-10-04_ip_sesion.sql).
-- Ejecutar una sola vez en el SQL Editor de Supabase, en producción.
--
-- Por qué cambia: la IP no identifica una sesión. Un alumno que pasa de wifi
-- a datos móviles cambia de IP y era expulsado; dos personas en la misma red
-- (un colegio, una casa) comparten IP y no se detectaban. Ahora cada inicio
-- de sesión genera un identificador al azar que se guarda aquí y en una
-- cookie del navegador; proxy.ts cierra la sesión cuyo identificador ya no
-- es el último.
--
-- Si esta migración no corre, la verificación simplemente no hace nada
-- (falla en silencio) — no rompe el resto de la plataforma. Las columnas
-- ip_sesion / ip_sesion_en quedan sin uso y se pueden conservar.

alter table public.perfiles
  add column if not exists sesion_id text,
  add column if not exists sesion_en timestamptz;

comment on column public.perfiles.sesion_id is
  'Identificador al azar del último inicio de sesión de esta cuenta (app/api/auth/ip-sesion). proxy.ts cierra cualquier sesión cuya cookie exacta_sesion no coincida.';
comment on column public.perfiles.sesion_en is
  'Fecha/hora en que se registró sesion_id.';
