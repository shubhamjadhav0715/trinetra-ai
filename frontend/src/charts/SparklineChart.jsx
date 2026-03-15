function SparklineChart({ points = [] }) {
  if (!points.length) {
    return <p className="text-sm text-slate-500">No chart data available.</p>
  }

  const width = 500
  const height = 160
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)

  const path = points
    .map((point, index) => {
      const x = index * step
      const y = height - ((point - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
      <polyline fill="none" stroke="#14b8a6" strokeWidth="3" points={path} />
    </svg>
  )
}

export default SparklineChart
