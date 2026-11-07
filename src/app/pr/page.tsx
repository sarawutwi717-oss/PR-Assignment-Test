'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { readApiResponse } from '@/lib/api-client';
import {
  formatCurrency,
  PR_STATUS_FILTERS,
  PR_STATUS_STYLES,
} from '@/lib/pr-presentation';
import type { PRDocument, PRStatus } from '@/type/pr';

export default function PRListPage() {
  const { role } = useRole();
  const [prs, setPrs] = useState<PRDocument[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | PRStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchPRs() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/pr?status=${filterStatus}`, {
          headers: { 'x-user-role': role },
          cache: 'no-store',
        });
        const result = await readApiResponse<PRDocument[]>(response);
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'ไม่สามารถโหลดรายการ PR ได้');
        }
        if (active && result.data) setPrs(result.data);
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'ไม่สามารถโหลดรายการ PR ได้');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchPRs();
    return () => {
      active = false;
    };
  }, [filterStatus, role]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">รายการใบขอซื้อ</h1>
          <p className="mt-1 text-sm text-slate-600">Purchase Requisitions</p>
        </div>
        {role === 'REQUESTER' && (
          <Link
            href="/pr/create"
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + สร้างใบขอซื้อ
          </Link>
        )}
      </div>

      <section aria-label="กรองรายการตามสถานะ" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium">สถานะ:</span>
        {PR_STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filterStatus === status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              filterStatus === status
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-slate-300 bg-white hover:bg-slate-100'
            }`}
          >
            {status === 'ALL' ? 'ทั้งหมด' : status}
          </button>
        ))}
      </section>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-sm">
              <th scope="col" className="p-3">เลขที่ PR</th>
              <th scope="col" className="p-3">ผู้ขอ / แผนก</th>
              <th scope="col" className="p-3 text-right">ยอดรวมสุทธิ</th>
              <th scope="col" className="p-3 text-center">สถานะ</th>
              <th scope="col" className="p-3 text-center">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">กำลังโหลด...</td></tr>
            ) : prs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">ไม่พบข้อมูลใบขอซื้อ</td></tr>
            ) : prs.map((pr) => (
              <tr key={pr.id} className="border-b border-slate-100 text-sm last:border-0 hover:bg-slate-50">
                <td className="p-3 font-semibold">{pr.prNumber}</td>
                <td className="p-3">
                  <div>{pr.requesterName}</div>
                  <div className="text-xs text-slate-500">{pr.department}</div>
                </td>
                <td className="p-3 text-right font-medium">{formatCurrency(pr.grandTotal)}</td>
                <td className="p-3 text-center">
                  <span className={`inline-block rounded px-2.5 py-1 text-xs font-bold ${PR_STATUS_STYLES[pr.status]}`}>
                    {pr.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <Link href={`/pr/${pr.id}`} className="font-medium text-blue-700 hover:underline">
                    ดูรายละเอียด
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
