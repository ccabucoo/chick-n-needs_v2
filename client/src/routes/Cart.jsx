import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLocalCart, setLocalCart } from '../utils/cartUtils.js';
import { getImageUrl } from '../utils/imageUtils.js';
import { healthyFetch, RequestCanceller } from '../utils/apiHealth.js';

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const requestCanceller = useRef(new RequestCanceller());

  const reload = async () => {
    if (!token) {
      // Use local storage for non-logged in users
      const localCart = getLocalCart();
      setItems(localCart);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cancel any existing request
      requestCanceller.current.cancel('cart');
      const controller = requestCanceller.current.createController('cart');
      
      const response = await healthyFetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/cart`, { 
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setError(data.message || 'Failed to load cart');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load cart:', err);
        setError('Failed to load cart. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (!token) {
      // Update local cart
      const localCart = getLocalCart();
      let totalOther = 0;
      for (const it of localCart) {
        if (it.id !== itemId) totalOther += Number(it.quantity) || 0;
      }
      const updatedCart = localCart.map(item => {
        if (item.id !== itemId) return item;
        const guestLimit = 10;
        const stockCap = Number(item.product?.stock ?? guestLimit);
        const max = Math.min(stockCap, guestLimit);
        const desired = Math.max(1, Math.min(Number(quantity) || 1, max));
        const availableByTotalCap = Math.max(1, Math.min(desired, Math.max(0, guestLimit - totalOther)));
        const clamped = Math.min(desired, availableByTotalCap);
        return { ...item, quantity: clamped };
      });
      setLocalCart(updatedCart);
      setItems(updatedCart);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/cart/${itemId}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ quantity }) 
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to update cart');
      }
      reload();
    } catch (err) {
      setError('Failed to update cart');
    }
  };

  const removeItem = async (itemId) => {
    if (!confirm('Remove this item from your cart?')) return;
    if (!token) {
      // Remove from local cart
      const localCart = getLocalCart();
      const updatedCart = localCart.filter(item => item.id !== itemId);
      setLocalCart(updatedCart);
      setItems(updatedCart);
      return;
    }

    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/cart/${itemId}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      });
      reload();
    } catch (err) {
      setError('Failed to remove item');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map(i => i.id));
    });
  };

  const removeSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} selected item(s)?`)) return;
    if (!token) {
      const localCart = getLocalCart();
      const updated = localCart.filter(i => !selectedIds.has(i.id));
      setLocalCart(updated);
      setItems(updated);
      setSelectedIds(new Set());
      return;
    }
    try {
      await Promise.all(items.filter(i => selectedIds.has(i.id)).map(i => 
        fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/cart/${i.id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        })
      ));
      setSelectedIds(new Set());
      reload();
    } catch {
      setError('Failed to remove selected items');
    }
  };

  const checkoutSelected = () => {
    if (selectedIds.size === 0) return;
    if (!token) {
      navigate('/login');
      return;
    }
    // Note: checkout currently processes all cart items
    navigate('/checkout');
  };

  useEffect(() => { reload(); }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      requestCanceller.current.cleanup();
    };
  }, []);

  const subtotal = items.reduce((s, i) => s + Number(i.product?.price || 0) * i.quantity, 0);

  if (loading) return (
    <div>
      <div></div>
      <p>Loading cart...</p>
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
        <h1>Shopping Cart</h1>
        {!token && (
          <div>
            You're not logged in. Your cart will be saved locally but won't persist across devices. 
            <Link to="/login">Login</Link> to save your cart permanently.
          </div>
        )}
        {items.length > 0 && (
          <div>
            <label>
              <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.size === items.length && items.length > 0} /> Select All
            </label>
            <button onClick={removeSelected} disabled={selectedIds.size === 0}>Remove Selected</button>
            <button onClick={checkoutSelected} disabled={selectedIds.size === 0}>Checkout Selected</button>
          </div>
        )}
      </div>
      
      {items.length === 0 ? (
        <div>
          <div>🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <Link to="/catalog">
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          <div>
            {items.map(i => (
              <div key={i.id}>
                <div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(i.id)}
                    onChange={() => toggleSelect(i.id)}
                    aria-label="Select item"
                  />
                </div>
                 <img 
                   src={getImageUrl(i.product?.product_images?.[0]?.url) || '/images/placeholder.svg'} 
                   alt={i.product?.name || 'Product'} 
                  
                 />
                <div>
                  <h3>{i.product?.name || 'Unknown Product'}</h3>
                  <p>₱{i.product?.price || 0}</p>
                </div>
                <div>
                  <button 
                    onClick={() => updateQuantity(i.id, Math.max(1, i.quantity - 1))}
                    title="Decrease quantity"
                  >
                    −
                  </button>
                  <span>
                    {i.quantity}
                  </span>
                  <button 
                    onClick={() => updateQuantity(i.id, (i.product?.stock ? Math.min(i.product.stock, i.quantity + 1) : i.quantity + 1))}
                    title="Increase quantity"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => removeItem(i.id)}
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => navigate(token ? '/checkout' : '/login')}
                  >
                    Checkout
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div>
            <div>
              <span>Subtotal:</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


