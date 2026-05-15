import { useState, type FormEvent } from 'react'
import { Button } from './Button'

export type MetadataFormValues = {
  url: string
  expires_at: string
}

type Props = {
  initialUrl?: string
  initialExpiresAt?: string | null
  submitLabel: string
  submittingLabel?: string
  urlRequired?: boolean
  onSubmit: (values: MetadataFormValues) => Promise<void>
}

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function MetadataForm({
  initialUrl = '',
  initialExpiresAt = null,
  submitLabel,
  submittingLabel,
  urlRequired = false,
  onSubmit,
}: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [expiresAt, setExpiresAt] = useState(toLocalDatetimeInput(initialExpiresAt))
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({ url, expires_at: expiresAt })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="url" className="block text-sm font-medium text-slate-700">
          Target URL{urlRequired && <span className="text-red-600"> *</span>}
        </label>
        <input
          id="url"
          type="url"
          required={urlRequired}
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="expires_at" className="block text-sm font-medium text-slate-700">
          Expires at <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="expires_at"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? (submittingLabel ?? 'Saving…') : submitLabel}
      </Button>
    </form>
  )
}

export function expiresAtToIsoOrNull(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
