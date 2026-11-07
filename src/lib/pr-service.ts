import { calculateLineTotal } from './pr-money';
import type { PRAction, PRDraftInput, PRItemInput, PRStatus, Role } from '@/type/pr';

function parseUnitPriceCents(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !value.trim())) {
    return null;
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return null;

  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function createPRItems(items: PRDraftInput['items']): PRItemInput[] {
  return items.map((item) => ({
    ...item,
    totalPrice: calculateLineTotal(item.quantity, item.unitPrice),
  }));
}

export function validatePRDraft(value: unknown):
  | { success: true; data: PRDraftInput }
  | { success: false; message: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { success: false, message: 'ข้อมูลใบขอซื้อไม่ถูกต้อง' };
  }

  const input = value as Record<string, unknown>;
  if (typeof input.department !== 'string' || !input.department.trim()) {
    return { success: false, message: 'กรุณาระบุแผนก' };
  }
  if (input.department.trim().length > 120) {
    return { success: false, message: 'ชื่อแผนกต้องไม่เกิน 120 ตัวอักษร' };
  }
  if (typeof input.requesterName !== 'string' || !input.requesterName.trim()) {
    return { success: false, message: 'กรุณาระบุชื่อผู้ขอซื้อ' };
  }
  if (input.requesterName.trim().length > 120) {
    return { success: false, message: 'ชื่อผู้ขอซื้อต้องไม่เกิน 120 ตัวอักษร' };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { success: false, message: 'ต้องมีสินค้าอย่างน้อย 1 รายการ' };
  }
  if (input.items.length > 100) {
    return { success: false, message: 'รายการสินค้าได้ไม่เกิน 100 รายการ' };
  }

  const items: PRDraftInput['items'] = [];
  let subtotalCents = 0;
  for (const [index, rawItem] of input.items.entries()) {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      return { success: false, message: `รายการที่ ${index + 1} ไม่ถูกต้อง` };
    }

    const item = rawItem as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const hasQuantity = typeof item.quantity === 'number' ||
      (typeof item.quantity === 'string' && item.quantity.trim() !== '');
    const quantity = Number(item.quantity);
    const unitPriceCents = parseUnitPriceCents(item.unitPrice);

    if (!name) {
      return { success: false, message: `กรุณาระบุชื่อสินค้าในรายการที่ ${index + 1}` };
    }
    if (name.length > 200) {
      return { success: false, message: `ชื่อสินค้าในรายการที่ ${index + 1} ต้องไม่เกิน 200 ตัวอักษร` };
    }
    if (!hasQuantity || !Number.isSafeInteger(quantity) || quantity < 1) {
      return { success: false, message: `จำนวนสินค้าในรายการที่ ${index + 1} ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป` };
    }
    if (quantity > 2_147_483_647) {
      return { success: false, message: `จำนวนสินค้าในรายการที่ ${index + 1} มากเกินไป` };
    }
    if (unitPriceCents === null) {
      return { success: false, message: `ราคาต่อหน่วยในรายการที่ ${index + 1} ไม่ถูกต้อง` };
    }
    const lineTotalCents = quantity * unitPriceCents;
    if (!Number.isSafeInteger(lineTotalCents)) {
      return { success: false, message: `ยอดเงินในรายการที่ ${index + 1} มากเกินไป` };
    }
    subtotalCents += lineTotalCents;
    if (!Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(Math.round(subtotalCents * 1.07))) {
      return { success: false, message: 'ยอดรวมใบขอซื้อสูงเกินไป' };
    }

    items.push({ name, quantity, unitPrice: unitPriceCents / 100 });
  }

  return {
    success: true,
    data: {
      department: input.department.trim(),
      requesterName: input.requesterName.trim(),
      items,
    },
  };
}

export function validateStateTransition(current: PRStatus, target: PRStatus): boolean {
  const transitions: Record<PRStatus, readonly PRStatus[]> = {
    DRAFT: ['PENDING'],
    PENDING: ['APPROVED', 'REJECTED', 'DRAFT'],
    APPROVED: [],
    REJECTED: ['DRAFT'],
  };

  return transitions[current].includes(target);
}

const actionTargets: Record<PRAction, PRStatus> = {
  SUBMIT: 'PENDING',
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  RETURN_TO_DRAFT: 'DRAFT',
};

