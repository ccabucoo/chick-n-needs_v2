import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLocalCart, setLocalCart } from '../utils/cartUtils.js';
import { getImageUrl } from '../utils/imageUtils.js';

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [ratingValue, setRatingValue] = useState(5);
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('all');

  // Filter reviews based on selected rating
  const filteredReviews = reviews.filter(review => {
    if (ratingFilter === 'all') return true;
    return review.rating === parseInt(ratingFilter);
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/products/${id}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/reviews/${id}`)
      .then(r => r.json())
      .then(list => {
        if (Array.isArray(list)) setReviews(list);
      })
      .catch(() => {});
  }, [id]);

  const addToCart = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Add to local cart for non-logged in users
      const localCart = getLocalCart();
      const existingItem = localCart.find(item => item.productId === data.id);
      const guestLimit = Math.min(Number(data.stock ?? 10) || 10, 10);
      const currentTotal = localCart.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      
      if (existingItem) {
        const nextQty = existingItem.quantity + 1;
        if (nextQty > guestLimit) {
          setMessage('Limit Reached, login to continue');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        if (currentTotal + 1 > 10) {
          setMessage('Limit Reached, login to continue');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        existingItem.quantity = nextQty;
      } else {
        if ((Number(data.stock ?? 1)) < 1) {
          setMessage('Product is out of stock');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        if (currentTotal + 1 > 10) {
          setMessage('Limit Reached, login to continue');
          setTimeout(() => setMessage(''), 3000);
          return;
        }
        localCart.push({
          id: Date.now(), // Temporary ID for local cart
          productId: data.id,
          quantity: 1,
          product: {
            name: data.name,
            price: data.price,
            stock: data.stock
          }
        });
      }
      
      setLocalCart(localCart);
      setMessage('Added to cart (saved locally)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Add to server cart for logged in users
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/cart`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ productId: data.id, quantity: 1 })
      });
      
      if (res.ok) {
        setMessage('Added to cart');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await res.json();
        setMessage(errorData.message || 'Failed to add to cart');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage('Failed to add to cart');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const addToWishlist = async () => {
    const token = localStorage.getItem('token');
    if (!token) { 
      setMessage('Please login first to add to wishlist');
      setTimeout(() => setMessage(''), 3000);
      return; 
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/wishlist`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ productId: data.id })
      });
      
      if (res.ok) {
        setMessage('Added to wishlist');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await res.json();
        setMessage(errorData.message || 'Failed to add to wishlist');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage('Failed to add to wishlist');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const checkoutNow = async () => {
    navigate(`/checkout?buyNow=${data.id}`);
  };

  if (loading) return (
    <div>
      <button onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div></div>
      <p>Loading product...</p>
    </div>
  );
  
  if (!data) return (
    <div>
      <button onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2>Product not found</h2>
      <p>The product you're looking for doesn't exist.</p>
    </div>
  );

  return (
    <div>
      <div>
        <button onClick={() => navigate(-1)}>
          ← Back
        </button>
         <div>
           {data.product_images?.[0]?.url && (
             <img 
               src={getImageUrl(data.product_images[0].url)} 
               alt={data.name} 
              
             />
           )}
           {data.product_images && data.product_images.length > 1 && (
             <div>
               {data.product_images.map((img, index) => (
                 <img 
                   key={index}
                   src={getImageUrl(img.url)} 
                   alt={`${data.name} ${index + 1}`} 
                  
                 />
               ))}
             </div>
           )}
         </div>
        
        <div>
          <h1>{data.name}</h1>
          <div>₱{data.price}</div>
          <div>{Number(data.soldCount || 0)} sold</div>
          <div>
            {Number(data.stock) > 0 ? `${data.stock} in stock` : 'Out of stock'}
          </div>
          <p>{data.description}</p>
          
          {message && (
            <div>
              {message}
            </div>
          )}
          
          <div>
            <button 
              disabled={Number(data.stock) <= 0}
              onClick={addToCart}
            >
              Add to Cart
            </button>
            <button 
              disabled={Number(data.stock) <= 0}
              onClick={checkoutNow}
            >
              Checkout
            </button>
            <button 
              
              onClick={addToWishlist}
            >
              Add to Wishlist
            </button>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>
            Reviews ({Array.isArray(reviews) ? reviews.length : 0})
            {ratingFilter !== 'all' && (
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                - Showing {filteredReviews.length} with {ratingFilter} star{ratingFilter !== '1' ? 's' : ''}
              </span>
            )}
          </h2>
          {reviews && reviews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Filter by rating:</label>
              <select 
                value={ratingFilter} 
                onChange={(e) => setRatingFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">All ratings</option>
                <option value="5">★★★★★ (5 stars)</option>
                <option value="4">★★★★☆ (4 stars)</option>
                <option value="3">★★★☆☆ (3 stars)</option>
                <option value="2">★★☆☆☆ (2 stars)</option>
                <option value="1">★☆☆☆☆ (1 star)</option>
              </select>
              {ratingFilter !== 'all' && (
                <button 
                  onClick={() => setRatingFilter('all')}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filter
                </button>
              )}
            </div>
          )}
        </div>
        
        {(!reviews || reviews.length === 0) ? (
          <div>No reviews yet.</div>
        ) : filteredReviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No reviews found for the selected rating.
          </div>
        ) : (
          <div>
            {(showAllReviews ? filteredReviews : filteredReviews.slice(0, 3)).map((rv, idx) => (
              <div key={rv.id || idx} style={{ borderTop: '1px solid #eee', padding: '12px 0' }}>
                <div style={{ fontWeight: '600' }}>Rating: {rv.rating}/5</div>
                {rv.comment && <div style={{ color: '#444', whiteSpace: 'pre-wrap' }}>{rv.comment}</div>}
              </div>
            ))}
            {filteredReviews.length > 3 && (
              <button onClick={() => setShowAllReviews(v => !v)} style={{ marginTop: '8px' }}>
                {showAllReviews ? 'Show less' : `View all ${filteredReviews.length} reviews`}
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <h2>Leave a Review</h2>
        <form onSubmit={async e => {
          e.preventDefault();
          const token = localStorage.getItem('token');
          if (!token) {
            setMessage('Please login to leave a review');
            setTimeout(() => setMessage(''), 3000);
            return;
          }
          
          const rating = Number(ratingValue || 5);
          const comment = e.currentTarget.comment.value;
          
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/reviews/${data.id}`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
              body: JSON.stringify({ rating, comment }) 
            });
            
            if (res.ok) {
              setMessage('Review submitted');
              setTimeout(() => setMessage(''), 3000);
              e.target.reset();
            } else {
              const errorData = await res.json();
              setMessage(errorData.message || 'Failed to submit review');
              setTimeout(() => setMessage(''), 3000);
            }
          } catch (err) {
            setMessage('Failed to submit review');
            setTimeout(() => setMessage(''), 3000);
          }
        }}>
          <div>Share your experience</div>
          <div>
            <div>
              <label>Rating:</label>
              <div style={{ display: 'inline-flex', gap: '4px', marginLeft: '8px' }} aria-label="Rating">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingValue(n)}
                    aria-label={`${n} star${n>1?'s':''}`}
                    title={`${n} star${n>1?'s':''}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: n <= ratingValue ? '#f5a623' : '#ccc',
                      padding: 0
                    }}
                  >
                    {n <= ratingValue ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <textarea 
                name="comment" 
                
                placeholder="Share your thoughts about this product..."
                rows="4"
              />
            </div>
          </div>
          <button>Submit Review</button>
        </form>
      </div>
    </div>
  );
}


