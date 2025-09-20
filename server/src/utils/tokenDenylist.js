// Simple in-memory token denylist keyed by JWT jti
// Each entry stores an expiration timestamp to allow cleanup

const denylistedJtiToExpiry = new Map();

export function addToDenylist(jti, expiresAtMs) {
  if (!jti) return;
  denylistedJtiToExpiry.set(jti, expiresAtMs);
  const delay = Math.max(0, expiresAtMs - Date.now());
  setTimeout(() => {
    denylistedJtiToExpiry.delete(jti);
  }, delay).unref?.();
}

export function isDenylisted(jti) {
  if (!jti) return false;
  const exp = denylistedJtiToExpiry.get(jti);
  if (!exp) return false;
  if (Date.now() > exp) {
    denylistedJtiToExpiry.delete(jti);
    return false;
  }
  return true;
}

export function clearDenylist() {
  denylistedJtiToExpiry.clear();
}


