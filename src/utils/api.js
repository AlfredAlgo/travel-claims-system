function getToken() {
  return localStorage.getItem('gpg_token');
}

async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach the server. Run: npm run dev');
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error('API server is not running. Run: npm run dev');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getClaims: ()                         => apiFetch('/api/claims'),
  createClaim: (claim)                  => apiFetch('/api/claims', { method: 'POST', body: JSON.stringify(claim) }),
  updateStatus: (ref, status, extra={}) => apiFetch(`/api/claims/${ref}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...extra }),
  }),
};
