export type QRInfo = {
  token: string
  original_url: string
  created_at: string
  updated_at: string
  expires_at: string | null
  is_deleted: boolean
}

export type CreateResponse = {
  token: string
  short_url: string
  qr_code_url: string
  original_url: string
}

export type DayCount = {
  date: string
  count: number
}

export type Analytics = {
  token: string
  total_scans: number
  scans_by_day: DayCount[]
}

export type QRList = {
  items: QRInfo[]
  total: number
  limit: number
  offset: number
}

export type CreateBody = {
  url: string
  expires_at?: string | null
}

export type UpdateBody = {
  url?: string | null
  expires_at?: string | null
}
