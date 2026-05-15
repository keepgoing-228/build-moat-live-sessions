import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, createQR, shortUrlPath } from '../api/client'
import {
  MetadataForm,
  expiresAtToIsoOrNull,
  type MetadataFormValues,
} from '../components/MetadataForm'
import { CopyButton } from '../components/CopyButton'
import { QRImage } from '../components/QRImage'
import { ErrorBanner } from '../components/ErrorBanner'
import type { CreateResponse } from '../types'

export function CreatePage() {
  const [result, setResult] = useState<CreateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(values: MetadataFormValues) {
    setError(null)
    try {
      const res = await createQR({
        url: values.url,
        expires_at: expiresAtToIsoOrNull(values.expires_at),
      })
      setResult(res)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError('Unexpected error creating QR code')
      }
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Create a QR code</h1>
        <p className="text-sm text-slate-600 mt-1">
          Enter a URL and we&apos;ll generate a short link and a scannable QR code.
        </p>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <MetadataForm
          submitLabel="Generate QR code"
          submittingLabel="Generating…"
          urlRequired
          onSubmit={handleSubmit}
        />
      </div>

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Your QR code</h2>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <QRImage token={result.token} />
            <div className="flex-1 space-y-3">
              <Field label="Token" value={result.token} mono />
              <Field label="Short URL" value={result.short_url} mono copyable />
              <Field label="Target URL" value={result.original_url} />
              <div className="pt-2 flex gap-3">
                <Link
                  to={`/qr/${result.token}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Manage →
                </Link>
                <a
                  href={shortUrlPath(result.token)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Open short URL ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type FieldProps = {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}

function Field({ label, value, mono, copyable }: FieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        <p
          className={`flex-1 break-all text-sm ${mono ? 'font-mono' : ''} text-slate-900`}
        >
          {value}
        </p>
        {copyable && <CopyButton value={value} />}
      </div>
    </div>
  )
}
