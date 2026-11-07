'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PRActionPanel from '@/components/PRActionPanel';
import PRItemsSection, {
  createEmptyPRItem,
  type EditablePRItem,
} from '@/components/PRItemsSection';
import { useRole } from '@/context/RoleContext';
import { readApiResponse } from '@/lib/api-client';
import { calculateLineTotal, calculatePRTotals } from '@/lib/pr-money';
import { formatCurrency, PR_STATUS_STYLES } from '@/lib/pr-presentation';
import type { PRAction, PRDocument, PRItem, PRStatus } from '@/type/pr';

type ConfirmationType = 'SAVE' | 'SUBMIT' | 'APPROVE' | 'DELETE';

export default function PRDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role, roleReady } = useRole();
  const isCreateMode = id === 'create';

  const [prNumber, setPrNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [items, setItems] = useState<EditablePRItem[]>([createEmptyPRItem()]);
  const [formBaseline, setFormBaseline] = useState<string | null>(null);
  const [status, setStatus] = useState<PRStatus>('DRAFT');
  const [rejectReason, setRejectReason] = useState('');
  const [inputRejectReason, setInputRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationType | null>(null);

  useEffect(() => {
    if (isCreateMode || !roleReady) return;

    let active = true;
    async function loadPR() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/pr/${id}`, {
          headers: { 'x-user-role': role },
          cache: 'no-store',
        });
        const result = await readApiResponse<PRDocument>(response);
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'ไม่สามารถโหลดใบขอซื้อได้');
        }

        const pr = result.data;
        if (!pr) throw new Error('เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลใบขอซื้อกลับมา');
        if (active) {
          const loadedItems = pr.items.map((item: PRItem) => ({
            id: item.id,
            name: item.name,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
          }));
          setPrNumber(pr.prNumber);
          setDepartment(pr.department);
          setRequesterName(pr.requesterName);
          setItems(loadedItems);
          setFormBaseline(JSON.stringify({
            department: pr.department,
            requesterName: pr.requesterName,
            items: loadedItems.map(({ name, quantity, unitPrice }) => ({
              name,
              quantity,
              unitPrice,
            })),
          }));
          setStatus(pr.status);
          setRejectReason(pr.rejectReason || '');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'ไม่สามารถโหลดใบขอซื้อได้');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPR();
    return () => {
      active = false;
    };
  }, [id, isCreateMode, role, roleReady]);

  const totals = calculatePRTotals(items.map((item) => ({
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  })));
  const isEditable = role === 'REQUESTER' && (isCreateMode || status === 'DRAFT');
  const currentForm = JSON.stringify({
    department,
    requesterName,
    items: items.map(({ name, quantity, unitPrice }) => ({
      name,
      quantity,
      unitPrice,
    })),
  });
  const hasUnsavedChanges = isCreateMode || (
    formBaseline !== null && currentForm !== formBaseline
  );

  function resetCreateForm() {
    setPrNumber('');
    setDepartment('');
    setRequesterName('');
    setItems([createEmptyPRItem()]);
    setStatus('DRAFT');
    setRejectReason('');
    setInputRejectReason('');
    setError('');
    setNotice('');
  }

  function requestSaveConfirmation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasUnsavedChanges) return;
    setConfirmation('SAVE');
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(isCreateMode ? '/api/pr' : `/api/pr/${id}`, {
        method: isCreateMode ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({
          department,
          requesterName,
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'ไม่สามารถบันทึกใบขอซื้อได้');
      }
      if (isCreateMode) resetCreateForm();
      setSaving(false);
      router.push('/pr');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'ไม่สามารถบันทึกใบขอซื้อได้');
      setSaving(false);
    }
  }

  async function handleAction(action: PRAction) {
    if (action === 'REJECT' && !inputRejectReason.trim()) {
      setError('กรุณาระบุเหตุผลในการไม่อนุมัติ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/pr/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role,
        },
        body: JSON.stringify({ action, rejectReason: inputRejectReason }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'ไม่สามารถดำเนินการได้');
      }

      if (action === 'RETURN_TO_DRAFT') {
        setStatus('DRAFT');
        setRejectReason('');
        setNotice('เปลี่ยนสถานะเป็น Draft แล้ว สามารถแก้ไขใบขอซื้อได้');
      } else {
        router.push('/pr');
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'ไม่สามารถดำเนินการได้');
    } finally {
      setSaving(false);
    }
  }

  function requestAction(action: PRAction) {
    if (action === 'SUBMIT' || action === 'APPROVE') {
      setConfirmation(action);
      return;
    }
    void handleAction(action);
  }

  async function confirmAction() {
    const confirmedAction = confirmation;
    setConfirmation(null);
    if (confirmedAction === 'SAVE') {
      await handleSave();
    } else if (confirmedAction === 'SUBMIT') {
      await handleAction('SUBMIT');
    } else if (confirmedAction === 'APPROVE') {
      await handleAction('APPROVE');
    } else if (confirmedAction === 'DELETE') {
      await handleDelete();
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/pr/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': role },
      });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'ไม่สามารถลบใบขอซื้อได้');
      }
      router.push('/pr');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'ไม่สามารถลบใบขอซื้อได้');
      setSaving(false);
    }
  }

  if (loading && !isCreateMode) {
    return <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">กำลังโหลด...</p>;
  }

  return (
    <article className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold">
            {isCreateMode ? 'สร้างใบขอซื้อ' : `ใบขอซื้อ ${prNumber || id}`}
          </h1>
          {!isCreateMode && <p className="mt-1 text-sm text-slate-500">{prNumber}</p>}
        </div>
        {!isCreateMode && (
          <span className={`rounded px-3 py-1 text-xs font-bold ${PR_STATUS_STYLES[status]}`}>
            {status}
          </span>
        )}
      </header>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {!isEditable && role === 'APPROVER' && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">กำลังดูใบขอซื้อในสิทธิ์ Approver</p>
      )}
      {rejectReason && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>เหตุผลที่ไม่อนุมัติ:</strong> {rejectReason}
        </p>
      )}

      <form onSubmit={requestSaveConfirmation} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            แผนก
            <input
              type="text"
              required
              maxLength={120}
              disabled={!isEditable || saving}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 disabled:bg-slate-100"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            ผู้ขอซื้อ
            <input
              type="text"
              required
              maxLength={120}
              disabled={!isEditable || saving}
              className="mt-1 w-full rounded-md border border-slate-300 p-2 disabled:bg-slate-100"
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
            />
          </label>
        </div>

        <PRItemsSection
          items={items}
          isEditable={isEditable}
          saving={saving}
          totals={totals}
          onItemsChange={setItems}
        />

        {isEditable && (
          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={saving || !hasUnsavedChanges}
              className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : isCreateMode ? 'บันทึก' : 'บันทึกการแก้ไข'}
            </button>
            {!isCreateMode && status === 'DRAFT' && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmation('DELETE')}
                className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white bg-red-800 disabled:opacity-60"
              >
                ลบใบขอซื้อ
              </button>
            )}
          </div>
        )}
      </form>

      {!isCreateMode && (
        <PRActionPanel
          role={role}
          status={status}
          saving={saving}
          rejectReason={inputRejectReason}
          onRejectReasonChange={setInputRejectReason}
          onAction={requestAction}
        />
      )}

      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 id="confirmation-title" className="text-lg font-bold">
              {confirmation === 'SAVE'
                ? 'ยืนยันการบันทึกใบขอซื้อ'
                : confirmation === 'SUBMIT'
                  ? 'ยืนยันการส่งขออนุมัติ'
                  : confirmation === 'APPROVE'
                    ? 'ยืนยันการอนุมัติใบขอซื้อ'
                    : 'ยืนยันการลบใบขอซื้อ'}
            </h2>
            {confirmation === 'SAVE' ? (
              <section aria-label="รายการสินค้าที่ขอ" className="mt-4 space-y-3">
                <h3 className="font-semibold">รายการสินค้าที่ขอ</h3>
                <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
                  {items.map((item, index) => (
                    <li key={item.id} className="space-y-1 p-3 text-sm">
                      <p className="font-medium">{index + 1}. {item.name || 'ไม่ระบุชื่อสินค้า'}</p>
                      <p className="text-slate-600">
                        จำนวน {item.quantity || '0'} × {formatCurrency(Number(item.unitPrice) || 0)}
                        {' = '}
                        {formatCurrency(calculateLineTotal(
                          Number(item.quantity),
                          Number(item.unitPrice),
                        ))}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 text-right text-sm">
                  <p>ยอดก่อน VAT: {formatCurrency(totals.subtotal)}</p>
                  <p>VAT 7%: {formatCurrency(totals.vat)}</p>
                  <p className="font-bold">ยอดรวมสุทธิ: {formatCurrency(totals.grandTotal)}</p>
                </div>
              </section>
            ) : confirmation === 'SUBMIT' ? (
              <p className="mt-3 text-sm text-slate-700">
                เมื่อส่งอนุมัติแล้ว เอกสารจะกลับมาแก้ไขไม่ได้
              </p>
            ) : confirmation === 'APPROVE' ? (
              <p className="mt-3 text-sm text-slate-700">
                ยืนยันอนุมัติใบขอซื้อนี้หรือไม่?
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-700">
                เมื่อลบใบขอซื้อแล้วจะไม่สามารถกู้คืนได้ ต้องการดำเนินการต่อหรือไม่?
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmation(null)}
                className="rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmAction()}
                className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <button type="button" onClick={() => router.push('/pr')} className="text-sm text-slate-600 hover:underline">
          ← กลับไปหน้ารายการ
        </button>
      </div>
    </article>
  );
}
