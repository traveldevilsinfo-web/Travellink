export function JoinProgress({ step, of = 4 }: { step: number; of?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-ink-3">Step {step} of {of}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-subtle-2" aria-hidden><i className="block h-full rounded-full bg-brand" style={{ width: `${(step / of) * 100}%` }} /></div>
    </div>
  )
}
