import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { navigationFetch, RequestCanceller } from '../utils/apiHealth.js';
import { getImageUrl } from '../utils/imageUtils.js';

export default function Orders() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const rawToken = localStorage.getItem('token');
  const token = rawToken && rawToken !== 'undefined' ? rawToken : '';
  const requestCanceller = useRef(new RequestCanceller());

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Cancel any existing request
        const requestKey = id ? `order-${id}` : 'orders';
        requestCanceller.current.cancel(requestKey);
        const controller = requestCanceller.current.createController(requestKey);

        const url = id 
          ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/orders/${id}`
          : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/orders`;

        const response = await navigationFetch(url, { 
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        
        const data = await response.json();
        
        if (id) {
          if (!data || data.message) {
            setError(data.message);
          } else {
            setOrder(data);
          }
        } else {
          if (Array.isArray(data)) {
            setOrders(data);
          } else {
            setError((data && data.message) || 'Failed to load orders');
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load orders:', err);
          setError(id ? 'Failed to load order' : 'Failed to load orders');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      requestCanceller.current.cleanup();
    };
  }, []);

  if (!token) {
    return (
      <div>
        <h2>Please log in</h2>
        <p>Please log in to view your orders</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }

  if (loading) return (
    <div>
      <div></div>
      <p>Loading {id ? 'order' : 'orders'}...</p>
    </div>
  );
  
  if (error) return (
    <div>
      <h2>Error</h2>
      <p>{error}</p>
    </div>
  );

  // Show individual order details
  if (id && order) {
    return (
      <div>
        <div>
          <Link to="/orders">← Back to Orders</Link>
          <h1>Order #{order.id}</h1>
          <div>
            <div>Status: {order.status}</div>
            <div>Date: {new Date(order.createdAt).toLocaleDateString()}</div>
            {order.transactionNumber && <div>Transaction #: {order.transactionNumber}</div>}
            {order.orderTime && <div>Order Time: {new Date(order.orderTime).toLocaleString()}</div>}
            <div>Total: ₱{order.total}</div>
          </div>
        </div>
        
        {order.order_items && order.order_items.length > 0 && (
          <div>
            <h2>Items</h2>
            {order.order_items.map(item => (
              <div key={item.id}>
                <div>
                  <div>
                    <img 
                      src={getImageUrl(item.product?.product_images?.[0]?.url) || '/images/placeholder.svg'}
                      alt={item.product?.name || 'Product'}
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    />
                  </div>
                  <div>{item.product?.name || 'Unknown Product'}</div>
                  <div>₱{item.price} x {item.quantity}</div>
                </div>
                <div>₱{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        
        {order.shipping_address && (
          <div>
            <h2>Shipping Address</h2>
            <div>
              <div>{order.shipping_address.line1}</div>
              {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
              {order.shipping_address.barangay && <div>{order.shipping_address.barangay}</div>}
              <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}</div>
              <div>{order.shipping_address.country}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1>My Orders</h1>
        <p>Track and manage your orders</p>
      </div>
      
      {orders.length === 0 ? (
        <div>
          <div>📦</div>
          <h2>No orders found</h2>
          <p>You haven't placed any orders yet.</p>
          <Link to="/catalog">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div>
          {orders.map(o => {
            const firstItem = (o.order_items && o.order_items[0]) || null;
            const label = firstItem?.product?.name || `Order #${o.id}`;
            return (
              <div key={o.id}>
                <div>
                  <div style={{ fontWeight: '600' }}>{label}</div>
                  <div>{new Date(o.createdAt).toLocaleDateString()}</div>
                  {o.transactionNumber && <div>Transaction #: {o.transactionNumber}</div>}
                  <div>
                    {o.status}
                  </div>
                </div>
                <div>
                  <div>
                    <span>Total:</span>
                    <span>₱{o.total}</span>
                  </div>
                  <div>
                    <Link to={`/order/${o.id}`}>
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


