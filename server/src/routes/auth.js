import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { User, EmailToken } from '../models/index.js';
import { Op } from 'sequelize';
import { sendVerificationEmail, sendLoginCode, sendPasswordResetEmail } from '../services/email.js';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '../utils/rateLimiter.js';
import { addToDenylist } from '../utils/tokenDenylist.js';
import { addRefreshToDenylist, isRefreshDenylisted } from '../utils/refreshDenylist.js';

// CSRF token storage (in production, use Redis or database)
const csrfTokens = new Map();

const router = express.Router();

// Security headers middleware (remove deprecated X-XSS-Protection)
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

// CSRF protection middleware
function csrfProtection(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (req.method === 'GET') {
    // Generate CSRF token for GET requests
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token with IP binding and expiration (15 minutes)
    csrfTokens.set(token, {
      ip: clientIP,
      expires: Date.now() + 15 * 60 * 1000,
      used: false
    });
    
    res.locals.csrfToken = token;
    next();
  } else {
    // Validate CSRF token for POST/PUT/DELETE requests
    const csrfToken = req.headers['x-csrf-token'] || req.body.csrfToken;
    
    if (!csrfToken || !csrfTokens.has(csrfToken)) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    
    const tokenData = csrfTokens.get(csrfToken);
    if (tokenData.ip !== clientIP) {
      return res.status(403).json({ message: 'CSRF token IP mismatch' });
    }
    
    // Check if token is expired
    if (Date.now() > tokenData.expires) {
      csrfTokens.delete(csrfToken);
      return res.status(403).json({ message: 'CSRF token expired' });
    }
    
    // Check if token was already used
    if (tokenData.used) {
      csrfTokens.delete(csrfToken);
      return res.status(403).json({ message: 'CSRF token already used' });
    }
    
    // Mark token as used and remove it
    tokenData.used = true;
    csrfTokens.delete(csrfToken);
    next();
  }
}

// CSRF token endpoint
router.get('/csrf-token', securityHeaders, csrfProtection, (req, res) => {
  res.json({ csrfToken: res.locals.csrfToken });
});

function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const jti = generateJti();
  return jwt.sign({ uid: user.id, email: user.email, jti }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const jti = generateJti();
  // 7 days refresh token
  return jwt.sign({ uid: user.id, type: 'refresh', jti }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function setRefreshCookie(res, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

// Password strength calculation
function calculatePasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommonPatterns: !/(password|123|qwerty|abc|admin)/i.test(password),
    noRepeatingChars: !/(.)\1{2,}/.test(password),
    noSequentialChars: !/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)
  };
  
  Object.values(checks).forEach(check => {
    if (check) score++;
  });
  
  return { score, checks };
}

// Get recent password hashes for a user
async function getRecentPasswordHashes(userId, limit = 3) {
  try {
    // Simple implementation using existing User model
    // Store last 3 password hashes in user table (for demo purposes)
    const user = await User.findByPk(userId);
    if (!user) return [];
    
    // In a real implementation, you'd have a separate password_history table
    // For now, we'll use a simple approach with the existing user table
    const passwordHistory = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
    return passwordHistory.slice(0, limit);
  } catch (error) {
    console.error('Error getting password history:', error);
    return [];
  }
}

// Store password in history
async function storePasswordInHistory(userId, passwordHash) {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;
    
    // Get existing history
    const passwordHistory = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];
    
    // Add new password hash
    passwordHistory.unshift(passwordHash);
    
    // Keep only last 3 passwords
    const trimmedHistory = passwordHistory.slice(0, 3);
    
    // Update user record
    await user.update({ passwordHistory: JSON.stringify(trimmedHistory) });
    
    console.log(`Password history updated for user ${userId}`);
  } catch (error) {
    console.error('Error storing password history:', error);
  }
}


