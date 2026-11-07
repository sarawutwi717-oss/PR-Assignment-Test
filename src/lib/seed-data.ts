import type { PRDocument } from '@/type/pr';

export const PR_SEED_DATA: PRDocument[] = [
  {
    id: 'PR0001',
    prNumber: 'PR-06112026-001',
    department: 'ฝ่ายเทคโนโลยีสารสนเทศ',
    requesterName: 'ก',
    items: [
      { id: 'item-0001', name: 'จอภาพ 27 นิ้ว', quantity: 2, unitPrice: 6500, totalPrice: 13000 },
      { id: 'item-0002', name: 'สาย HDMI', quantity: 2, unitPrice: 350, totalPrice: 700 },
    ],
    subtotal: 13700,
    vat: 959,
    grandTotal: 14659,
    status: 'DRAFT',
    createdAt: '2026-11-06T08:00:00.000Z',
  },
  {
    id: 'PR0002',
    prNumber: 'PR-05112026-002',
    department: 'ฝ่ายการตลาด',
    requesterName: 'ข',
    items: [
      { id: 'item-0003', name: 'อุปกรณ์จัดบูธ', quantity: 1, unitPrice: 12000, totalPrice: 12000 },
    ],
    subtotal: 12000,
    vat: 840,
    grandTotal: 12840,
    status: 'PENDING',
    createdAt: '2026-11-05T05:30:00.000Z',
  },
  {
    id: 'PR0003',
    prNumber: 'PR-04112026-003',
    department: 'ฝ่ายทรัพยากรบุคคล',
    requesterName: 'มานะ ขยันงาน',
    items: [
      { id: 'item-0004', name: 'เก้าอี้สำนักงาน', quantity: 4, unitPrice: 2800, totalPrice: 11200 },
    ],
    subtotal: 11200,
    vat: 784,
    grandTotal: 11984,
    status: 'APPROVED',
    createdAt: '2026-11-04T03:15:00.000Z',
  },
  {
    id: 'PR0004',
    prNumber: 'PR-03112026-004',
    department: 'ฝ่ายบัญชี',
    requesterName: 'อรทัย มีสุข',
    items: [
      { id: 'item-0005', name: 'เครื่องคิดเลข', quantity: 3, unitPrice: 650, totalPrice: 1950 },
    ],
    subtotal: 1950,
    vat: 136.5,
    grandTotal: 2086.5,
    status: 'REJECTED',
    createdAt: '2026-11-03T02:00:00.000Z',
    rejectReason: 'กรุณาแนบรายละเอียดการเปรียบเทียบราคา',
  },
];
