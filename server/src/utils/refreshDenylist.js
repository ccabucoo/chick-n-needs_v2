// Simple in-memory denylist for refresh tokens (by jti)
// Each entry stores an expiration timestamp to allow cleanup

const denylistedRefreshJtiToExpiry = new Map();

export function addRefreshToDenylist(jti, expiresAtMs) {
  if (!jti) return;
  denylistedRefreshJtiToExpiry.set(jti, expiresAtMs);
  const delay = Math.max(0, expiresAtMs - Date.now());
  setTimeout(() => {
    denylistedRefreshJtiToExpiry.delete(jti);
  }, delay).unref?.();
}

export function isRefreshDenylisted(jti) {
  if (!jti) return false;
  const exp = denylistedRefreshJtiToExpiry.get(jti);
  if (!exp) return false;
  if (Date.now() > exp) {
    denylistedRefreshJtiToExpiry.delete(jti);
    return false;
  }
  return true;
}

export function clearRefreshDenylist() {
  denylistedRefreshJtiToExpiry.clear();
}


