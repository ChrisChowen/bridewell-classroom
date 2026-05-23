// Structured JSON logging. One JSON object per line so Cloud Logging /
// Vercel parse the fields automatically (route, classId, teacherUid,
// durationMs, …) and they become queryable.
//
// PII discipline is enforced at the seam, not left to the caller:
//   - A closed allow-list of STRING keys may carry text. These are all
//     ids / enums / operational codes — never names, emails, or message
//     content. Any other string field is DROPPED (replaced with a marker)
//     so a careless `logEvent({ route, pupilName })` can never leak.
//   - Numbers and booleans are always safe and pass through under any key.
//   - String values are length-capped as a backstop against a code path
//     that stuffs content into an allowed key.
//
// Firebase UIDs are pseudonymous identifiers, not direct identifiers, and
// are explicitly part of the required field set (teacherUid); they are
// permitted. Display names, emails, and chat text are not.

export type LogLevel = "info" | "warn" | "error";

// String keys allowed to carry text. Everything here is an id or an enum.
const STRING_KEY_ALLOWLIST = new Set([
  "event",
  "route",
  "method",
  "classId",
  "teacherUid",
  "pupilUid",
  "sessionId",
  "eventId",
  "model",
  "modelKey",
  "tier",
  "branch",
  "state",
  "severity",
  "code",
  "reason",
  "provider",
  "env",
]);

const MAX_STRING_LEN = 200;
const DROPPED = "[dropped:non-allowlisted-string]";

export type LogFields = {
  event?: string;
  route?: string;
  method?: string;
  classId?: string;
  teacherUid?: string;
  pupilUid?: string;
  sessionId?: string;
  eventId?: string;
  model?: string;
  modelKey?: string;
  tier?: string;
  branch?: string;
  state?: string;
  severity?: string;
  code?: string;
  reason?: string;
  provider?: string;
  durationMs?: number;
  status?: number;
  count?: number;
  fallback?: boolean;
  // Extra numeric / boolean fields are always safe.
  [k: string]: string | number | boolean | undefined;
};

// Pure: build the single JSON log line. Exposed for unit testing so the
// PII guard is pinned by tests rather than trusted.
export function formatLogLine(
  level: LogLevel,
  fields: LogFields,
  now: number = Date.now()
): string {
  const safe: Record<string, unknown> = {
    ts: new Date(now).toISOString(),
    level,
  };
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "number" || typeof v === "boolean") {
      safe[k] = v;
      continue;
    }
    if (typeof v === "string") {
      if (!STRING_KEY_ALLOWLIST.has(k)) {
        safe[k] = DROPPED;
        continue;
      }
      safe[k] = v.length > MAX_STRING_LEN ? v.slice(0, MAX_STRING_LEN) : v;
      continue;
    }
    // Objects / arrays are never logged — too easy to smuggle content.
    safe[k] = "[dropped:non-primitive]";
  }
  return JSON.stringify(safe);
}

function emit(level: LogLevel, fields: LogFields): void {
  const line = formatLogLine(level, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logInfo(fields: LogFields): void {
  emit("info", fields);
}
export function logWarn(fields: LogFields): void {
  emit("warn", fields);
}
export function logError(fields: LogFields): void {
  emit("error", fields);
}

// Time an async API handler and emit one structured line for the request.
// Usage:
//   export const POST = (req) => withRequestLog("chat", req, async () => {...});
export async function withRequestLog(
  route: string,
  req: { method?: string },
  handler: () => Promise<Response>,
  extra: () => LogFields = () => ({})
): Promise<Response> {
  const start = Date.now();
  try {
    const res = await handler();
    logInfo({
      event: "request",
      route,
      method: req.method,
      status: res.status,
      durationMs: Date.now() - start,
      ...extra(),
    });
    return res;
  } catch (err) {
    logError({
      event: "request_error",
      route,
      method: req.method,
      durationMs: Date.now() - start,
      // err.message can in principle contain content; keep only the name.
      code: err instanceof Error ? err.name : "UnknownError",
      ...extra(),
    });
    throw err;
  }
}
