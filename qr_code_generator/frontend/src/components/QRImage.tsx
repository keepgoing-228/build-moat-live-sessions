import { qrImageUrl } from '../api/client'

type Props = {
  token: string
  size?: number
  refreshKey?: string | number
}

export function QRImage({ token, size = 240, refreshKey }: Props) {
  const src = refreshKey === undefined
    ? qrImageUrl(token)
    : `${qrImageUrl(token)}?v=${refreshKey}`
  return (
    <img
      src={src}
      alt={`QR code for ${token}`}
      width={size}
      height={size}
      className="rounded-md border border-slate-200 bg-white p-2"
    />
  )
}
