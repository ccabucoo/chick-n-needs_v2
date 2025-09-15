import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    } else {
      // Fetch CSRF token
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include'
      })
      .then(res => res.json())
      .then(data => {
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch CSRF token:', err);
      });
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please make sure both password fields are identical.');
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError('Password must be 8-128 characters long');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain at least one lowercase letter, one uppercase letter, and one number');
      return;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password)) {
      setError('Password contains invalid characters');
      return;
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      setError('Password is too common. Please choose a stronger password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ token, password, confirmPassword, csrfToken })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setError('');
      } else {
        if (res.status === 429) {
          setError('Too many attempts. Please wait before trying again.');
        } else {
          setError(data.message || 'Failed to reset password');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (success) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#2c5530', marginBottom: '20px' }}>Password Reset Successful!</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <button
            onClick={handleBackToLogin}
            style={{
              backgroundColor: '#4a7c59',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c5530', marginBottom: '10px' }}>Reset Your Password</h1>
        <p style={{ color: '#666' }}>Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8f9fa', padding: '30px', borderRadius: '8px' }}>
        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your new password"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
          <p><strong>Password requirements:</strong></p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>At least 8 characters long</li>
            <li>One lowercase letter</li>
            <li>One uppercase letter</li>
            <li>One number</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: loading ? '#ccc' : '#4a7c59',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </button>

        <button
          type="button"
          onClick={handleBackToLogin}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            color: '#4a7c59',
            border: '1px solid #4a7c59',
            padding: '12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}
