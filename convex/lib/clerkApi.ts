const API = 'https://api.clerk.com/v1'

export async function clerk<T>(path: string, method = 'GET', body?: unknown) {
  const key = process.env.CLERK_SECRET_KEY
  if (!key) throw new Error('CLERK_SECRET_KEY missing')
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 204) return undefined as T
  const text = await response.text()
  if (!response.ok) throw new Error(text || response.statusText)
  return (text ? JSON.parse(text) : undefined) as T
}
