'use client';

import type { PRAction, PRStatus, Role } from '@/type/pr';

interface PRActionPanelProps {
  role: Role;
  status: PRStatus;
  saving: boolean;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onAction: (action: PRAction) => void;
}

const buttonClass =
  'rounded-md px-4 py-2 font-medium disabled:opacity-60';

export default function PRActionPanel({
  role,
  status,
  saving,
  rejectReason,
  onRejectReasonChange,
  onAction,
}: PRActionPanelProps) {
  if (role === 'REQUESTER' && status !== 'DRAFT' && status !== 'REJECTED') {
    return null;
  }
  if (role === 'APPROVER' && status !== 'PENDING') return null;

  return (
    <section
      aria-label="การดำเนินการ"
      className="flex flex-col gap-3 border-t border-slate-200 pt-4"
    >
      <p className="text-sm text-slate-600">การดำเนินการสำหรับ {role}</p>
      <div className="flex flex-wrap items-end gap-2">
        {role === 'REQUESTER' && status === 'DRAFT' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onAction('SUBMIT')}
            className={`${buttonClass} bg-purple-700 text-white hover:bg-purple-800`}
          >
            ส่งขออนุมัติ
          </button>
        )}
        {role === 'REQUESTER' && status === 'REJECTED' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onAction('RETURN_TO_DRAFT')}
            className={`${buttonClass} bg-blue-700 text-white hover:bg-blue-800`}
          >
            กลับไปแก้ไข (เปิดเป็น Draft)
          </button>
        )}
        {role === 'APPROVER' && status === 'PENDING' && (
          <>
            <label className="min-w-60 flex-1 text-sm">
              เหตุผล (กรณีไม่อนุมัติ)
              <input
                type="text"
                maxLength={500}
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
                value={rejectReason}
                onChange={(event) => onRejectReasonChange(event.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => onAction('REJECT')}
              className={`${buttonClass} bg-red-700 text-white hover:bg-red-800`}
            >
              ไม่อนุมัติ
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onAction('APPROVE')}
              className={`${buttonClass} bg-green-700 text-white hover:bg-green-800`}
            >
              อนุมัติ
            </button>
          </>
        )}
      </div>
    </section>
  );
}
