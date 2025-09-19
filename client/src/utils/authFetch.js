// Auth-aware fetch with automatic refresh and retry

function getApiBase() {
  try {
    // Vite provides import.meta.env in the browser build
    const fromEnv = import.meta && import.meta.env && import.meta.env.VITE_API_URL;
    return fromEnv || 'https://api.chicknneeds.shop';
  } catch (e) {
    return 'https://api.chicknneeds.shop';
  }
}

const API_BASE = getApiBase();

function getStoredToken() {
  const raw = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  return raw && raw !== 'undefined' ? raw : '';
}

function setStoredToken(token) {
  if (typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }
}

export async function authFetch(input, init = {}) {
  const token = getStoredToken();
  const headers = { ...(init.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const doFetch = async () => fetch(input, { ...init, headers, credentials: 'include' });

  let res = await doFetch();
  if (res.status !== 401) return res;

  // Attempt refresh
  const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!refreshRes.ok) {
    // Clear token and bubble up 401
    setStoredToken('');
    return res;
  }

  const data = await refreshRes.json();
  if (data && data.token) {
    setStoredToken(data.token);
    headers.Authorization = `Bearer ${data.token}`;
    res = await doFetch();
  }
  return res;
}


