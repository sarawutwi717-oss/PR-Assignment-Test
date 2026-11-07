export type PRStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const PR_STATUSES: readonly PRStatus[] = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
];

export function isPRStatus(value: unknown): value is PRStatus {
  return typeof value === 'string' && PR_STATUSES.includes(value as PRStatus);
}

export type Role = 'REQUESTER' | 'APPROVER';

export type PRAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'RETURN_TO_DRAFT';

export type PRActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN_TO_DRAFT';

export interface PRItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type PRItemInput = Omit<PRItem, 'id'>;

export interface PRDocument {
  id: string;
  prNumber: string;
  department: string;
  requesterName: string;
  items: PRItem[];
  subtotal: number;
  vat: number;
  grandTotal: number;
  status: PRStatus;
  createdAt: string;
  rejectReason?: string;
}

export interface PRDraftInput {
  department: string;
  requesterName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}