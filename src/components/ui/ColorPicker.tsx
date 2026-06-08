import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  label: string
  color: [number, number, number]
  alpha: number
  onChange: (color: [number, number, number], alpha: number) => void
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
  )
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return null
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
}

export default function ColorPicker({ label, color, alpha, onChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(rgbToHex(...color))
  const [hexFocused, setHexFocused] = useState(false)

  const hex = rgbToHex(...color)
  const alphaPercentage = Math.round(alpha * 100)

  const handleColorInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = hexToRgb(e.target.value)
      if (newColor) {
        onChange(newColor, alpha)
      }
    },
    [alpha, onChange],
  )

  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHexInput(e.target.value)
  }, [])

  const handleHexCommit = useCallback(() => {
    setHexFocused(false)
    const newColor = hexToRgb(hexInput)
    if (newColor) {
      onChange(newColor, alpha)
    } else {
      setHexInput(hex)
    }
  }, [hexInput, alpha, hex, onChange])

  const handleAlphaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(color, Number(e.target.value))
    },
    [color, onChange],
  )

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[#e0e0e0]">{label}</span>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div
            className="w-7 h-7 rounded border border-[#2d2d44] cursor-pointer"
            style={{
              backgroundColor: `rgba(${color[0]},${color[1]},${color[2]},${alpha})`,
            }}
          />
          <input
            type="color"
            value={hex}
            onChange={handleColorInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={hexFocused ? hexInput : hex}
          onChange={handleHexChange}
          onFocus={() => {
            setHexFocused(true)
            setHexInput(hex)
          }}
          onBlur={handleHexCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleHexCommit()
          }}
          className={cn(
            'w-20 px-1 py-0.5 text-xs font-mono rounded bg-[#1a1a2e] border text-[#e0e0e0] outline-none transition-colors',
            hexFocused ? 'border-[#00f0ff]' : 'border-[#2d2d44]',
          )}
        />
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[10px] text-[#e0e0e0]/60">A</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={alpha}
            onChange={handleAlphaChange}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-[#2d2d44]"
            style={{
              background: `linear-gradient(to right, #00f0ff ${alphaPercentage}%, #2d2d44 ${alphaPercentage}%)`,
            }}
          />
          <span className="text-[10px] text-[#00f0ff] font-mono w-7 text-right">{alphaPercentage}%</span>
        </div>
      </div>
    </div>
  )
}
