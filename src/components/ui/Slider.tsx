import { cn } from '@/lib/utils'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

export default function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#e0e0e0]">{label}</span>
        <span className="text-[#00f0ff] font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer',
          'bg-[#2d2d44]',
        )}
        style={{
          background: `linear-gradient(to right, #00f0ff ${percentage}%, #2d2d44 ${percentage}%)`,
        }}
      />
    </div>
  )
}
