async function request(path, options = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  sessions: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request('/sessions' + (q ? '?' + q : ''));
  },
  summary: () => request('/sessions/summary'),
  createSession: (body) => request('/sessions', { method: 'POST', body }),
  setReviewed: (id, mistakesReviewed) => request(`/sessions/${id}/reviewed`, { method: 'PATCH', body: { mistakesReviewed } }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
};
