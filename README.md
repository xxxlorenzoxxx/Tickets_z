# Tickets_z

Aplicación para subir y procesar tickets fiscales argentinos tipo Ticket Z. Extrae datos con OCR/IA, registra tickets, muestra un dashboard y permite exportar los resultados a Excel.

## Stack

- React 18
- Vite 5
- TypeScript 5
- Tailwind CSS 3
- Supabase (cliente y edge functions)
- `lucide-react` para íconos
- `xlsx` para exportar Excel
- Supabase Edge Functions con Deno para el backend OCR
- Supabase Storage para guardar imágenes originales (bucket `tickets-uploads`)
- Anthropic Claude para OCR si está configurado

## Prerrequisitos

- Node.js 18+ compatible con Vite 5
- npm o yarn
- Supabase CLI instalado para servir y desplegar funciones edge

## Funcionalidades

- Carga de tickets mediante drag & drop o selección de archivos
- Soporte para imágenes y PDFs
- Procesamiento OCR de tickets con IA
- Extrae campos como:
  - fecha_ticket
  - número de ticket
  - número Z
  - CUIT
  - razón social
  - tipo de comprobante
  - base neta 21%
  - IVA 21%
  - base neta 10.5%
  - IVA 10.5%
  - otros impuestos
  - total
  - confianza OCR
- Dashboard con métricas generales y progreso mensual
- Tabla de tickets con búsqueda, filtros, ordenamiento y edición ligera
- Exportar tickets a Excel

## Cómo arrancar

1. Instalar dependencias:

```bash
npm install
```

2. Crear un archivo `.env` o usar variables de entorno con:

```bash
VITE_SUPABASE_URL=<https://hteerhjmfxlszdajolnz.supabase.co>
VITE_SUPABASE_ANON_KEY=<eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZWVyaGptZnhsc3pkYWpvbG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTY1OTgsImV4cCI6MjA5NDU5MjU5OH0.X201efyeE8DWwfNVLTwLR-HF8f6XGzgfH7wf6dFIt3Q>
```

3. Crear el bucket de Storage en Supabase:

```bash
supabase storage create-bucket tickets-uploads --public
```

4. Si querés usar OCR real con Anthropic, agrega también:

```bash
ANTHROPIC_API_KEY=<tu_anthropic_api_key>
```

5. Ejecutar en modo desarrollo:

```bash
npm run dev
```

6. Abrir la app en el navegador en la URL que indique Vite.

7. Opcional: servir la función edge localmente con Supabase CLI:

```bash
supabase functions serve ocr-ticket
```

8. Opcional: desplegar la función a Supabase:

```bash
supabase functions deploy ocr-ticket
```

## Detalles del OCR

- El frontend convierte la imagen a base64 y la envía a la función Supabase:
  `supabase/functions/ocr-ticket`
- La función intenta usar la API de Anthropic Claude para extraer los datos.
- Si no hay `ANTHROPIC_API_KEY`, la función devuelve un resultado de demo simulado para que la UI pueda probarse sin clave externa.

## DER

```mermaid
erDiagram
  AUTH_USERS ||--o{ SESIONES_CARGA : crea
  AUTH_USERS ||--o{ TICKETS : carga
  SESIONES_CARGA ||--o{ TICKETS : agrupa

  AUTH_USERS {
    uuid id PK
  }

  SESIONES_CARGA {
    uuid id PK
    timestamptz created_at
    text nombre
    text periodo
    integer total_tickets
    text estado
    uuid user_id FK
  }

  TICKETS {
    uuid id PK
    timestamptz created_at
    timestamptz updated_at
    uuid sesion_id FK
    uuid user_id FK
    date fecha_ticket
    text numero_ticket
    text numero_z
    text cuit
    text razon_social
    text tipo_comprobante
    numeric base_neta_21
    numeric iva_21
    numeric base_neta_105
    numeric iva_105
    numeric otros_impuestos
    numeric total
    text imagen_url
    text estado
    integer confianza_ocr
    jsonb datos_raw
    text notas
  }
```

## Comandos disponibles

- `npm run dev` — iniciar servidor de desarrollo
- `npm run build` — crear build de producción
- `npm run preview` — previsualizar el build
- `npm run lint` — ejecutar ESLint
- `npm run typecheck` — ejecutar TypeScript sin generar archivos

## Estructura relevante

- `src/App.tsx` — navegación principal entre Dashboard, Upload y Tickets
- `src/pages/Upload.tsx` — UI y flujo de carga / OCR de archivos
- `src/pages/Tickets.tsx` — listado, filtros, edición y exportación de tickets
- `src/pages/Dashboard.tsx` — métricas y resumen
- `src/lib/supabase.ts` — cliente Supabase
- `src/lib/exportExcel.ts` — exportación de Excel
- `supabase/functions/ocr-ticket/index.ts` — backend OCR

## Notas

- El proyecto está pensado para procesar tickets fiscales argentinos con un modelo de IA.
- El modo demo permite seguir probando la app sin depender de una API key externa.
