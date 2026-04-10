// Error classification for API route handlers.
//
// Expected errors (bad input, validation) surface as 4xx with a short,
// sanitized message safe to show the caller. Unexpected errors surface
// as a generic 500 and the full detail is written only to the server
// log (telemetry + stderr) — never to the response body. This addresses
// the "verbose internal error leakage" seeded flaw.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, message);
}

export type ClassifiedError = {
  status: number;
  body: { error: string };
};

export function classifyError(e: unknown, route: string): ClassifiedError {
  if (e instanceof ApiError) {
    return { status: e.status, body: { error: e.message } };
  }
  // Unexpected: log full detail server-side, return opaque 500.
  try {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        route,
        message: (e as Error)?.message,
        stack: (e as Error)?.stack,
      }),
    );
  } catch {
    /* ignore */
  }
  return { status: 500, body: { error: "internal error" } };
}
