import type { PRItem } from '@/type/pr';

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return toCents(quantity * unitPrice) / 100;
}

export function calculatePRTotals(
  items: readonly Pick<PRItem, 'quantity' | 'unitPrice'>[],
) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + toCents(item.quantity * item.unitPrice),
    0,
  );
  const vatCents = Math.round(subtotalCents * 0.07);

  return {
    subtotal: subtotalCents / 100,
    vat: vatCents / 100,
    grandTotal: (subtotalCents + vatCents) / 100,
  };
}