export function isPRAction(value: unknown): value is PRAction {
  return typeof value === 'string' && Object.hasOwn(actionTargets, value);
}

export function canPerformPRAction(
  role: Role,
  action: PRAction,
  currentStatus: PRStatus,
): boolean {
  if (!canRolePerformPRAction(role, action, currentStatus)) return false;
  return validateStateTransition(currentStatus, actionTargets[action]);
}

export function canRolePerformPRAction(
  role: Role,
  action: PRAction,
  currentStatus: PRStatus,
): boolean {
  if (action === 'SUBMIT') return role === 'REQUESTER';
  if (action === 'APPROVE' || action === 'REJECT') return role === 'APPROVER';
  return (role === 'APPROVER' && currentStatus === 'PENDING') ||
    (role === 'REQUESTER' && currentStatus === 'REJECTED');
}

export function getPRActionTargetStatus(action: PRAction): PRStatus {
  return actionTargets[action];
}

export function validateRejectReason(value: unknown):
  | { success: true; reason: string }
  | { success: false; message: string } {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (!reason) {
    return { success: false, message: 'กรุณาระบุเหตุผลในการไม่อนุมัติ (Reject)' };
  }
  if (reason.length > 500) {
    return { success: false, message: 'เหตุผลต้องไม่เกิน 500 ตัวอักษร' };
  }
  return { success: true, reason };
}

export function formatPRNumber(sequence: number, date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const displayDate = `${datePart.slice(6, 8)}${datePart.slice(4, 6)}${datePart.slice(0, 4)}`;
  return formatSequenceId(`PR-${displayDate}-`, sequence, 3, 'PR sequence');
}

export function nextPRSequence(
  currentSequence: number,
  prNumbers: readonly string[],
  date = new Date(),
): number {
  const prefix = formatPRNumber(1, date).replace(/001$/, '');
  return nextSequenceFromIds(
    currentSequence,
    prNumbers,
    (value) => parsePrefixedSequence(value, prefix),
    'PR sequence',
  );
}

export function formatPRId(sequence: number): string {
  return formatSequenceId('PR', sequence, 4, 'PR id sequence');
}

export function nextPRIdSequence(
  currentSequence: number,
  prIds: readonly string[],
): number {
  return nextSequenceFromIds(
    currentSequence,
    prIds,
    (value) => parsePatternSequence(value, /^PR(\d+)$/),
    'PR id sequence',
  );
}

export function formatPRItemId(sequence: number): string {
  return formatSequenceId('item-', sequence, 4, 'PR item id sequence');
}

export function formatPRActivityLogId(sequence: number): string {
  return formatSequenceId('LOG', sequence, 4, 'PR activity log id sequence');
}

export function nextPRActivityLogIdSequence(
  currentSequence: number,
  logIds: readonly string[],
): number {
  return nextSequenceFromIds(
    currentSequence,
    logIds,
    (value) => parsePatternSequence(value, /^LOG(\d+)$/),
    'PR activity log id sequence',
  );
}

export function nextPRItemIdSequence(
  currentSequence: number,
  itemIds: readonly string[],
): number {
  return nextSequenceFromIds(
    currentSequence,
    itemIds,
    (value) => parsePatternSequence(value, /^item-(\d+)$/),
    'PR item id sequence',
  );
}

function formatSequenceId(
  prefix: string,
  sequence: number,
  minimumDigits: number,
  label: string,
): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }

  return `${prefix}${String(sequence).padStart(minimumDigits, '0')}`;
}

function nextSequenceFromIds(
  currentSequence: number,
  values: readonly string[],
  parseSequence: (value: string) => number | null,
  label: string,
): number {
  const highestExistingSequence = values.reduce((highest, value) => {
    const sequence = parseSequence(value);
    return sequence === null ? highest : Math.max(highest, sequence);
  }, 0);
  const nextSequence = Math.max(currentSequence, highestExistingSequence + 1);

  if (!Number.isSafeInteger(nextSequence) || nextSequence < 1) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }

  return nextSequence;
}

function parsePrefixedSequence(value: string, prefix: string): number | null {
  if (!value.startsWith(prefix)) return null;
  const suffix = value.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  const sequence = Number(suffix);
  return Number.isSafeInteger(sequence) ? sequence : null;
}

function parsePatternSequence(value: string, pattern: RegExp): number | null {
  const match = pattern.exec(value);
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) ? sequence : null;
}