export type TicketEstado = 'pendiente' | 'procesado' | 'error' | 'revisado';

export interface Ticket {
  id: string;
  created_at: string;
  updated_at: string;
  sesion_id: string | null;
  user_id: string;
  fecha_ticket: string | null;
  numero_ticket: string;
  numero_z: string;
  cuit: string;
  razon_social: string;
  tipo_comprobante: string;
  base_neta_21: number;
  iva_21: number;
  base_neta_105: number;
  iva_105: number;
  otros_impuestos: number;
  total: number;
  imagen_url: string;
  estado: TicketEstado;
  confianza_ocr: number;
  datos_raw: Record<string, unknown>;
  notas: string;
}

export interface SesionCarga {
  id: string;
  created_at: string;
  nombre: string;
  periodo: string;
  total_tickets: number;
  estado: string;
  user_id: string;
}

export interface OCRResult {
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

export type Database = {
  public: {
    Tables: {
      tickets: {
        Row: Ticket;
        Insert: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Ticket, 'id' | 'created_at'>>;
      };
      sesiones_carga: {
        Row: SesionCarga;
        Insert: Omit<SesionCarga, 'id' | 'created_at'>;
        Update: Partial<Omit<SesionCarga, 'id' | 'created_at'>>;
      };
    };
  };
};
