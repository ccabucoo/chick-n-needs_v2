import { Link, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { useNavigationThrottle } from '../hooks/useNavigationThrottle.js';

function App() {
  // Notifications temporarily disabled
  // const [notifCount, setNotifCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const throttledNavigate = useNavigationThrottle(300); // 300ms cooldown

  useEffect(() => {
    const raw = localStorage.getItem('token');
    const token = raw && raw !== 'undefined' ? raw : '';
    setIsLoggedIn(!!token);
    
    // Notifications fetch disabled for now
    if (!token) return;
  }, []);

  // Listen for storage changes to update login status
  useEffect(() => {
    const handleStorageChange = () => {
      const raw = localStorage.getItem('token');
      const token = raw && raw !== 'undefined' ? raw : '';
      setIsLoggedIn(!!token);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    if (!confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    // setNotifCount(0);
    // Redirect to home page after logout
    window.location.href = '/';
  };

  return (
    <div>
      <header>
        <div>
          <h1>Chick'N Needs</h1>
          <nav>
            <button onClick={() => throttledNavigate('/')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Home</button>
            <button onClick={() => throttledNavigate('/catalog')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Products</button>
            <button onClick={() => throttledNavigate('/cart')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Cart</button>
            {isLoggedIn ? (
              <>
                <button onClick={() => throttledNavigate('/orders')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Orders</button>
                <button onClick={() => throttledNavigate('/wishlist')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Wishlist</button>
                <button onClick={() => throttledNavigate('/profile')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Profile</button>
                {/* Notifications hidden for now */}
              </>
            ) : null}
            <button onClick={() => throttledNavigate('/contact')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Contact</button>
            <button onClick={() => throttledNavigate('/faq')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>FAQ</button>
            {isLoggedIn ? (
              <button onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>© 2024 Chick'N Needs. All rights reserved.</footer>
    </div>
  );
}

// Wrap the entire app with ErrorBoundary
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}


