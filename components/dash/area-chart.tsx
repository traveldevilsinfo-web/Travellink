/** Server-rendered area chart drawn to one scale (labels = values the data reaches). */
export function AreaChart({ series, from, to, label, color = '#FF5A1F', height = 140, format = (n: number) => n.toLocaleString('en-IN') }: {
  series: number[]; from: string; to: string; label: string; color?: string; height?: number; format?: (n: number) => string
}) {
  const W = 640, H = height
  const max = Math.max(1, ...series)
  const pts = series.length > 1 ? series : [0, ...series]
  const x = (i: number) => (i / (pts.length - 1)) * W
  const y = (v: number) => H - 6 - (v / max) * (H - 18)
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const id = `ac${color.slice(1)}`
  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 26}`} className="block h-auto w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[max / 2, max].map((t) => (
        <g key={t}>
          <line x1="0" x2={W} y1={y(t)} y2={y(t)} stroke="#E0E6E4" strokeDasharray="3 5" />
          <text x={W} y={y(t) - 5} fontSize="12" fill="#6C7875" textAnchor="end">{format(t)}</text>
        </g>
      ))}
      <path d={`${line}L${W},${H}L0,${H}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1]!)} r="5" fill={color} stroke="#fff" strokeWidth="2.5" />
      <text x="0" y={H + 18} fontSize="12" fill="#6C7875">{from}</text>
      <text x={W} y={H + 18} fontSize="12" fill="#6C7875" textAnchor="end">{to}</text>
    </svg>
  )
}
