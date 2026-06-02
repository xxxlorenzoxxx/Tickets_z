import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OCRResult {
  fecha_ticket?: string;
  numero_ticket?: string;
  numero_z?: string;
  cuit?: string;
  razon_social?: string;
  tipo_comprobante?: string;
  base_neta_21?: number;
  iva_21?: number;
  base_neta_105?: number;
  iva_105?: number;
  otros_impuestos?: number;
  total?: number;
  confianza_ocr?: number;
  texto_raw?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    const body = await req.json();
    const { imageBase64, mimeType } = body as { imageBase64: string; mimeType: string };

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no Anthropic key configured, use basic validation instead
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({
          error: "API key no configurada. Por favor, contacta al administrador para activar OCR con IA.",
          demo: true,
          confianza_ocr: 0,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = `Eres un experto analizando imágenes de tickets fiscales argentinos (Tickets Z, Cierres Z).

IMPORTANTE: Antes de extraer datos, verifica que la imagen contenga REALMENTE un ticket fiscal argentino.

Criterios para identificar un ticket válido:
- Debe contener número de ticket O número Z
- Debe tener al menos uno de estos: fecha, CUIT, razón social, totales o IVA
- Debe verse como un recibo/ticket (puede ser foto o PDF)
- NO es ticket válido si es: foto de mascota, paisaje, documento personal, carnet, etc.

Si detectas que NO ES un ticket fiscal argentino:
- Devuelve confianza_ocr: 0
- Todos los campos numéricos con valor 0
- Campos texto con valor null
- En texto_raw escribe: "NO_VALIDO: No se detectó un ticket fiscal"

Si ES un ticket:
- Extrae TODOS los datos disponibles
- Los números usan separador decimal con COMA en Argentina (ej: 1.234,56 = 1234.56)
- El CUIT tiene formato XX-XXXXXXXX-X
- Busca IVA 21%, IVA 10,5%, bases netas, percepciones y otros impuestos
- El número Z puede estar como "Z XXXX", "CIERRE Z", "NRO Z"
- Fecha puede estar en formato DD/MM/AAAA
- Si un campo no está visible, omítelo (null)
- confianza_ocr debe reflejar qué tan clara es la lectura (0-100)

Responde ÚNICAMENTE con un JSON válido (sin texto adicional):
{
  "fecha_ticket": "YYYY-MM-DD o null",
  "numero_ticket": "string o null",
  "numero_z": "string o null",
  "cuit": "string formato XX-XXXXXXXX-X o null",
  "razon_social": "string o null",
  "tipo_comprobante": "string o null",
  "base_neta_21": number,
  "iva_21": number,
  "base_neta_105": number,
  "iva_105": number,
  "otros_impuestos": number,
  "total": number,
  "confianza_ocr": number (0 si no es ticket, 1-100 si es válido),
  "texto_raw": "string (texto detectado) o 'NO_VALIDO' si no es ticket"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeResponse = await response.json();
    const textContent = claudeResponse.content?.find((c: { type: string }) => c.type === "text");

    if (!textContent) {
      throw new Error("No text response from Claude");
    }

    // Parse JSON from Claude's response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const ocrResult: OCRResult = JSON.parse(jsonMatch[0]);

    // Rechazar si Claude detectó que NO es un ticket válido
    if (ocrResult.confianza_ocr === 0 || ocrResult.texto_raw?.includes("NO_VALIDO")) {
      return new Response(
        JSON.stringify({
          error: "La imagen no contiene un ticket fiscal válido. Por favor, carga una foto clara de un ticket Z o comprobante fiscal argentino.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // También rechazar si no hay datos mínimos de ticket
    const hasMinimalData =
      (ocrResult.numero_ticket && ocrResult.numero_ticket.trim()) ||
      (ocrResult.numero_z && ocrResult.numero_z.trim()) ||
      (ocrResult.total && ocrResult.total > 0) ||
      (ocrResult.iva_21 && ocrResult.iva_21 > 0) ||
      (ocrResult.iva_105 && ocrResult.iva_105 > 0);

    if (!hasMinimalData && (ocrResult.confianza_ocr || 0) < 50) {
      return new Response(
        JSON.stringify({
          error: "No se pudieron extraer datos válidos de la imagen. Verifica que sea un ticket fiscal legible.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(ocrResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OCR error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "OCR processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
