import { PR_STATUSES, type PRStatus } from '@/type/pr';

export const PR_STATUS_FILTERS: readonly ('ALL' | PRStatus)[] = [
  'ALL',
  ...PR_STATUSES,
];

export const PR_STATUS_STYLES: Record<PRStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return `${currencyFormatter.format(amount)} ฿`;
}
