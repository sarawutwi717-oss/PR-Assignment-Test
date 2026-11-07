import { NextResponse } from 'next/server';
import { getPR, transitionPR } from '@/lib/db';
import { getRequestRole, readJsonBody } from '@/lib/api';
import {
  canRolePerformPRAction,
  getPRActionTargetStatus,
  isPRAction,
  validateStateTransition,
  validateRejectReason,
} from '@/lib/pr-service';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const role = getRequestRole(request);
  if (!role) {
    return NextResponse.json({ success: false, message: 'กรุณาระบุ role ที่ถูกต้อง' }, { status: 401 });
  }

  const { id } = await params;
  const pr = await getPR(id);
  if (!pr) return NextResponse.json({ success: false, message: 'ไม่พบเอกสาร' }, { status: 404 });

  const body = await readJsonBody(request);
  if (!body.success || !body.value || typeof body.value !== 'object' || Array.isArray(body.value)) {
    return NextResponse.json({ success: false, message: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const input = body.value as Record<string, unknown>;
  if (!isPRAction(input.action)) {
    return NextResponse.json({ success: false, message: 'การดำเนินการไม่ถูกต้อง' }, { status: 400 });
  }
  const action = input.action;
  if (!canRolePerformPRAction(role, action, pr.status)) {
    return NextResponse.json({ success: false, message: 'role นี้ไม่มีสิทธิ์ดำเนินการดังกล่าว' }, { status: 403 });
  }

  const targetStatus = getPRActionTargetStatus(action);
  if (!validateStateTransition(pr.status, targetStatus)) {
    return NextResponse.json({ success: false, message: `ไม่อนุญาตให้เปลี่ยนสถานะจาก ${pr.status} เป็น ${targetStatus}` }, { status: 400 });
  }

  let rejectReason: string | undefined;
  if (action === 'REJECT') {
    const validation = validateRejectReason(input.rejectReason);
    if (!validation.success) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
    }
    rejectReason = validation.reason;
  }

  const updatedPR = await transitionPR(
    id,
    pr.status,
    targetStatus,
    role,
    action,
    rejectReason,
  );
  if (!updatedPR) {
    return NextResponse.json({ success: false, message: 'สถานะ PR เปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่' }, { status: 409 });
  }

  return NextResponse.json({ success: true, data: updatedPR });
}