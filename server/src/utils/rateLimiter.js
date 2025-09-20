// Simple in-memory rate limiter for failed login attempts
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier) {
  const now = Date.now();
  const attempts = failedAttempts.get(identifier) || { count: 0, firstAttempt: now };
  
  // Reset if lockout period has passed
  if (attempts.lockedUntil && now > attempts.lockedUntil) {
    failedAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  // Check if account is locked
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    const lockoutMinutes = Math.ceil((attempts.lockedUntil - now) / (60 * 1000));
    return { 
      allowed: false, 
      message: `Account locked. Try again in ${lockoutMinutes} minutes.`,
      remainingAttempts: 0
    };
  }
  
  // Check if max attempts reached
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_TIME;
    failedAttempts.set(identifier, attempts);
    return { 
      allowed: false, 
      message: `Too many failed attempts. Account locked for 15 minutes.`,
      remainingAttempts: 0
    };
  }
  
  return { 
    allowed: true, 
    remainingAttempts: MAX_ATTEMPTS - attempts.count 
  };
}

export function recordFailedAttempt(identifier) {
  const now = Date.now();
  const attempts = failedAttempts.get(identifier) || { count: 0, firstAttempt: now };
  
  attempts.count++;
  attempts.lastAttempt = now;
  
  // Reset counter if it's been more than 1 hour since first attempt
  if (now - attempts.firstAttempt > 60 * 60 * 1000) {
    attempts.count = 1;
    attempts.firstAttempt = now;
  }
  
  failedAttempts.set(identifier, attempts);
}

export function clearFailedAttempts(identifier) {
  failedAttempts.delete(identifier);
}
