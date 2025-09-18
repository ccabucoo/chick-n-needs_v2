import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Profile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [newAddress, setNewAddress] = useState({ line1: '', line2: '', barangay: '', city: '', state: '', postalCode: '', country: 'Philippines' });
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [changing, setChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile`, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(r => r.json())
      .then(data => {
        if (data.message) {
          setError(data.message);
        } else {
          setData(data);
          // Keep name fields empty so inputs show only placeholders
          setForm({ firstName: '', lastName: '', phone: data.phone || '' });
        }
      })
      .catch(err => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <div>
        <h2>Please log in</h2>
        <p>Please log in to view your profile</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }

  if (loading) return (
    <div>
      <div></div>
      <p>Loading profile...</p>
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
        <h1>My Profile</h1>
        <div>
          <div>
            <label>Email</label>
            <p>{data.email}</p>
          </div>
          <div>
            <button
              onClick={async () => {
                setPwMsg('');
                setChanging(true);
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: data.email })
                  });
                  const d = await res.json().catch(() => ({}));
                  if (res.ok) {
                    setResetEmailSent(true);
                    setPwMsg(d.message || 'If an account exists, a reset email was sent.');
                    setTimeout(() => setResetEmailSent(false), 5000);
                  } else {
                    setPwMsg(d.message || `Server error (${res.status})`);
                  }
                } catch (err) {
                  setPwMsg('Network error: ' + (err?.message || 'Request failed'));
                } finally {
                  setChanging(false);
                }
              }}
              disabled={changing}
            >{changing ? 'Sending...' : 'Send password reset email'}</button>
            {resetEmailSent && <div>Reset email sent. Please check your inbox.</div>}
            {pwMsg && <div>{pwMsg}</div>}
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phone: form.phone })
              });
              const updated = await res.json();
              if (res.ok) {
                setData(updated);
              }
            } finally {
              setSaving(false);
            }
          }}>
            <div>
              <label>First Name</label>
              <input
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="First Name"
              />
            </div>
            <div>
              <label>Last Name</label>
              <input
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Last Name"
              />
            </div>
            <div>
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
              />
            </div>
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </div>
      </div>
      
      <div>
        <h2>Addresses</h2>
        {data.addresses && data.addresses.length > 0 ? (
          <div>
            {data.addresses.map(a => (
              <div key={a.id}>
                <div>{a.line1}</div>
                <div>{a.barangay ? `${a.barangay}, ` : ''}{a.city}</div>
                <div>{a.state} {a.postalCode}</div>
                <div>{a.country}</div>
                <div>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this address?')) return;
                      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile/addresses/${a.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      // reload profile
                      setLoading(true);
                      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.json())
                        .then(setData)
                        .finally(() => setLoading(false));
                    }}
                  >Remove</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p>No addresses added</p>
          </div>
        )}

        <h3>Add New Address</h3>
        {data.addresses && data.addresses.length >= 2 ? (
          <div>
            <p>You can only save up to 2 addresses. Please remove one to add another.</p>
          </div>
        ) : (
        <form onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile/addresses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(newAddress)
          });
          if (res.ok) {
            // refresh list
            setNewAddress({ line1: '', line2: '', barangay: '', city: '', state: '', postalCode: '', country: 'Philippines' });
            setLoading(true);
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(setData)
              .finally(() => setLoading(false));
          } else {
            const data = await res.json().catch(() => ({}));
            alert(data.message || 'Failed to add address');
          }
        }}>
          <div>
            <label>Address Line 1</label>
            <input value={newAddress.line1} onChange={e => setNewAddress(v => ({ ...v, line1: e.target.value }))} required />
          </div>
          <div>
            <label>Address Line 2</label>
            <input value={newAddress.line2} onChange={e => setNewAddress(v => ({ ...v, line2: e.target.value }))} />
          </div>
          <div>
            <label>Barangay</label>
            <input value={newAddress.barangay} onChange={e => setNewAddress(v => ({ ...v, barangay: e.target.value }))} required />
          </div>
          <div>
            <label>City</label>
            <input value={newAddress.city} onChange={e => setNewAddress(v => ({ ...v, city: e.target.value }))} required />
          </div>
          <div>
            <label>State/Province</label>
            <input value={newAddress.state} onChange={e => setNewAddress(v => ({ ...v, state: e.target.value }))} />
          </div>
          <div>
            <label>Postal Code</label>
            <input value={newAddress.postalCode} onChange={e => setNewAddress(v => ({ ...v, postalCode: e.target.value }))} />
          </div>
          <div>
            <label>Country</label>
            <input value={newAddress.country} onChange={e => setNewAddress(v => ({ ...v, country: e.target.value }))} />
          </div>
          <button type="submit">Add Address</button>
        </form>
        )}
      </div>
    </div>
  );
}


