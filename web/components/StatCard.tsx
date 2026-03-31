interface StatCardProps {
  label: string
  value: string
  sub?: string
  color?: 'default' | 'green' | 'red' | 'blue' | 'yellow'
}

const colorMap = {
  default: 'bg-white border-slate-200 text-slate-900',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
}

export default function StatCard({ label, value, sub, color = 'default' }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-60 truncate">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60 truncate">{sub}</p>}
    </div>
  )
}
