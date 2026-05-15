import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, listQR } from '../api/client'
import { Loading } from '../components/Loading'
import { ErrorBanner } from '../components/ErrorBanner'
import { Button } from '../components/Button'
import type { QRList } from '../types'

const PAGE_SIZE = 20

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: QRList }

export function ListPage() {
  const [offset, setOffset] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    listQR(PAGE_SIZE, offset)
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof ApiError ? err.detail : 'Failed to load list'
        setState({ status: 'error', error: msg })
      })
    return () => {
      cancelled = true
    }
  }, [offset])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">My QR codes</h1>
        <p className="text-sm text-slate-600 mt-1">
          All QR codes in the database (newest first). Soft-deleted entries are hidden.
        </p>
      </header>

      {state.status === 'loading' && <Loading label="Loading QR codes…" />}
      {state.status === 'error' && <ErrorBanner message={state.error} />}
      {state.status === 'success' && (
        <>
          {state.data.total === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No QR codes yet —{' '}
              <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
                create one
              </Link>
              .
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Token</Th>
                      <Th>Target URL</Th>
                      <Th>Created</Th>
                      <Th>Expires</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {state.data.items.map((item) => (
                      <tr key={item.token}>
                        <Td mono>{item.token}</Td>
                        <Td truncate>{item.original_url}</Td>
                        <Td>{formatDate(item.created_at)}</Td>
                        <Td>{item.expires_at ? formatDate(item.expires_at) : '—'}</Td>
                        <Td>
                          <Link
                            to={`/qr/${item.token}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Manage
                          </Link>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                offset={offset}
                limit={PAGE_SIZE}
                total={state.data.total}
                onChange={setOffset}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
    >
      {children}
    </th>
  )
}

function Td({
  children,
  mono,
  truncate,
}: {
  children: React.ReactNode
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <td
      className={`px-4 py-3 text-sm text-slate-700 ${mono ? 'font-mono' : ''} ${
        truncate ? 'max-w-xs truncate' : ''
      }`}
    >
      {children}
    </td>
  )
}

type PaginationProps = {
  offset: number
  limit: number
  total: number
  onChange: (offset: number) => void
}

function Pagination({ offset, limit, total, onChange }: PaginationProps) {
  const start = total === 0 ? 0 : offset + 1
  const end = Math.min(offset + limit, total)
  const canPrev = offset > 0
  const canNext = offset + limit < total

  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <span>
        Showing <strong>{start}</strong>–<strong>{end}</strong> of{' '}
        <strong>{total}</strong>
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={!canPrev}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          ← Prev
        </Button>
        <Button
          variant="secondary"
          disabled={!canNext}
          onClick={() => onChange(offset + limit)}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
