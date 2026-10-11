export class ApiError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api/desk/' + path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : method === 'POST' ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : method === 'POST' ? '{}' : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.message || 'Something went wrong.', data.error)
  return data
}
