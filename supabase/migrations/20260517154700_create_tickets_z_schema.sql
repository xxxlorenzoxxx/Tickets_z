/*
  # Tickets Z Fiscales - Schema inicial

  ## Descripcion
  Crea la estructura de base de datos para la aplicacion de Tickets Z fiscales argentinos.

  ## Tablas nuevas

  ### `tickets`
  Almacena cada ticket fiscal procesado:
  - `id`: UUID primario
  - `created_at`: Fecha de creacion
  - `fecha_ticket`: Fecha del comprobante fiscal
  - `numero_ticket`: Numero del ticket
  - `numero_z`: Numero de cierre Z
  - `cuit`: CUIT del comercio emisor
  - `razon_social`: Nombre del comercio
  - `tipo_comprobante`: Tipo (Ticket Z, Cierre Z, etc.)
  - `base_neta_21`: Base imponible para IVA 21%
  - `iva_21`: Monto IVA al 21%
  - `base_neta_105`: Base imponible para IVA 10.5%
  - `iva_105`: Monto IVA al 10.5%
  - `otros_impuestos`: Otros impuestos del ticket
  - `total`: Total del ticket
  - `imagen_url`: URL de la imagen original
  - `estado`: Estado del procesamiento (pendiente, procesado, error, revisado)
  - `confianza_ocr`: Nivel de confianza del OCR (0-100)
  - `datos_raw`: JSON con los datos crudos del OCR
  - `notas`: Notas del contador

  ### `sesiones_carga`
  Agrupa tickets subidos en la misma sesion:
  - `id`: UUID primario
  - `created_at`: Fecha
  - `nombre`: Nombre descriptivo de la sesion
  - `periodo`: Mes/año fiscal
  - `total_tickets`: Cantidad de tickets
  - `estado`: Estado general

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Politicas para usuarios autenticados
*/

CREATE TABLE IF NOT EXISTS sesiones_carga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  nombre text DEFAULT '',
  periodo text DEFAULT '',
  total_tickets integer DEFAULT 0,
  estado text DEFAULT 'activa',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE sesiones_carga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON sesiones_carga FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sesiones_carga FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sesiones_carga FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sesiones_carga FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sesion_id uuid REFERENCES sesiones_carga(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_ticket date,
  numero_ticket text DEFAULT '',
  numero_z text DEFAULT '',
  cuit text DEFAULT '',
  razon_social text DEFAULT '',
  tipo_comprobante text DEFAULT 'Ticket Z',
  base_neta_21 numeric(12,2) DEFAULT 0,
  iva_21 numeric(12,2) DEFAULT 0,
  base_neta_105 numeric(12,2) DEFAULT 0,
  iva_105 numeric(12,2) DEFAULT 0,
  otros_impuestos numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  imagen_url text DEFAULT '',
  estado text DEFAULT 'pendiente',
  confianza_ocr integer DEFAULT 0,
  datos_raw jsonb DEFAULT '{}',
  notas text DEFAULT ''
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_fecha ON tickets(fecha_ticket);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_sesion ON tickets(sesion_id);
