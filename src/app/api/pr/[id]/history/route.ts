import { NextResponse } from 'next/server';
import { listPRActivityLogs } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const data = await listPRActivityLogs(id);

  return NextResponse.json({ success: true, data });
}
