const encoder = new TextEncoder();

export async function secretsMatch(actual: string | null, expected: string | null) {
  if (!actual || !expected) return false;
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = actualBytes.length ^ expectedBytes.length;
  const length = Math.max(actualBytes.length, expectedBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function readJsonBody<T>(request: Request, maxBytes = 64 * 1024): Promise<T | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;
  const body = await request.text().catch(() => "");
  if (!body || encoder.encode(body).byteLength > maxBytes) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}
