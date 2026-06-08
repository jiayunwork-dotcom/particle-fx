import { useCallback, useRef, useState } from 'react'
import type { GradientStop } from '@/types/particle'

interface GradientEditorProps {
  value: GradientStop[]
  onChange: (stops: GradientStop[]) => void
  label?: string
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function fromHex(hex: string): [number, number, number] {
  const match = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return [1, 1, 1]
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255]
}

function interpolateColor(stops: GradientStop[], t: number): [number, number, number] {
  if (stops.length === 0) return [1, 1, 1]
  if (stops.length === 1) return stops[0].color
  if (t <= stops[0].time) return stops[0].color
  if (t >= stops[stops.length - 1].time) return stops[stops.length - 1].color

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].time && t <= stops[i + 1].time) {
      const range = stops[i + 1].time - stops[i].time
      const frac = range === 0 ? 0 : (t - stops[i].time) / range
      return [
        stops[i].color[0] + (stops[i + 1].color[0] - stops[i].color[0]) * frac,
        stops[i].color[1] + (stops[i + 1].color[1] - stops[i].color[1]) * frac,
        stops[i].color[2] + (stops[i + 1].color[2] - stops[i].color[2]) * frac,
      ]
    }
  }
  return stops[stops.length - 1].color
}

export default function GradientEditor({ value, onChange, label }: GradientEditorProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const sortedStops = [...value].sort((a, b) => a.time - b.time)

  const gradientCSS = sortedStops
    .map(
      (s) =>
        `rgba(${Math.round(s.color[0] * 255)},${Math.round(s.color[1] * 255)},${Math.round(s.color[2] * 255)},${s.alpha}) ${s.time * 100}%`,
    )
    .join(', ')

  const getBarPosition = useCallback((clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect()
    return clamp((clientX - rect.left) / rect.width, 0, 1)
  }, [])

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return
      const t = getBarPosition(e.clientX)
      const color = interpolateColor(value, t)
      const alpha = 1
      const newStop: GradientStop = { time: t, color, alpha }
      const newStops = [...value, newStop].sort((a, b) => a.time - b.time)
      const newIdx = newStops.findIndex((s) => s === newStop)
      onChange(newStops)
      setSelectedIndex(newIdx)
    },
    [value, onChange, getBarPosition, dragging],
  )

  const handleMarkerMouseDown = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.stopPropagation()
      e.preventDefault()
      setSelectedIndex(idx)
      dragIndex.current = idx
      setDragging(true)
    },
    [],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragging || dragIndex.current === null) return
      const t = getBarPosition(e.clientX)
      const stops = [...value]
      const idx = dragIndex.current
      const stop = { ...stops[idx] }
      stop.time = clamp(t, 0, 1)
      if (idx > 0) stop.time = Math.max(stop.time, stops[idx - 1].time + 0.001)
      if (idx < stops.length - 1) stop.time = Math.min(stop.time, stops[idx + 1].time - 0.001)
      stops[idx] = stop
      onChange(stops)
    },
    [dragging, value, onChange, getBarPosition],
  )

  const handleMouseUp = useCallback(() => {
    setDragging(false)
    dragIndex.current = null
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault()
      e.stopPropagation()
      if (value.length > 2) {
        const newStops = value.filter((_, i) => i !== idx)
        onChange(newStops)
        if (selectedIndex === idx) setSelectedIndex(null)
        else if (selectedIndex !== null && selectedIndex > idx) setSelectedIndex(selectedIndex - 1)
      }
    },
    [value, onChange, selectedIndex],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedIndex(idx)
      setTimeout(() => colorInputRef.current?.click(), 0)
    },
    [],
  )

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedIndex === null) return
      const newColor = fromHex(e.target.value)
      const stops = [...value]
      stops[selectedIndex] = { ...stops[selectedIndex], color: newColor }
      onChange(stops)
    },
    [selectedIndex, value, onChange],
  )

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-xs text-[#e0e0e0]">{label}</span>}
      <div
        className="relative w-full select-none"
        style={{ height: 50 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={barRef}
          className="w-full rounded border border-[#2d2d44] cursor-crosshair"
          style={{
            height: 24,
            background: `linear-gradient(to right, ${gradientCSS})`,
          }}
          onClick={handleBarClick}
        />
        <div className="relative w-full" style={{ height: 26, marginTop: 2 }}>
          {value.map((stop, i) => {
            const isSelected = i === selectedIndex
            const hex = toHex(...stop.color)
            return (
              <div
                key={i}
                className="absolute top-0 flex flex-col items-center cursor-pointer"
                style={{ left: `${stop.time * 100}%`, transform: 'translateX(-50%)' }}
                onMouseDown={(e) => handleMarkerMouseDown(e, i)}
                onContextMenu={(e) => handleContextMenu(e, i)}
                onDoubleClick={(e) => handleDoubleClick(e, i)}
              >
                <svg width={10} height={8} viewBox="0 0 10 8">
                  <polygon
                    points="5,8 0,0 10,0"
                    fill={hex}
                    stroke={isSelected ? '#00f0ff' : '#ffffff60'}
                    strokeWidth={isSelected ? 1.5 : 0.5}
                  />
                </svg>
                {isSelected && (
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={hex}
                    onChange={handleColorChange}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 p-0 border-0 cursor-pointer"
                    style={{ opacity: 1, appearance: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
