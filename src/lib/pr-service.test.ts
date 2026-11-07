import { describe, expect, it } from 'vitest';
import { calculateLineTotal, calculatePRTotals } from './pr-money';
import {
  canPerformPRAction,
  canRolePerformPRAction,
  formatPRActivityLogId,
  formatPRId,
  nextPRActivityLogIdSequence,
  formatPRItemId,
  nextPRIdSequence,
  nextPRItemIdSequence,
  nextPRSequence,
  validateRejectReason,
  validatePRDraft,
  validateStateTransition,
} from './pr-service';

const validDraft = {
  department: 'IT',
  requesterName: 'Sam',
  items: [{ name: 'Monitor', quantity: 1, unitPrice: 100 }],
};

describe('PR service', () => {
  describe('calculatePRTotals', () => {
    it('calculates each line total from the shared money helper', () => {
      expect(calculateLineTotal(3, 0.1)).toBe(0.3);
    });

    it('calculates subtotal, VAT, and grand total for multiple items', () => {
      expect(calculatePRTotals([
        { quantity: 2, unitPrice: 500 },
        { quantity: 3, unitPrice: 200 },
      ])).toEqual({
        subtotal: 1600,
        vat: 112,
        grandTotal: 1712,
      });
    });

    it('returns zero totals for zero-priced items', () => {
      expect(calculatePRTotals([{ quantity: 1, unitPrice: 0 }])).toEqual({
        subtotal: 0,
        vat: 0,
        grandTotal: 0,
      });
    });

    it('rounds VAT and totals to two decimal places', () => {
      expect(calculatePRTotals([{ quantity: 1, unitPrice: 0.1 }])).toEqual({
        subtotal: 0.1,
        vat: 0.01,
        grandTotal: 0.11,
      });
    });
  });

  describe('validateStateTransition', () => {
    it.each([
      ['DRAFT', 'PENDING', true],
      ['DRAFT', 'APPROVED', false],
      ['DRAFT', 'REJECTED', false],
      ['PENDING', 'APPROVED', true],
      ['PENDING', 'REJECTED', true],
      ['PENDING', 'DRAFT', true],
      ['APPROVED', 'DRAFT', false],
      ['APPROVED', 'PENDING', false],
      ['APPROVED', 'REJECTED', false],
      ['REJECTED', 'DRAFT', true],
      ['REJECTED', 'APPROVED', false],
    ] as const)(
      'transition %s -> %s is allowed: %s',
      (current, target, allowed) => {
        expect(validateStateTransition(current, target)).toBe(allowed);
      },
    );
  });

  describe('PR action rules', () => {
    it.each([
      ['REQUESTER', 'SUBMIT', 'DRAFT', true],
      ['REQUESTER', 'APPROVE', 'PENDING', false],
      ['APPROVER', 'APPROVE', 'PENDING', true],
      ['APPROVER', 'REJECT', 'PENDING', true],
      ['APPROVER', 'RETURN_TO_DRAFT', 'PENDING', true],
      ['REQUESTER', 'RETURN_TO_DRAFT', 'REJECTED', true],
      ['APPROVER', 'RETURN_TO_DRAFT', 'REJECTED', false],
    ] as const)(
      '%s can perform %s from %s: %s',
      (role, action, status, allowed) => {
        expect(canRolePerformPRAction(role, action, status)).toBe(allowed);
        expect(canPerformPRAction(role, action, status)).toBe(allowed);
      },
    );

    it('separates role permission from invalid status transitions', () => {
      expect(canRolePerformPRAction('APPROVER', 'APPROVE', 'DRAFT')).toBe(true);
      expect(canPerformPRAction('APPROVER', 'APPROVE', 'DRAFT')).toBe(false);
    });

    it('requires a valid rejection reason', () => {
      expect(validateRejectReason('  ขอข้อมูลเพิ่ม  ')).toEqual({
        success: true,
        reason: 'ขอข้อมูลเพิ่ม',
      });
      expect(validateRejectReason(' ')).toEqual({
        success: false,
        message: 'กรุณาระบุเหตุผลในการไม่อนุมัติ (Reject)',
      });
      expect(validateRejectReason('x'.repeat(501)).success).toBe(false);
    });
  });

  describe('validatePRDraft', () => {
    it('trims text fields and normalizes item values', () => {
      expect(validatePRDraft({
        department: ' IT ',
        requesterName: ' Sam ',
        items: [{ name: ' Monitor ', quantity: '2', unitPrice: '1250.5' }],
      })).toEqual({
        success: true,
        data: {
          department: 'IT',
          requesterName: 'Sam',
          items: [{ name: 'Monitor', quantity: 2, unitPrice: 1250.5 }],
        },
      });
    });

    it.each([
      ['a missing department', { ...validDraft, department: ' ' }],
      ['a missing requester name', { ...validDraft, requesterName: '' }],
      ['an empty item list', { ...validDraft, items: [] }],
      ['a missing item name', { ...validDraft, items: [{ name: ' ', quantity: 1, unitPrice: 10 }] }],
      ['a missing quantity', { ...validDraft, items: [{ name: 'Monitor', quantity: '', unitPrice: 10 }] }],
      ['a zero quantity', { ...validDraft, items: [{ name: 'Monitor', quantity: 0, unitPrice: 10 }] }],
      ['a missing price', { ...validDraft, items: [{ name: 'Monitor', quantity: 1, unitPrice: '' }] }],
      ['a missing price', { ...validDraft, items: [{ name: 'Monitor', quantity: 1, unitPrice: null }] }],
      ['a price with fractions smaller than one cent', {
        ...validDraft,
        items: [{ name: 'Monitor', quantity: 1, unitPrice: 0.005 }],
      }],
      [
        'a total that exceeds the safe integer range',
        { ...validDraft, items: [{ name: 'Equipment', quantity: 2_147_483_647, unitPrice: 1_000_000_000 }] },
      ],
    ])('rejects %s', (_description, draft) => {
      expect(validatePRDraft(draft).success).toBe(false);
    });
  });

  describe('nextPRSequence', () => {
    const date = new Date('2026-11-06T08:00:00.000Z');

    it('advances past existing PRs when the sequence table is behind', () => {
      expect(nextPRSequence(
        1,
        ['PR-06112026-001', 'PR-06112026-002'],
        date,
      )).toBe(3);
    });

    it('preserves a sequence higher than existing PR numbers', () => {
      expect(nextPRSequence(5, ['PR-06112026-002'], date)).toBe(5);
    });

    it('ignores PR numbers from other dates', () => {
      expect(nextPRSequence(1, ['PR-05112026-010'], date)).toBe(1);
    });

    it('ignores malformed and unsafe sequence suffixes', () => {
      expect(nextPRSequence(
        1,
        ['PR-06112026-009', 'PR-06112026-010x', 'PR-06112026-9007199254740992'],
        date,
      )).toBe(10);
    });
  });

  describe('PR id sequence', () => {
    it('formats ids with at least four digits', () => {
      expect(formatPRId(1)).toBe('PR0001');
      expect(formatPRId(10000)).toBe('PR10000');
    });

    it('advances past the highest existing PR id', () => {
      expect(nextPRIdSequence(1, ['PR0001', 'PR0007', 'legacy-id'])).toBe(8);
    });

    it('starts at 1 if there are no sequential PR ids', () => {
      expect(nextPRIdSequence(1, ['pr-2026-001', 'legacy-id'])).toBe(1);
    });
  });

  describe('PR activity log id sequence', () => {
    it('formats readable log ids and advances from the highest existing log', () => {
      expect(formatPRActivityLogId(1)).toBe('LOG0001');
      expect(nextPRActivityLogIdSequence(1, ['LOG0001', 'LOG0009', 'legacy-id']))
        .toBe(10);
    });

    it('ignores malformed and unsafe existing log ids', () => {
      expect(nextPRActivityLogIdSequence(
        1,
        ['LOG0009', 'LOG0010x', 'LOG9007199254740992'],
      )).toBe(10);
    });
  });

  describe('PR item id sequence', () => {
    it('formats sequential item ids with at least four digits', () => {
      expect(formatPRItemId(1)).toBe('item-0001');
      expect(formatPRItemId(10000)).toBe('item-10000');
    });

    it('advances past the highest existing item id', () => {
      expect(nextPRItemIdSequence(1, ['item-0001', 'item-0007', 'legacy-id'])).toBe(8);
    });

    it('preserves a sequence higher than existing item ids', () => {
      expect(nextPRItemIdSequence(9, ['item-0007'])).toBe(9);
    });
  });
});
