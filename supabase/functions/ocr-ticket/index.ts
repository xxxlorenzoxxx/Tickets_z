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

    // If no Anthropic key configured, return simulated OCR for demo
    if (!anthropicApiKey) {
      const demo: OCRResult = {
        fecha_ticket: new Date().toISOString().split("T")[0],
        numero_ticket: "0001-00099999",
        numero_z: "Z-0100",
        cuit: "30-71234567-0",
        razon_social: "COMERCIO DEMO SA",
        tipo_comprobante: "Ticket Z",
        base_neta_21: 826.45,
        iva_21: 173.55,
        base_neta_105: 190.48,
        iva_105: 20.00,
        otros_impuestos: 0,
        total: 1210.48,
        confianza_ocr: 75,
        texto_raw: "Demo: imagen procesada sin API key configurada",
      };
      return new Response(JSON.stringify(demo), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Eres un experto en análisis de tickets fiscales argentinos (Tickets Z, Cierres Z).
Analiza esta imagen de un ticket fiscal argentino y extrae TODOS los datos fiscales.

Reglas importantes:
- Los números usan separador decimal con COMA en Argentina (ej: 1.234,56 = 1234.56)
- El CUIT tiene formato XX-XXXXXXXX-X
- Busca IVA 21%, IVA 10,5%, bases netas, percepciones y otros impuestos
- El número Z o cierre Z puede estar como "Z XXXX", "CIERRE Z", "NRO Z"
- Fecha puede estar en formato DD/MM/AAAA
- Si un campo no está presente, omítelo

Responde ÚNICAMENTE con un JSON válido con estos campos exactos (sin texto adicional):
{
  "fecha_ticket": "YYYY-MM-DD",
  "numero_ticket": "string",
  "numero_z": "string",
  "cuit": "string (formato XX-XXXXXXXX-X)",
  "razon_social": "string",
  "tipo_comprobante": "string",
  "base_neta_21": number,
  "iva_21": number,
  "base_neta_105": number,
  "iva_105": number,
  "otros_impuestos": number,
  "total": number,
  "confianza_ocr": number (0-100, tu nivel de confianza en la extracción),
  "texto_raw": "string (texto completo que pudiste leer del ticket)"
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
