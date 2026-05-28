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
VITE_SUPABASE_URL=<tu_supabase_url>
VITE_SUPABASE_ANON_KEY=<tu_supabase_anon_key>
```

3. Crear el bucket de Storage en Supabase:

```bash
supabase storage create-bucket tickets-uploads --public
```

4. Si querés usar OCR real con Anthropic, agrega también:

```bash
ANTHROPIC_API_KEY=<tu_anthropic_api_key>
```

4. Ejecutar en modo desarrollo:

```bash
npm run dev
```

5. Abrir la app en el navegador en la URL que indique Vite.

## Detalles del OCR

- El frontend convierte la imagen a base64 y la envía a la función Supabase:
  `supabase/functions/ocr-ticket`
- La función intenta usar la API de Anthropic Claude para extraer los datos.
- Si no hay `ANTHROPIC_API_KEY`, devuelve un resultado de demo simulado para poder probar la UI.

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
