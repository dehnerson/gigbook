const GRACE_MS = 2000
let signedInAt = 0

/** A confirmed sign-in. A short gap after this should stay on the loader. */
export function noteSignedIn() {
  signedInAt = Date.now()
}

/**
 * Milliseconds to wait before sending a signed-out visitor to the sign-in
 * screen. Immediate when this page load has not signed in. After a sign-in,
 * Convex can report signed out for a moment while the session reconnects.
 */
export function signedOutDelay() {
  if (signedInAt === 0) return 0
  return Math.max(0, GRACE_MS - (Date.now() - signedInAt))
}
