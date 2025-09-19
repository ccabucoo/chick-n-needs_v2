import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/notifications`, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          setError(data.message || 'Failed to load notifications');
        }
      })
      .catch(err => setError('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <div>
        <h2>Please log in</h2>
        <p>Please log in to view your notifications</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }

  if (loading) return (
    <div>
      <div></div>
      <p>Loading notifications...</p>
    </div>
  );
  
  if (error) return (
    <div>
      <h2>Error</h2>
      <p>{error}</p>
    </div>
  );

  return (
    <div>
      <div>
        <h1>Notifications</h1>
        <div>
          <button 
           
            onClick={markAllAsRead}
            disabled={items.filter(n => !n.read).length === 0}
          >
            Mark All as Read
          </button>
        </div>
      </div>
      
      {items.length === 0 ? (
        <div>
          <div>🔔</div>
          <h2>No notifications</h2>
          <p>You're all caught up! Check back later for updates.</p>
        </div>
      ) : (
        <div>
          {items.map(n => (
            <div key={n.id}>
              <div>
                <h3>{n.title || 'Notification'}</h3>
                <span>
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                {n.message}
              </div>
              <div>
                {!n.read && (
                  <button 
                   
                    onClick={() => markAsRead(n.id)}
                  >
                    Mark as Read
                  </button>
                )}
                <button 
                 
                  onClick={() => deleteNotification(n.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


