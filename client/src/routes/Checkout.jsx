import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUtils.js';
import { navigationFetch, RequestCanceller } from '../utils/apiHealth.js';

export default function Checkout() {
  const [address, setAddress] = useState({ line1: '', line2: '', barangay: '', city: '', state: '', postalCode: '', country: 'Philippines', phone: '' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressErrors, setAddressErrors] = useState({});
  const [focusedField, setFocusedField] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const requestCanceller = useRef(new RequestCanceller());

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    const load = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Cancel any existing requests
        requestCanceller.current.cancel('checkout-cart');
        requestCanceller.current.cancel('checkout-profile');
        
        const cartController = requestCanceller.current.createController('checkout-cart');
        const profileController = requestCanceller.current.createController('checkout-profile');

        const [cartRes, profileRes] = await Promise.all([
          navigationFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/cart`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: cartController.signal
          }),
          navigationFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: profileController.signal
          })
        ]);
        
        const cartData = await cartRes.json();
        const profileData = await profileRes.json();
        
        if (Array.isArray(cartData)) {
          setItems(cartData);
        } else {
          setError(cartData.message || 'Failed to load cart');
        }
        
        if (profileData.addresses && Array.isArray(profileData.addresses)) {
          setSavedAddresses(profileData.addresses);
          if (profileData.addresses.length > 0 && !selectedAddressId && !useNewAddress) {
            setSelectedAddressId(String(profileData.addresses[0].id));
          }
          if (profileData.addresses.length === 0) {
            setUseNewAddress(true);
            setSelectedAddressId('');
          } else {
            // Prefill phone from first saved address if new address form is shown and phone is empty
            const firstAddr = profileData.addresses[0];
            if (useNewAddress && !address.phone && firstAddr?.phone) {
              setAddress(prev => ({ ...prev, phone: firstAddr.phone }));
            }
          }
        } else {
          // No addresses field -> allow new address entry
          setUseNewAddress(true);
          setSelectedAddressId('');
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('Failed to load checkout data:', e);
          setError('Failed to load data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      requestCanceller.current.cleanup();
    };
  }, []);

  const validateAddress = () => {
    const errors = {};
    
    if (!address.line1.trim()) {
      errors.line1 = 'Address line 1 is required';
    } else if (address.line1.trim().length < 5) {
      errors.line1 = 'Address must be at least 5 characters';
    }

    if (!address.barangay.trim()) {
      errors.barangay = 'Barangay is required';
    } else if (address.barangay.trim().length < 2) {
      errors.barangay = 'Barangay must be at least 2 characters';
    }
    
    if (!address.city.trim()) {
      errors.city = 'City is required';
    } else if (address.city.trim().length < 2) {
      errors.city = 'City must be at least 2 characters';
    }
    
    if (!address.state.trim()) {
      errors.state = 'State/Province is required';
    } else if (address.state.trim().length < 2) {
      errors.state = 'State/Province must be at least 2 characters';
    }
    
    if (!address.postalCode.trim()) {
      errors.postalCode = 'Postal code is required';
    } else if (!/^\d{4}$/.test(address.postalCode.trim())) {
      errors.postalCode = 'Postal code must be 4 digits';
    }

    if (!address.phone.trim()) {
      errors.phone = 'Recipient phone is required';
    } else if (!/^09\d{9}$/.test(address.phone.trim())) {
      errors.phone = 'Enter a valid PH mobile (11 digits starting with 09)';
    }
    
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressChange = (field, value) => {
    // Filter phone to digits only
    if (field === 'phone') {
      value = (value || '').replace(/\D/g, '').slice(0, 11);
    }
    setAddress(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (addressErrors[field]) {
      setAddressErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const submit = async e => {
    e.preventDefault();
    if (!confirm('Place order now?')) return;
    setError('');
    
    let shippingAddress;
    if (useNewAddress) {
      if (!validateAddress()) {
        setError('Please fix the address errors below');
        return;
      }
      shippingAddress = address;
    } else {
      const selected = savedAddresses.find(a => a.id == selectedAddressId);
      if (!selected) {
        setError('Please select a valid address');
        return;
      }
      if (!selected.phone) {
        setError('Saved address is missing a recipient phone. Please edit the address in Profile or enter a new address with phone.');
        // Optionally switch to new address form prefilled (for convenience)
        setUseNewAddress(true);
        setAddress(prev => ({
          ...prev,
          line1: selected.line1 || '',
          line2: selected.line2 || '',
          barangay: selected.barangay || '',
          city: selected.city || '',
          state: selected.state || '',
          postalCode: selected.postalCode || '',
          country: selected.country || 'Philippines',
          phone: ''
        }));
        return;
      }
      shippingAddress = selected; // This includes the ID
    }
    
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/orders/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ shippingAddress })
    });
    if (res.ok) {
      navigate('/orders');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Checkout failed');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '400px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              marginBottom: '20px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back
          </button>
          
          <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '24px', fontWeight: '600' }}>Shipping Information</h2>
            
            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#555', fontSize: '18px', fontWeight: '500' }}>Select Address</h3>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
                    <input 
                      type="radio"
                      name="addressOption"
                      checked={!useNewAddress}
                      onChange={() => setUseNewAddress(false)}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span>Use saved address</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
                    <input
                      type="radio"
                      name="addressOption"
                      checked={useNewAddress}
                      onChange={() => setUseNewAddress(true)}
                      style={{ transform: 'scale(1.2)' }}
                    />
                    <span>Use new address</span>
                  </label>
                </div>
                
                {!useNewAddress && (
                  <div style={{ marginBottom: '16px' }}>
                    <select
                      value={selectedAddressId}
                      onChange={e => setSelectedAddressId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ced4da',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select an address</option>
                      {savedAddresses.map(addr => (
                        <option key={addr.id} value={addr.id}>
                          {addr.line1}, {addr.barangay ? `${addr.barangay}, ` : ''}{addr.city}, {addr.state} {addr.postalCode}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {!useNewAddress && selectedAddressId && (
                  <div style={{ 
                    background: '#f8f9fa', 
                    border: '1px solid #e9ecef', 
                    borderRadius: '8px', 
                    padding: '16px',
                    marginTop: '12px'
                  }}>
                    {(() => {
                      const sel = savedAddresses.find(a => String(a.id) === String(selectedAddressId));
                      if (!sel) return null;
                      return (
                        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>{sel.line1}</div>
                          {sel.line2 && <div style={{ color: '#666', marginBottom: '4px' }}>{sel.line2}</div>}
                          {sel.barangay && <div style={{ color: '#666', marginBottom: '4px' }}>{sel.barangay}</div>}
                          <div style={{ color: '#666' }}>{sel.city}, {sel.state} {sel.postalCode}</div>
                          <div style={{ color: '#666' }}>{sel.country}</div>
                          {sel.phone && <div style={{ color: '#666' }}>📞 {sel.phone}</div>}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            
            {useNewAddress && (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                    Address Line 1 *
                  </label>
                  <input 
                    type="text"
                    placeholder="Street address, building, house number" 
                    value={address.line1} 
                    onChange={e => handleAddressChange('line1', e.target.value)}
                    onFocus={() => setFocusedField('line1')}
                    onBlur={() => setFocusedField('')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${addressErrors.line1 ? '#dc3545' : focusedField === 'line1' ? '#007bff' : '#ced4da'}`,
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  {addressErrors.line1 && (
                    <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                      {addressErrors.line1}
                    </div>
                  )}
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                    Address Line 2
                  </label>
                  <input 
                    type="text"
                    placeholder="Apartment, suite, unit, building, floor, etc." 
                    value={address.line2 || ''} 
                    onChange={e => handleAddressChange('line2', e.target.value)}
                    onFocus={() => setFocusedField('line2')}
                    onBlur={() => setFocusedField('')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${focusedField === 'line2' ? '#007bff' : '#ced4da'}`,
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                    Barangay *
                  </label>
                  <input 
                    type="text"
                    placeholder="Barangay"
                    value={address.barangay}
                    onChange={e => handleAddressChange('barangay', e.target.value)}
                    onFocus={() => setFocusedField('barangay')}
                    onBlur={() => setFocusedField('')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${addressErrors.barangay ? '#dc3545' : focusedField === 'barangay' ? '#007bff' : '#ced4da'}`,
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  {addressErrors.barangay && (
                    <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                      {addressErrors.barangay}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                      City *
                    </label>
                    <input 
                      type="text"
                      placeholder="City" 
                      value={address.city} 
                      onChange={e => handleAddressChange('city', e.target.value)}
                      onFocus={() => setFocusedField('city')}
                      onBlur={() => setFocusedField('')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${addressErrors.city ? '#dc3545' : focusedField === 'city' ? '#007bff' : '#ced4da'}`,
                        borderRadius: '8px',
                        fontSize: '16px',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                    {addressErrors.city && (
                      <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                        {addressErrors.city}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                      State/Province *
                    </label>
                    <input 
                      type="text"
                      placeholder="State or Province" 
                      value={address.state} 
                      onChange={e => handleAddressChange('state', e.target.value)}
                      onFocus={() => setFocusedField('state')}
                      onBlur={() => setFocusedField('')}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${addressErrors.state ? '#dc3545' : focusedField === 'state' ? '#007bff' : '#ced4da'}`,
                        borderRadius: '8px',
                        fontSize: '16px',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                    {addressErrors.state && (
                      <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                        {addressErrors.state}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                      Postal Code *
                    </label>
                    <input 
                      type="text"
                      placeholder="1234" 
                      value={address.postalCode} 
                      onChange={e => handleAddressChange('postalCode', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      onFocus={() => setFocusedField('postalCode')}
                      onBlur={() => setFocusedField('')}
                      maxLength="4"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${addressErrors.postalCode ? '#dc3545' : focusedField === 'postalCode' ? '#007bff' : '#ced4da'}`,
                        borderRadius: '8px',
                        fontSize: '16px',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                    {addressErrors.postalCode && (
                      <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                        {addressErrors.postalCode}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                      Country
                    </label>
                    <input 
                      type="text"
                      value={address.country} 
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                    Recipient Phone *
                  </label>
                  <input 
                    type="tel"
                    value={address.phone}
                    onChange={e => handleAddressChange('phone', e.target.value)}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField('')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${addressErrors.phone ? '#dc3545' : focusedField === 'phone' ? '#007bff' : '#ced4da'}`,
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  {addressErrors.phone && (
                    <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '4px' }}>
                      {addressErrors.phone}
                    </div>
                  )}
                </div>

              </form>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '24px', fontWeight: '600' }}>Payment Method</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '2px solid #28a745', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
              <input type="radio" name="payment" value="cod" defaultChecked style={{ transform: 'scale(1.2)' }} />
              <div style={{ fontSize: '24px' }}>💰</div>
              <label style={{ fontSize: '16px', fontWeight: '500', color: '#333', cursor: 'pointer' }}>
                Cash on Delivery (COD)
              </label>
            </div>
          </div>
        </div>

        <div style={{ flex: '0 0 400px' }}>
          <div style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '12px', padding: '24px', position: 'sticky', top: '20px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px', fontWeight: '600' }}>Order Summary</h3>
            
            {error && (
              <div style={{ 
                background: '#f8d7da', 
                color: '#721c24', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                border: '1px solid #f5c6cb'
              }}>
                {error}
              </div>
            )}
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '18px' }}>Loading items...</div>
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#666', marginBottom: '16px' }}>Your cart is empty.</p>
                <Link 
                  to="/catalog" 
                  style={{ 
                    color: '#007bff', 
                    textDecoration: 'none', 
                    fontWeight: '500',
                    padding: '8px 16px',
                    border: '1px solid #007bff',
                    borderRadius: '6px',
                    display: 'inline-block'
                  }}
                >
                  Browse products
                </Link>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {items.map(i => (
                  <div key={i.id} style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    padding: '12px 0', 
                    borderBottom: '1px solid #f0f0f0',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: '0 0 60px' }}>
                      <img 
                        src={getImageUrl(i.product?.product_images?.[0]?.url) || '/images/placeholder.svg'} 
                        alt={i.product?.name || 'Product'} 
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          objectFit: 'cover', 
                          borderRadius: '8px',
                          border: '1px solid #e9ecef'
                        }}
                      />
                    </div>
                    <div style={{ flex: '1', minWidth: '0' }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px', fontSize: '14px', lineHeight: '1.3' }}>
                        {i.product?.name}
                      </div>
                      <div style={{ color: '#666', fontSize: '13px', marginBottom: '2px' }}>
                        ₱{Number(i.product?.price || 0).toFixed(2)} each
                      </div>
                      <div style={{ color: '#666', fontSize: '13px' }}>
                        Qty: {i.quantity}
                      </div>
                    </div>
                    <div style={{ flex: '0 0 auto', fontWeight: '600', color: '#333' }}>
                      ₱{(Number(i.product?.price || 0) * i.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {(() => {
              const subtotal = items.reduce((s, i) => s + Number(i.product?.price || 0) * i.quantity, 0);
              const shipping = 0;
              const total = subtotal + shipping;
              return (
                <div style={{ borderTop: '2px solid #e9ecef', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#666' }}>Subtotal:</span>
                    <span style={{ fontWeight: '500' }}>₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#666' }}>Shipping:</span>
                    <span style={{ fontWeight: '500' }}>₱{shipping.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                    <span>Total:</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
            
            <button 
              onClick={submit}
              disabled={loading || items.length === 0 || (!useNewAddress ? !selectedAddressId : (!address.line1 || !address.city || !address.state || !address.postalCode || !address.phone))}
              style={{
                width: '100%',
                padding: '16px',
                background: loading || items.length === 0 || (!useNewAddress ? !selectedAddressId : (!address.line1 || !address.city || !address.state || !address.postalCode || !address.phone)) ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || items.length === 0 || (!useNewAddress ? !selectedAddressId : (!address.line1 || !address.city || !address.state || !address.postalCode || !address.phone)) ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            >
              {loading ? 'Processing...' : 'Place Order (COD)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


