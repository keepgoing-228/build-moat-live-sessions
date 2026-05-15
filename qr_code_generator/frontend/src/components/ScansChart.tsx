import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DayCount } from '../types'

type Props = {
  data: DayCount[]
}

export function ScansChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No scans recorded yet — scan the QR code to see data here.
      </p>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475569' }} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#475569' }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            labelStyle={{ color: '#0f172a' }}
          />
          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
