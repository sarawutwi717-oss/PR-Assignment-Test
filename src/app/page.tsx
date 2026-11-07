import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">ระบบใบขอซื้อ (PR)</h1>
      <p className="mt-2 text-slate-600">จัดการใบขอซื้อและขั้นตอนการอนุมัติ</p>
      <Link
        href="/pr"
        className="mt-5 inline-block rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
      >
        ไปหน้ารายการ PR
      </Link>
    </main>
  );
}
