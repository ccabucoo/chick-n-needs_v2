import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Verify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Verifying...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const status = params.get('status');
    if (status) {
      const normalized = /invalid token/i.test(status) ? 'Reset password expired' : status;
      setMessage(normalized);
      setIsSuccess(/verified|success/i.test(normalized));
      return;
    }
    const token = params.get('token');
    if (!token) {
      setMessage('Missing token');
      setIsSuccess(false);
      return;
    }
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        const raw = d.message || 'Verification complete';
        const msg = /invalid token/i.test(raw) ? 'Reset password expired' : raw;
        setMessage(msg);
        setIsSuccess(/verified|success/i.test(msg));
      })
      .catch(() => {
        setMessage('Verification failed. Please try again.');
        setIsSuccess(false);
      });
  }, [params]);

  useEffect(() => {
    if (!message || message === 'Verifying...') return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [message, navigate]);

  return (
    <div>
      <div>
        <div>
          <h1>{isSuccess ? 'Email Verified' : 'Verification Status'}</h1>
          <p>{message}</p>
        </div>
        <div>
          <div>
            {isSuccess ? 'You can now sign in to your account.' : 'If this seems wrong, request a new verification email.'}
          </div>
          <button onClick={() => navigate('/login')}>
            Go to Login now
          </button>
          <p>
            Redirecting to login in {countdown}s
          </p>
        </div>
      </div>
    </div>
  );
}


