// Tiny wrapper around Firebase ID-token fetch that defends against a
// surprising iOS-Safari failure mode:
//
//   `Headers` (and via that, `fetch`) throw "TypeError: The string did
//   not match the expected pattern" if a header value contains a
//   forbidden character — newline, NUL, non-ASCII control char.
//
// Firebase Auth ID tokens are JWTs (base64url-encoded), so the value
// itself should always be ASCII. But we've seen the error fire on
// mobile, and the most-likely cause is either a stale token from a
// crashed session or a content-blocker on iOS inserting cruft. Either
// way, sanitising the token before the header is constructed makes the
// failure mode silent + recoverable rather than a cryptic exception.

import { getFirebase } from "./client";

/**
 * Get a current Firebase ID token, stripped of any whitespace or
 * control characters. Returns null if the user is not signed in or
 * the token cannot be fetched.
 */
export async function getCleanIdToken(forceRefresh = false): Promise<string | null> {
  const fb = getFirebase();
  if (!fb.ready || !fb.auth.currentUser) return null;
  let raw: string;
  try {
    raw = await fb.auth.currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
  // Strip anything that would make the Headers constructor unhappy:
  // CR, LF, NUL, tab, any byte > 0x7E. A real JWT has none of these.
  const cleaned = raw.replace(/[^\x21-\x7E]/g, "");
  return cleaned || null;
}

/**
 * Build a Headers object with Authorization + (optional) Content-Type,
 * defending against iOS-Safari's "string did not match expected
 * pattern" failure mode. Returns null if no usable token.
 */
export async function authHeaders(json = true): Promise<Headers | null> {
  const token = await getCleanIdToken();
  if (!token) return null;
  const h = new Headers();
  try {
    h.set("Authorization", `Bearer ${token}`);
    if (json) h.set("Content-Type", "application/json");
  } catch {
    return null;
  }
  return h;
}
