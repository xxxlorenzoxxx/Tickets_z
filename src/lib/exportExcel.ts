import type { Ticket } from './types';
import { formatDate, formatCUIT } from './utils';

export async function exportToExcel(tickets: Ticket[], filename = 'tickets_z'): Promise<void> {
  // Dynamic import to keep bundle lean
  const XLSX = await import('xlsx');

  const headers = [
    'Fecha',
    'N° Ticket',
    'N° Z / Cierre',
    'CUIT',
    'Razón Social',
    'Tipo Comprobante',
    'Base Neta 21%',
    'IVA 21%',
    'Base Neta 10.5%',
    'IVA 10.5%',
    'Otros Impuestos',
    'Total',
    'Estado',
    'Confianza OCR',
    'Notas',
  ];

  const rows = tickets.map((t) => [
    formatDate(t.fecha_ticket),
    t.numero_ticket,
    t.numero_z,
    formatCUIT(t.cuit),
    t.razon_social,
    t.tipo_comprobante,
    t.base_neta_21,
    t.iva_21,
    t.base_neta_105,
    t.iva_105,
    t.otros_impuestos,
    t.total,
    t.estado,
    `${t.confianza_ocr}%`,
    t.notas,
  ]);

  // Totals row
  const totalsRow = [
    'TOTALES',
    '',
    '',
    '',
    '',
    '',
    tickets.reduce((s, t) => s + t.base_neta_21, 0),
    tickets.reduce((s, t) => s + t.iva_21, 0),
    tickets.reduce((s, t) => s + t.base_neta_105, 0),
    tickets.reduce((s, t) => s + t.iva_105, 0),
    tickets.reduce((s, t) => s + t.otros_impuestos, 0),
    tickets.reduce((s, t) => s + t.total, 0),
    '',
    '',
    '',
  ];

  const wsData = [headers, ...rows, [], totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 30 },
    { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tickets Z');

  const period = new Date().toLocaleDateString('es-AR', { month: '2-digit', year: 'numeric' }).replace('/', '-');
  XLSX.writeFile(wb, `${filename}_${period}.xlsx`);
}
