import type {
  Analytics,
  CreateBody,
  CreateResponse,
  QRInfo,
  QRList,
  UpdateBody,
} from '../types'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (body && typeof body.detail === 'string') {
        detail = body.detail
      } else if (body) {
        detail = JSON.stringify(body)
      }
    } catch {
      // body wasn't JSON; keep statusText
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export function listQR(limit = 20, offset = 0): Promise<QRList> {
  return request<QRList>(`/api/qr?limit=${limit}&offset=${offset}`)
}

export function createQR(body: CreateBody): Promise<CreateResponse> {
  return request<CreateResponse>('/api/qr/create', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getQR(token: string): Promise<QRInfo> {
  return request<QRInfo>(`/api/qr/${token}`)
}

export function updateQR(token: string, body: UpdateBody): Promise<QRInfo> {
  return request<QRInfo>(`/api/qr/${token}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteQR(token: string): Promise<void> {
  return request<void>(`/api/qr/${token}`, { method: 'DELETE' })
}

export function getAnalytics(token: string): Promise<Analytics> {
  return request<Analytics>(`/api/qr/${token}/analytics`)
}

export function qrImageUrl(token: string): string {
  return `/api/qr/${token}/image`
}

export function shortUrlPath(token: string): string {
  return `/r/${token}`
}
