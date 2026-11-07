import { NextResponse } from 'next/server';
import { createPR, listPRs } from '@/lib/db';
import { getRequestRole, readJsonBody } from '@/lib/api';
import { calculatePRTotals } from '@/lib/pr-money';
import { createPRItems, validatePRDraft } from '@/lib/pr-service';
import { isPRStatus, type PRStatus } from '@/type/pr';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  let filterStatus: PRStatus | undefined;

  if (status && status !== 'ALL') {
    if (!isPRStatus(status)) {
      return NextResponse.json({ success: false, message: 'สถานะที่ใช้กรองไม่ถูกต้อง' }, { status: 400 });
    }
    filterStatus = status;
  }

  const data = await listPRs(filterStatus);

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const role = getRequestRole(request);
  if (!role) {
    return NextResponse.json({ success: false, message: 'กรุณาระบุ role ที่ถูกต้อง' }, { status: 401 });
  }
  if (role !== 'REQUESTER') {
    return NextResponse.json({ success: false, message: 'เฉพาะ Requester เท่านั้นที่สร้าง PR ได้' }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (!body.success) {
    return NextResponse.json({ success: false, message: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
  }

  const validation = validatePRDraft(body.value);
  if (!validation.success) {
    return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
  }

  const items = createPRItems(validation.data.items);
  const totals = calculatePRTotals(items);
  const newPR = {
    ...validation.data,
    items,
    ...totals,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
  } as const;

  const createdPR = await createPR(newPR, role);
  return NextResponse.json({ success: true, data: createdPR }, { status: 201 });
}