const BASE_URL = 
  import.meta.env.VITE_API_URL || 
  'http://localhost:3001/api'

export async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
) {
  try {
    const res = await fetch(
      `${BASE_URL}${endpoint}`,
      {
        method,
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: body ? JSON.stringify(body) : undefined
      }
    )
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`)
    }
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'API Error')
    }
    return data
  } catch (err) {
    console.error('API Error:', err)
    throw err
  }
}
