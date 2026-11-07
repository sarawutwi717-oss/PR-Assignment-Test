import Link from 'next/link';
import { RoleProvider } from '@/context/RoleContext';
import RoleSwitcherBar from '@/components/RoleSwitcherBar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-slate-50 text-slate-900">
        <RoleProvider>
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <Link href="/pr" className="text-lg font-bold text-blue-700">ระบบใบขอซื้อ (PR)</Link>
            <RoleSwitcherBar />
          </header>
          <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
        </RoleProvider>
      </body>
    </html>
  );
}