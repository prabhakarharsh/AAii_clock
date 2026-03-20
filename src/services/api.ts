const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  
  const data = await res.json()
  if (!data.success) throw new Error(data.error)
  return data
}
