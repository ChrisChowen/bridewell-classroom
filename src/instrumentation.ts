// Next.js instrumentation hook. Runs once on server start. We use it only
// to install last-resort process handlers that emit a structured line for
// otherwise-unhandled failures (so a crash leaves a trace in Cloud Logging
// rather than a silent 500). Guarded to the nodejs runtime — the edge
// runtime has no `process` event model and cannot carry these handlers.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logError } = await import("@/lib/log");

  process.on("uncaughtException", (err: unknown) => {
    logError({
      event: "uncaught_exception",
      // Name only — an error message can contain request content (PII).
      code: err instanceof Error ? err.name : "UnknownError",
    });
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logError({
      event: "unhandled_rejection",
      code: reason instanceof Error ? reason.name : "UnknownRejection",
    });
  });
}
