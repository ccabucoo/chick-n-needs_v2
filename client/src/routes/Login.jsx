import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocalCart, mergeCarts } from '../utils/cartUtils.js';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [requiresCode, setRequiresCode] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const navigate = useNavigate();

  // Prevent copy/paste/cut on password field
  const handlePasswordKeyDown = (e) => {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
    }
  };

  const handlePasswordPaste = (e) => {
    e.preventDefault();
  };

  const submit = async e => {
    e.preventDefault();
    if (!login.trim() || !password.trim()) {
      setError('Please enter both email/username and password');
      return;
    }
    
    setLoading(true);
    setError('');
    setRemainingAttempts(null);
    
    try {
      const payload = requiresCode ? { login, password, code } : { login, password };
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/auth/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const data = await res.json();

      // Handle second-factor required
      if (res.status === 206 || data.requiresCode) {
        setRequiresCode(true);
        setError(data.message || 'Verification code sent to your email');
        setResendIn(Number(data.resendIn || 90));
        return;
      }

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        
        // Merge local cart with server cart
        const localCart = getLocalCart();
        if (localCart.length > 0) {
          await mergeCarts(localCart, data.token);
        }
        
        window.location.href = '/';
      } else {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // countdown for resend
  if (requiresCode && resendIn > 0) {
    setTimeout(() => setResendIn(v => (v > 0 ? v - 1 : 0)), 1000);
  }

  const resend = async () => {
    if (resendIn > 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/auth/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ login, password }) 
      });
      const data = await res.json();
      if (res.status === 206 || data.requiresCode) {
        setError(data.message || 'Verification code resent');
        setResendIn(Number(data.resendIn || 90));
        setRequiresCode(true);
      } else if (!res.ok) {
        setError(data.message || 'Failed to resend code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    setForgotLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setForgotSuccess(true);
        setError('');
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div>
      <div>
        <div>
          <h1>Sign In</h1>
          <p>Welcome back! Please sign in to your account.</p>
        </div>
        
        {!showForgotPassword ? (
          <>
            <form onSubmit={submit}>
              {error && (
                <div>
                  {error}
                </div>
              )}
              
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <div>
                  {remainingAttempts} attempts remaining
                </div>
              )}
              
              <div>
                <input 
                  placeholder="Email or Username" 
                  value={login} 
                  onChange={e => setLogin(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              
              <div>
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  onPaste={handlePasswordPaste}
                  required
                  autoComplete="current-password"
                />
              </div>

              {requiresCode && (
                <div>
                  <input
                    placeholder="Verification code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                  />
                  <div>
                    <button type="button" onClick={resend} disabled={resendIn > 0 || loading}>
                      {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                    </button>
                  </div>
                </div>
              )}
              
              <button 
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <div>
                    <div></div>
                    {requiresCode ? 'Verifying...' : 'Signing In...'}
                  </div>
                ) : (
                  (requiresCode ? 'Verify & Sign In' : 'Sign In')
                )}
              </button>
            </form>
            
            <div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{ background: 'none', border: 'none', color: '#4a7c59', textDecoration: 'underline', cursor: 'pointer', marginTop: '10px' }}
              >
                Forgot your password?
              </button>
            </div>
            
            <div>
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                >
                  Create one
                </button>
              </p>
            </div>
          </>
        ) : (
          <div>
            {forgotSuccess ? (
              <div>
                <h2>Check Your Email</h2>
                <p>We've sent a password reset link to <strong>{forgotEmail}</strong></p>
                <p>Please check your email and click the link to reset your password.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSuccess(false);
                    setForgotEmail('');
                  }}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h2>Reset Password</h2>
                <p>Enter your email address and we'll send you a link to reset your password.</p>
                
                {error && (
                  <div>
                    {error}
                  </div>
                )}
                
                <div>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                    setError('');
                  }}
                  style={{ background: 'none', border: '1px solid #ccc', marginLeft: '10px' }}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


