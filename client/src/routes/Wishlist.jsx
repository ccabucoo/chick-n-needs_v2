import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUtils.js';

export default function Wishlist() {
  async function removeFromWishlist(id) {
    if (!confirm('Remove this item from wishlist?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/wishlist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
      }
    } catch (e) {}
  }
  const token = localStorage.getItem('token');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/wishlist`, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          setError(data.message || 'Failed to load wishlist');
        }
      })
      .catch(err => setError('Failed to load wishlist'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <div>
        <h2>Please log in</h2>
        <p>Please log in to view your wishlist</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }

  if (loading) return (
    <div>
      <div></div>
      <p>Loading wishlist...</p>
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
        <h1>My Wishlist</h1>
        <p>Save products you love for later</p>
      </div>
      
      {items.length === 0 ? (
        <div>
          <div>❤️</div>
          <h2>No items in wishlist</h2>
          <p>Add products you love to your wishlist.</p>
          <Link to="/catalog">
            Browse Products
          </Link>
        </div>
      ) : (
        <div>
          {items.map(i => (
            <div key={i.id}>
              <Link to={`/product/${i.product.id}`}>
                 <img 
                   src={getImageUrl(i.product?.product_images?.[0]?.url) || '/images/placeholder.svg'} 
                   alt={i.product?.name || 'Product'} 
                  
                 />
                <div>
                  <h3>{i.product?.name}</h3>
                  <p>₱{i.product?.price || 0}</p>
                </div>
              </Link>
              <button 
               
                onClick={() => removeFromWishlist(i.id)}
                title="Remove from wishlist"
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


