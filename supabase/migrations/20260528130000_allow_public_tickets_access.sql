/*
  Habilita acceso público a `tickets` y `sesiones_carga` para desarrollo
  y pruebas cuando la app no usa autenticación de Supabase.
*/

ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_carga DISABLE ROW LEVEL SECURITY;

-- Si querés usar RLS más adelante, vuelvas a habilitarlo y crear políticas.
