export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCUIT(cuit: string): string {
  const clean = cuit.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  }
  return cuit;
}

export function validateCUIT(cuit: string): boolean {
  const clean = cuit.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = clean.split('').map(Number);
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
  return check === digits[10];
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function parseArgentineNumber(text: string): number {
  // Handle Argentine decimal separators: 1.234,56 -> 1234.56
  const clean = text.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  return parseFloat(clean) || 0;
}

export function getPeriodo(date: Date = new Date()): string {
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
