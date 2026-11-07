import { Suspense } from 'react';
import PRDetailClient from './PRDetailClient';

export default function PRDetailPage() {
  return (
    <Suspense fallback={<p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">กำลังโหลด...</p>}>
      <PRDetailClient />
    </Suspense>
  );
}
