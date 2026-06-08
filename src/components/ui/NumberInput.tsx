import { useCallback, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  unit?: string
}

export default function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
}: NumberInputProps) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))
  const [hovering, setHovering] = useState(false)
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null)

  const clamp = useCallback(
    (v: number) => {
      let result = v
      if (min !== undefined) result = Math.max(min, result)
      if (max !== undefined) result = Math.min(max, result)
      return result
    },
    [min, max],
  )

  const commitEdit = useCallback(() => {
    setEditing(false)
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) {
      onChange(clamp(Math.round(parsed / step) * step))
    }
  }, [inputValue, clamp, step, onChange])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editing) return
      dragRef.current = { startX: e.clientX, startValue: value }
      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const delta = ev.clientX - dragRef.current.startX
        const sensitivity = ev.shiftKey ? 0.1 : 1
        const newValue = clamp(dragRef.current.startValue + delta * sensitivity * step)
        onChange(newValue)
      }
      const handleMouseUp = () => {
        dragRef.current = null
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [editing, value, step, clamp, onChange],
  )

  const stepUp = useCallback(() => {
    onChange(clamp(value + step))
  }, [value, step, clamp, onChange])

  const stepDown = useCallback(() => {
    onChange(clamp(value - step))
  }, [value, step, clamp, onChange])

  const displayValue = unit ? `${value}${unit}` : String(value)

  return (
    <div
      className="flex flex-col gap-1"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#e0e0e0]">{label}</span>
        <div className="flex items-center gap-0.5">
          {hovering && !editing && (
            <button
              onClick={stepDown}
              className="flex items-center justify-center w-4 h-4 rounded bg-[#2d2d44] text-[#e0e0e0] hover:text-[#00f0ff] transition-colors"
            >
              <Minus size={10} />
            </button>
          )}
          {editing ? (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus
              className="w-16 px-1 py-0 text-xs text-right font-mono bg-[#1a1a2e] border border-[#00f0ff] rounded text-[#00f0ff] outline-none"
            />
          ) : (
            <span
              className="font-mono text-[#00f0ff] cursor-ew-resize select-none"
              onDoubleClick={() => {
                setInputValue(String(value))
                setEditing(true)
              }}
              onMouseDown={handleMouseDown}
            >
              {displayValue}
            </span>
          )}
          {hovering && !editing && (
            <button
              onClick={stepUp}
              className="flex items-center justify-center w-4 h-4 rounded bg-[#2d2d44] text-[#e0e0e0] hover:text-[#00f0ff] transition-colors"
            >
              <Plus size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
