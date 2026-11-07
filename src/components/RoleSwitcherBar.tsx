'use client';

import { useRole } from '@/context/RoleContext';

export default function RoleSwitcherBar() {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-3">
      <label className="sr-only" htmlFor="role-switcher">เลือก role</label>
      <select
        id="role-switcher"
        value={role}
        onChange={(event) => setRole(event.target.value as typeof role)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
      >
        <option value="REQUESTER">Requester(ผู้ขอ)</option>
        <option value="APPROVER">Approver(ผู้อนุมัติ)</option>
      </select>
    </div>
  );
}
