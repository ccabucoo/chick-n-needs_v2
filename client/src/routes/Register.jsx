import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Real-time validation
  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) {
          newErrors[name] = `${name === 'firstName' ? 'First' : 'Last'} name is required`;
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[name] = `${name === 'firstName' ? 'First' : 'Last'} name can only contain letters and spaces`;
        } else if (value.length > 100) {
          newErrors[name] = `${name === 'firstName' ? 'First' : 'Last'} name must be 100 characters or less`;
        } else {
          delete newErrors[name];
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'username':
        if (!value.trim()) {
          newErrors.username = 'Username is required';
        } else if (value.length < 3 || value.length > 50) {
          newErrors.username = 'Username must be 3-50 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          newErrors.username = 'Username can only contain letters, numbers, and underscores';
        } else {
          delete newErrors.username;
        }
        break;
        
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
        } else {
          delete newErrors.password;
        }
        // Also validate confirm password if it exists
        if (formData.confirmPassword) {
          validateField('confirmPassword', formData.confirmPassword);
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  // Prevent copy/paste/cut on password fields
  const handlePasswordKeyDown = (e) => {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
    }
  };

  const handlePasswordPaste = (e) => {
    e.preventDefault();
  };


  const submit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => {
          navigate('/verify-sent');
        }, 1000);
      } else {
        if (data.errors) {
          const fieldErrors = {};
          data.errors.forEach(err => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          setMessage(data.message || 'Registration failed');
        }
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <div>
          <h1>Create Account</h1>
          <p>Join Chick'N Needs and start your poultry farming journey.</p>
        </div>
        
        <form onSubmit={submit}>
          {message && (
            <div>
              {message}
            </div>
          )}
          
          <div>
            <div>
              <input
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              {errors.firstName && <div>{errors.firstName}</div>}
            </div>
            
            <div>
              <input
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
              {errors.lastName && <div>{errors.lastName}</div>}
            </div>
          </div>
          
          <div>
            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            {errors.email && <div>{errors.email}</div>}
          </div>
          
          <div>
            <input
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
            {errors.username && <div>{errors.username}</div>}
          </div>
          
          <div>
            <input
              name="password"
              type="password"
              placeholder="Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)"
              value={formData.password}
              onChange={handleChange}
              onKeyDown={handlePasswordKeyDown}
              onPaste={handlePasswordPaste}
              required
              autoComplete="new-password"
            />
            {errors.password && <div>{errors.password}</div>}
          </div>
          
          <div>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onKeyDown={handlePasswordKeyDown}
              onPaste={handlePasswordPaste}
              required
              autoComplete="new-password"
            />
            {errors.confirmPassword && <div>{errors.confirmPassword}</div>}
          </div>
          
          <button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <div>
                <div></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div>
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
