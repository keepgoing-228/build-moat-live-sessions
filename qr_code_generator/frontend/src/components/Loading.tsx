type Props = {
  label?: string
}

export function Loading({ label = 'Loading…' }: Props) {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
      <span className="inline-block h-3 w-3 rounded-full bg-indigo-400 animate-pulse" />
      <span>{label}</span>
    </div>
  )
}
