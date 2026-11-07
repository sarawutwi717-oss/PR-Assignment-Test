'use client';

import { calculateLineTotal } from '@/lib/pr-money';
import { formatCurrency } from '@/lib/pr-presentation';

export interface EditablePRItem {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
}

interface PRItemsSectionProps {
  items: EditablePRItem[];
  isEditable: boolean;
  saving: boolean;
  totals: { subtotal: number; vat: number; grandTotal: number };
  onItemsChange: (items: EditablePRItem[]) => void;
}

export function createEmptyPRItem(): EditablePRItem {
  return {
    id: `${Date.now()}-${Math.random()}`,
    name: '',
    quantity: '',
    unitPrice: '',
  };
}

export default function PRItemsSection({
  items,
  isEditable,
  saving,
  totals,
  onItemsChange,
}: PRItemsSectionProps) {
  function updateItem(index: number, field: 'name' | 'quantity' | 'unitPrice', value: string) {
    onItemsChange(items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ));
  }

  return (
    <>
      <section aria-label="รายการสินค้า" className="space-y-3">
        <h2 className="font-semibold">รายการสินค้า / บริการ</h2>
        <div className="hidden grid-cols-[minmax(0,1fr)_110px_150px_130px_40px] gap-2 text-sm font-medium text-slate-600 sm:grid">
          <span>ชื่อสินค้า</span><span>จำนวน</span><span>ราคาต่อหน่วย (บาท)</span><span className="text-right">รวม (บาท)</span><span />
        </div>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_110px_150px_130px_40px] sm:items-center sm:border-0 sm:p-0"
          >
            <label className="col-span-2 text-xs text-slate-600 sm:col-span-1 sm:text-sm">
              <span className="sm:hidden">ชื่อสินค้า</span>
              <input
                type="text"
                placeholder="ชื่อสินค้า"
                required
                maxLength={200}
                disabled={!isEditable || saving}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm disabled:bg-slate-100 sm:mt-0"
                value={item.name}
                onChange={(event) => updateItem(index, 'name', event.target.value)}
              />
            </label>
            <label className="text-xs text-slate-600 sm:text-sm">
              <span className="sm:hidden">จำนวน</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                disabled={!isEditable || saving}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm disabled:bg-slate-100 sm:mt-0"
                value={item.quantity}
                onChange={(event) => updateItem(index, 'quantity', event.target.value)}
              />
            </label>
            <label className="text-xs text-slate-600 sm:text-sm">
              <span className="sm:hidden">ราคาต่อหน่วย</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                disabled={!isEditable || saving}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm disabled:bg-slate-100 sm:mt-0"
                value={item.unitPrice}
                onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
              />
            </label>
            <span className="self-center text-right text-sm font-medium">
              {formatCurrency(calculateLineTotal(
                Number(item.quantity),
                Number(item.unitPrice),
              ))}
            </span>
            {isEditable && items.length > 1 && (
              <button
                type="button"
                aria-label={`ลบรายการที่ ${index + 1}`}
                disabled={saving}
                onClick={() => onItemsChange(items.filter((_, itemIndex) => itemIndex !== index))}
                className="self-center rounded px-2 py-1 font-bold text-red-600 hover:bg-red-50"
              >
                ลบ
              </button>
            )}
          </div>
        ))}
        {isEditable && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onItemsChange([...items, createEmptyPRItem()])}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            + เพิ่มรายการ
          </button>
        )}
      </section>

      <section aria-label="สรุปยอดเงิน" className="space-y-1 border-t border-slate-200 pt-4 text-right">
        <p>ยอดก่อน VAT: <strong>{formatCurrency(totals.subtotal)}</strong></p>
        <p>VAT 7%: <strong>{formatCurrency(totals.vat)}</strong></p>
        <p className="text-lg font-bold text-blue-700">ยอดรวมสุทธิ: {formatCurrency(totals.grandTotal)}</p>
      </section>
    </>
  );
}
