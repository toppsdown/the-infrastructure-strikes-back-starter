// Read a JSON request body with an explicit size cap. Reject >maxBytes
// with a thrown Error whose message starts with "body too large" so
// handlers can match it.
const DEFAULT_MAX = 8 * 1024; // 8 KB — plenty for any auth/identity/action request

export async function readJsonBody<T = unknown>(
  req: Request,
  maxBytes = DEFAULT_MAX,
): Promise<T> {
  const cl = req.headers.get("content-length");
  if (cl) {
    const n = parseInt(cl, 10);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new Error("body too large");
    }
  }
  const text = await req.text();
  if (text.length > maxBytes) {
    throw new Error("body too large");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("bad json");
  }
}
