import { describe, expect, it } from 'vitest';
import { readApiResponse } from './api-client';

describe('readApiResponse', () => {
  it('reads a valid API response', async () => {
    const response = new Response(JSON.stringify({
      success: true,
      data: [{ id: 'pr-1' }],
    }), { status: 200 });

    await expect(readApiResponse<Array<{ id: string }>>(response)).resolves.toEqual({
      success: true,
      data: [{ id: 'pr-1' }],
    });
  });

  it('reports an empty response with its HTTP status', async () => {
    const response = new Response(null, { status: 500 });

    await expect(readApiResponse(response)).rejects.toThrow('HTTP 500');
  });

  it('reports a non-JSON response with its HTTP status', async () => {
    const response = new Response('<html>Server error</html>', { status: 500 });

    await expect(readApiResponse(response)).rejects.toThrow('ไม่ใช่ JSON (HTTP 500)');
  });
});
