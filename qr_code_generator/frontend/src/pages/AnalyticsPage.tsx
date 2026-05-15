import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getAnalytics } from '../api/client'
import { ErrorBanner } from '../components/ErrorBanner'
import { Loading } from '../components/Loading'
import { ScansChart } from '../components/ScansChart'
import type { Analytics } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: Analytics }

export function AnalyticsPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState({ status: 'loading' })
    getAnalytics(token)
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof ApiError ? err.detail : 'Failed to load analytics'
        setState({ status: 'error', error: msg })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) return <ErrorBanner message="No token in URL." />

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-600 mt-1 font-mono">{token}</p>
        </div>
        <Link
          to={`/qr/${token}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Back to manage
        </Link>
      </header>

      {state.status === 'loading' && <Loading label="Loading analytics…" />}
      {state.status === 'error' && <ErrorBanner message={state.error} />}
      {state.status === 'success' && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total scans
            </p>
            <p className="text-4xl font-semibold text-slate-900 mt-1">
              {state.data.total_scans}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Scans by day
            </h2>
            <ScansChart data={state.data.scans_by_day} />
          </div>
        </>
      )}
    </div>
  )
}
