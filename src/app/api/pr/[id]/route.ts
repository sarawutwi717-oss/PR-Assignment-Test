import { NextResponse } from 'next/server';
import { deleteDraftPR, getPR, updateDraftPR } from '@/lib/db';
import { getRequestRole, readJsonBody } from '@/lib/api';
import { calculatePRTotals } from '@/lib/pr-money';
import { createPRItems, validatePRDraft } from '@/lib/pr-service';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const pr = await getPR(id);
  if (!pr) return NextResponse.json({ success: false, message: 'ไม่พบเอกสาร' }, { status: 404 });
  return NextResponse.json({ success: true, data: pr });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const role = getRequestRole(request);
  if (!role) {
    return NextResponse.json({ success: false, message: 'กรุณาระบุ role ที่ถูกต้อง' }, { status: 401 });
  }
  if (role !== 'REQUESTER') {
    return NextResponse.json({ success: false, message: 'เฉพาะ Requester เท่านั้นที่แก้ไข PR ได้' }, { status: 403 });
  }

  const { id } = await params;
  const pr = await getPR(id);
  if (!pr) return NextResponse.json({ success: false, message: 'ไม่พบเอกสาร' }, { status: 404 });
  if (pr.status !== 'DRAFT') {
    return NextResponse.json({ success: false, message: 'แก้ไขได้เฉพาะ PR สถานะ Draft เท่านั้น' }, { status: 400 });
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
  const updatedPR = await updateDraftPR(
    id,
    validation.data,
    items,
    calculatePRTotals(items),
    role,
  );
  if (!updatedPR) {
    return NextResponse.json({ success: false, message: 'สถานะ PR เปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่' }, { status: 409 });
  }

  return NextResponse.json({ success: true, data: updatedPR });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const role = getRequestRole(request);
  if (!role) {
    return NextResponse.json({ success: false, message: 'กรุณาระบุ role ที่ถูกต้อง' }, { status: 401 });
  }
  if (role !== 'REQUESTER') {
    return NextResponse.json({ success: false, message: 'เฉพาะ Requester เท่านั้นที่ลบ PR ได้' }, { status: 403 });
  }

  const { id } = await params;
  const pr = await getPR(id);
  if (!pr) return NextResponse.json({ success: false, message: 'ไม่พบเอกสาร' }, { status: 404 });

  if (pr.status !== 'DRAFT') {
    return NextResponse.json({ success: false, message: 'ลบได้เฉพาะสถานะ Draft เท่านั้น' }, { status: 400 });
  }

  if (!await deleteDraftPR(id, role)) {
    return NextResponse.json({ success: false, message: 'สถานะ PR เปลี่ยนไปแล้ว กรุณาโหลดข้อมูลใหม่' }, { status: 409 });
  }

  return NextResponse.json({ success: true, message: 'ลบเอกสารสำเร็จ' });
}