router.post('/register',
  [
    body('firstName')
      .isLength({ min: 1, max: 100 })
      .withMessage('First name is required and must be 1-100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('First name can only contain letters and spaces'),
    body('lastName')
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name is required and must be 1-100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Last name can only contain letters and spaces'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { firstName, lastName, email, username, password } = req.body;

    try {
      // Check for existing email or username inside try/catch to avoid uncaught errors
      const existing = await User.findOne({ 
        where: { 
          [Op.or]: [{ email }, { username }] 
        } 
      });

      if (existing) {
        if (existing.email === email) {
          return res.status(400).json({ message: 'Email already registered' });
        }
        if (existing.username === username) {
          return res.status(400).json({ message: 'Username already taken' });
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ 
        firstName, 
        lastName, 
        email, 
        username, 
        passwordHash 
      });

      // Try to send verification email, but do not fail registration if email provider is not configured
      try {
        await sendVerificationEmail(user);
      } catch (emailErr) {
        console.warn('Email sending failed or not configured:', emailErr?.message || emailErr);
      }

      res.json({ 
        message: 'Registration successful. Please verify your email before logging in.',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
  }
);

router.post('/login',
  [
    body('login')
      .notEmpty()
      .withMessage('Email or username is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { login, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const rateLimitKey = `${login}_${clientIP}`;

    // Check rate limiting
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        message: rateLimit.message,
        remainingAttempts: rateLimit.remainingAttempts
      });
    }

    try {
      // Find user by email or username
      const user = await User.findOne({ 
        where: { 
          [Op.or]: [
            { email: login },
            { username: login }
          ]
        } 
      });

      if (!user) {
        recordFailedAttempt(rateLimitKey);
        return res.status(400).json({ 
          message: 'Invalid credentials',
          remainingAttempts: rateLimit.remainingAttempts - 1
        });
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        const lockoutMinutes = Math.ceil((user.lockedUntil - new Date()) / (60 * 1000));
        return res.status(423).json({ 
          message: `Account is locked. Try again in ${lockoutMinutes} minutes.`
        });
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        // Increment failed attempts
        user.failedLoginAttempts += 1;
        
        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
        
        await user.save();
        recordFailedAttempt(rateLimitKey);
        
        return res.status(400).json({ 
          message: 'Invalid credentials',
          remainingAttempts: Math.max(0, 5 - user.failedLoginAttempts)
        });
      }

      // Check email verification
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: 'You must verify your email first before you can access your account.' 
        });
      }

      // Optional second factor via email code for verified users
      if (user.emailVerified && !req.body.code) {
        // Check if a recent code exists within 5 minutes (300s)
        const existing = await EmailToken.findOne({ where: { userId: user.id, purpose: 'login' }, order: [['createdAt', 'DESC']] });
        if (existing) {
          const ageSeconds = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
          if (ageSeconds < 300) {
            const resendIn = Math.max(0, Math.ceil(300 - ageSeconds));
            return res.status(206).json({ message: 'Verification code already sent', requiresCode: true, resendIn });
          }
        }
        // Invalidate older codes and send a fresh one
        await EmailToken.destroy({ where: { userId: user.id, purpose: 'login' } });
        await sendLoginCode(user);
        return res.status(206).json({ message: 'Verification code sent to your email', requiresCode: true, resendIn: 300 });
      }

      if (user.emailVerified && req.body.code) {
        const foundCode = await EmailToken.findOne({ where: { token: req.body.code, purpose: 'login' }, include: [User] });
        if (!foundCode || foundCode.user.id !== user.id) {
          return res.status(400).json({ message: 'Invalid verification code' });
        }
        // Expire code after 5 minutes (300 seconds)
        const created = new Date(foundCode.createdAt);
        const ageSeconds = (Date.now() - created.getTime()) / 1000;
        if (ageSeconds > 300) {
          await foundCode.destroy();
          return res.status(400).json({ message: 'Verification code expired. Please request a new code.' });
        }
        await foundCode.destroy();
      }

      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await user.save();
      clearFailedAttempts(rateLimitKey);

      const token = signToken(user);
      const refresh = signRefreshToken(user);
      // Store refresh cookie
      setRefreshCookie(res, refresh);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email, 
          username: user.username,
          emailVerified: user.emailVerified 
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed. Please try again.' });
    }
  }
);

