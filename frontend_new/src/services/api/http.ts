import { env } from '@/config/env'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryParams = Record<string, string | number | undefined>

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: QueryParams
}

function buildUrl(path: string, query?: QueryParams) {
  const url = new URL(path, env.apiUrl)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url
}

/** Envoltura mínima sobre fetch: JSON in/out y errores tipados. */
export async function http<T>(
  path: string,
  { body, query, headers, ...init }: RequestOptions = {},
) {
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new ApiError(response.status, message || response.statusText)
  }

  return (await response.json()) as T
}
