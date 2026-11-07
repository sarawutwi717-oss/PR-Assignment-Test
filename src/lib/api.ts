import type { Role } from '@/type/pr';

export function getRequestRole(request: Request): Role | null {
  const role = request.headers.get('x-user-role');
  return role === 'REQUESTER' || role === 'APPROVER' ? role : null;
}

export async function readJsonBody(
  request: Request,
): Promise<{ success: true; value: unknown } | { success: false }> {
  try {
    return { success: true, value: await request.json() };
  } catch {
    return { success: false };
  }
}
