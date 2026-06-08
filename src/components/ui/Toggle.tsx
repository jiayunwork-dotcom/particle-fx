import { cn } from '@/lib/utils'

interface ToggleProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export default function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#e0e0e0]">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-8 h-4 rounded-full transition-colors',
          value ? 'bg-[#00f0ff]/40' : 'bg-[#2d2d44]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-all',
            value ? 'translate-x-4 bg-[#00f0ff]' : 'translate-x-0 bg-[#555]',
          )}
        />
      </button>
    </div>
  )
}
