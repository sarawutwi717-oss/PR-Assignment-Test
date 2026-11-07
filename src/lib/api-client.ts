interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readApiResponse<T = unknown>(
  response: Response,
): Promise<ApiResponse<T>> {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(`เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลกลับมา (HTTP ${response.status})`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON (HTTP ${response.status})`);
  }

  if (!isRecord(payload) || typeof payload.success !== 'boolean') {
    throw new Error(`รูปแบบคำตอบจากเซิร์ฟเวอร์ไม่ถูกต้อง (HTTP ${response.status})`);
  }

  return {
    success: payload.success,
    ...(payload.data !== undefined ? { data: payload.data as T } : {}),
    ...(typeof payload.message === 'string' ? { message: payload.message } : {}),
  };
}
