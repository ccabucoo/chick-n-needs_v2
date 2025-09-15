import { useState } from 'react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setStatus('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus('Please fill in name, email and message.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/contact`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), subject: subject.trim(), orderNo: orderNo.trim() }) 
      });
      setStatus(res.ok ? 'Thanks! We received your message.' : 'Failed to send. Please try again.');
      if (res.ok) {
        setName(''); setEmail(''); setSubject(''); setMessage(''); setOrderNo('');
      }
    } catch {
      setStatus('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Contact Chick'N Needs Support</h1>
      <p>We typically reply within 24 hours. For urgent delivery issues, please include your order number.</p>
      <div style={{ margin: '16px 0' }}>
        <div>Email: support@chicknneeds.local</div>
        <div>Phone: +63 900 000 0000</div>
        <div>Hours: Mon–Sat, 9:00–18:00 (PHT)</div>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: '12px' }}>
        <input 
          aria-label="Your Name"
          placeholder="Your Name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required
        />
        <input 
          aria-label="Your Email"
          placeholder="Your Email" 
          type="email"
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required
        />
        <input 
          aria-label="Subject"
          placeholder="Subject (optional)" 
          value={subject} 
          onChange={e => setSubject(e.target.value)} 
        />
        <input 
          aria-label="Order Number"
          placeholder="Order Number (optional)" 
          value={orderNo} 
          onChange={e => setOrderNo(e.target.value)} 
        />
        <textarea 
          aria-label="Message"
          placeholder="How can we help you?" 
          rows="5"
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          required
        />
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" required /> I consent to be contacted about my inquiry.
          </label>
        </div>
        <button disabled={loading}>{loading ? 'Sending...' : 'Send Message'}</button>
        {status && <div>{status}</div>}
      </form>

      
    </div>
  );
}


