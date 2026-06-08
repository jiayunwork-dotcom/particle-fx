import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

export default function Select({ label, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <span className="text-xs text-[#e0e0e0]">{label}</span>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex items-center justify-between w-full px-2 py-1 text-xs rounded',
            'bg-[#2d2d44] text-[#e0e0e0] border border-transparent',
            'hover:border-[#00f0ff] transition-colors',
            open && 'border-[#00f0ff]',
          )}
        >
          <span>{selectedOption?.label ?? ''}</span>
          <ChevronDown
            size={12}
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded bg-[#2d2d44] border border-[#00f0ff]/30 shadow-lg overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'w-full px-2 py-1 text-left text-xs transition-colors',
                  option.value === value
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                    : 'text-[#e0e0e0] hover:bg-[#1a1a2e]',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
