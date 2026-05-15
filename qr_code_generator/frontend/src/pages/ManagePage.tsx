import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError,
  deleteQR,
  getQR,
  shortUrlPath,
  updateQR,
} from '../api/client'
import {
  MetadataForm,
  expiresAtToIsoOrNull,
  type MetadataFormValues,
} from '../components/MetadataForm'
import { Button } from '../components/Button'
import { CopyButton } from '../components/CopyButton'
import { ErrorBanner } from '../components/ErrorBanner'
import { Loading } from '../components/Loading'
import { QRImage } from '../components/QRImage'
import type { QRInfo } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: QRInfo }

export function ManagePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [formError, setFormError] = useState<string | null>(null)
  const [imageVersion, setImageVersion] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState({ status: 'loading' })
    getQR(token)
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof ApiError ? err.detail : 'Failed to load QR code'
        setState({ status: 'error', error: msg })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return <ErrorBanner message="No token in URL." />
  }

  async function handleUpdate(values: MetadataFormValues) {
    if (!token) return
    setFormError(null)
    try {
      const body: { url?: string; expires_at?: string | null } = {}
      if (values.url) body.url = values.url
      body.expires_at = expiresAtToIsoOrNull(values.expires_at)
      const updated = await updateQR(token, body)
      setState({ status: 'success', data: updated })
      setImageVersion((v) => v + 1)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : 'Update failed')
    }
  }

  async function handleDelete() {
    if (!token) return
    if (!confirm('Delete this QR code? Existing scans will start returning 410 Gone.')) {
      return
    }
    setDeleting(true)
    setFormError(null)
    try {
      await deleteQR(token)
      navigate('/qr')
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Manage QR code</h1>
          <p className="text-sm text-slate-600 mt-1 font-mono">{token}</p>
        </div>
        <Link
          to={`/qr/${token}/analytics`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          View analytics →
        </Link>
      </header>

      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && <ErrorBanner message={state.error} />}
      {state.status === 'success' && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">QR code</h2>
            <QRImage token={token} refreshKey={imageVersion} />
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all text-xs bg-slate-100 rounded px-2 py-1">
                {window.location.origin}
                {shortUrlPath(token)}
              </code>
              <CopyButton value={`${window.location.origin}${shortUrlPath(token)}`} />
            </div>
            <a
              href={shortUrlPath(token)}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Open short URL ↗
            </a>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Edit metadata</h2>
            <Meta label="Created" value={new Date(state.data.created_at).toLocaleString()} />
            <Meta label="Updated" value={new Date(state.data.updated_at).toLocaleString()} />
            {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
            <MetadataForm
              key={`${state.data.token}-${state.data.updated_at}`}
              initialUrl={state.data.original_url}
              initialExpiresAt={state.data.expires_at}
              submitLabel="Save changes"
              submittingLabel="Saving…"
              onSubmit={handleUpdate}
            />
            <div className="pt-4 border-t border-slate-200">
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete QR code'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  )
}