// Logout: accept current JWT in Authorization header and denylist its jti until it expires
router.post('/logout', (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(200).json({ ok: true });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Server misconfiguration' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expMs = (decoded.exp || 0) * 1000;
    if (decoded.jti && expMs) {
      addToDenylist(decoded.jti, expMs);
    }
    // Also clear refresh cookie client-side and denylist existing cookie if present
    const refreshCookie = req.cookies?.refresh_token;
    if (refreshCookie) {
      try {
        const refreshDecoded = jwt.verify(refreshCookie, process.env.JWT_SECRET);
        const rExpMs = (refreshDecoded.exp || 0) * 1000;
        if (refreshDecoded.jti && rExpMs) {
          addRefreshToDenylist(refreshDecoded.jti, rExpMs);
        }
      } catch {}
    }
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

// Refresh access token using httpOnly refresh cookie
router.post('/refresh', (req, res) => {
  try {
    const cookie = req.cookies?.refresh_token;
    if (!cookie) return res.status(401).json({ message: 'Missing refresh token' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Server misconfiguration' });
    const decoded = jwt.verify(cookie, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(400).json({ message: 'Invalid token type' });
    if (isRefreshDenylisted(decoded.jti)) return res.status(401).json({ message: 'Refresh token revoked' });

    // Rotate refresh token: denylist old, issue new
    const expMs = (decoded.exp || 0) * 1000;
    if (decoded.jti && expMs) {
      addRefreshToDenylist(decoded.jti, expMs);
    }

    // Issue new tokens
    const user = { id: decoded.uid, email: decoded.email };
    const newAccess = signToken(user);
    const newRefresh = signRefreshToken(user);
    setRefreshCookie(res, newRefresh);
    return res.json({ token: newAccess });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.get('/verify', async (req, res) => {
  const { token } = req.query;
  const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  const redirect = (msg) => res.redirect(`${appUrl}/verify?status=${encodeURIComponent(msg)}`);

  if (!token) return redirect('Missing token');
  const found = await EmailToken.findOne({ where: { token, purpose: 'verify' }, include: [User] });
  if (!found) return redirect('Invalid token');
  found.user.emailVerified = true;
  await found.user.save();
  await found.destroy();
  return redirect('Email verified');
});

// Forgot password endpoint
router.post('/forgot-password',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const rateLimitKey = `forgot_${email}_${clientIP}`;

      // Check rate limiting for forgot password
      const rateLimit = checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          message: 'Too many password reset requests. Please wait before trying again.',
          retryAfter: rateLimit.retryAfter
        });
      }

      // Find user by email
      const user = await User.findOne({ where: { email } });
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      }

      // Check if user has a recent password reset token (within 15 minutes)
      const recentToken = await EmailToken.findOne({
        where: {
          userId: user.id,
          purpose: 'reset',
          createdAt: {
            [Op.gte]: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
          }
        }
      });

      if (recentToken) {
        return res.status(429).json({ message: 'A password reset link was recently sent and is still valid for up to 15 minutes. Please check your email or try again later.' });
      }

      // Generate cryptographically secure reset token with additional entropy
      const resetToken = crypto.randomBytes(32).toString('hex') + 
                        Date.now().toString(36) + 
                        Math.random().toString(36).substr(2) +
                        crypto.randomBytes(16).toString('base64url');
      
      // Store reset token (expires in 15 minutes)
      await EmailToken.create({
        token: resetToken,
        purpose: 'reset',
        userId: user.id
      });

      // Send password reset email
      await sendPasswordResetEmail(user, resetToken);

      // Record the attempt for rate limiting
      recordFailedAttempt(rateLimitKey);

      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process password reset request. Please try again.' });
    }
  }
);

// Reset password endpoint
router.post('/reset-password',
  securityHeaders,
  csrfProtection,
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required')
      .isLength({ min: 64, max: 200 })
      .withMessage('Invalid token format')
      .matches(/^[a-f0-9]+[a-z0-9]+[a-z0-9]+$/i)
      .withMessage('Invalid token format'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
      .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/)
      .withMessage('Password contains invalid characters'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  async (req, res) => {
    const startTime = Date.now(); // For timing attack prevention
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Add delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { token, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const rateLimitKey = `reset_${clientIP}`;
      const tokenRateLimitKey = `token_${token.substring(0, 16)}_${clientIP}`;

      // Check rate limiting for reset attempts (per IP)
      const rateLimit = checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          message: 'Too many reset attempts. Please wait before trying again.',
          retryAfter: rateLimit.retryAfter
        });
      }

      // Check rate limiting for specific token attempts (prevent brute force)
      const tokenRateLimit = checkRateLimit(tokenRateLimitKey);
      if (!tokenRateLimit.allowed) {
        return res.status(429).json({ 
          message: 'Too many attempts for this reset link. Please request a new one.',
          retryAfter: tokenRateLimit.retryAfter
        });
      }

      // Find and validate reset token
      const resetToken = await EmailToken.findOne({
        where: { token, purpose: 'reset' },
        include: [User]
      });

      // Always add delay to prevent timing attacks
      const processingTime = Date.now() - startTime;
      const minDelay = 300; // Minimum 300ms delay
      const randomDelay = Math.random() * 100; // 0-100ms random delay
      const totalDelay = minDelay + randomDelay;
      
      if (processingTime < totalDelay) {
        await new Promise(resolve => setTimeout(resolve, totalDelay - processingTime));
      }

      if (!resetToken) {
        recordFailedAttempt(rateLimitKey);
        recordFailedAttempt(tokenRateLimitKey);
        return res.status(400).json({ message: 'Invalid or expired reset token.' });
      }

      // Check if token is expired (15 minutes)
      const tokenAge = Date.now() - new Date(resetToken.createdAt).getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      
      if (tokenAge > fifteenMinutes) {
        await resetToken.destroy();
        recordFailedAttempt(rateLimitKey);
        recordFailedAttempt(tokenRateLimitKey);
        return res.status(400).json({ message: 'Reset token has expired. Please request a new password reset.' });
      }

      // Check if password is different from current password
      const isSamePassword = await bcrypt.compare(password, resetToken.user.passwordHash);
      if (isSamePassword) {
        await resetToken.destroy();
        return res.status(400).json({ message: 'New password must be different from your current password.' });
      }

      // Additional password strength checks
      const passwordStrength = calculatePasswordStrength(password);
      if (passwordStrength.score < 3) {
        return res.status(400).json({ 
          message: 'Password is too weak. Please choose a stronger password with more complexity.' 
        });
      }

      // Check for password history (prevent reuse of last 3 passwords)
      const recentPasswords = await getRecentPasswordHashes(resetToken.user.id, 3);
      for (const oldHash of recentPasswords) {
        if (await bcrypt.compare(password, oldHash)) {
          return res.status(400).json({ 
            message: 'You cannot reuse a recent password. Please choose a different one.' 
          });
        }
      }

      // Update user password
      const hashedPassword = await bcrypt.hash(password, 12);
      resetToken.user.passwordHash = hashedPassword;
      
      // Clear any failed login attempts
      resetToken.user.failedLoginAttempts = 0;
      resetToken.user.lockedUntil = null;
      
      // Store password in history
      await storePasswordInHistory(resetToken.user.id, hashedPassword);
      
      await resetToken.user.save();
      
      // Delete the used reset token
      await resetToken.destroy();

      // Clear rate limiting on successful reset
      clearFailedAttempts(rateLimitKey);
      clearFailedAttempts(tokenRateLimitKey);

      // Log successful password reset
      console.log(`Password reset successful for user ${resetToken.user.email} from IP ${clientIP}`);

      res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      // Add delay even on errors to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
      res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
  }
);

export default router;


