import { useCallback, useRef, useState } from 'react'
import type { Curve, CurvePoint, CurveType } from '@/types/particle'

interface CurveEditorProps {
  value: Curve
  onChange: (curve: Curve) => void
  label?: string
  height?: number
}

const PADDING = 24
const HANDLE_SIZE = 4
const POINT_RADIUS = 5
const SELECTED_RADIUS = 7

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function computeHandles(points: CurvePoint[]): CurvePoint[] {
  return points.map((p, i) => {
    if (p.inHandle && p.outHandle) return p
    const prev = points[i - 1]
    const next = points[i + 1]
    let outHandle: [number, number] | undefined
    let inHandle: [number, number] | undefined
    if (next && !prev) {
      const dx = (next.time - p.time) / 3
      outHandle = [p.time + dx, p.value]
    } else if (prev && !next) {
      const dx = (p.time - prev.time) / 3
      inHandle = [p.time - dx, p.value]
    } else if (prev && next) {
      const dxPrev = (p.time - prev.time) / 3
      const dxNext = (next.time - p.time) / 3
      inHandle = [p.time - dxPrev, p.value]
      outHandle = [p.time + dxNext, p.value]
    }
    return { ...p, inHandle: p.inHandle ?? inHandle, outHandle: p.outHandle ?? outHandle }
  })
}

function buildCurvePath(points: CurvePoint[], type: CurveType, w: number, h: number): string {
  const toX = (t: number) => PADDING + t * (w - 2 * PADDING)
  const toY = (v: number) => PADDING + (1 - v) * (h - 2 * PADDING)

  if (points.length === 0) return ''
  if (points.length === 1) return `M ${toX(points[0].time)} ${toY(points[0].value)}`

  if (type === 'step') {
    let d = `M ${toX(points[0].time)} ${toY(points[0].value)}`
    for (let i = 1; i < points.length; i++) {
      d += ` H ${toX(points[i].time)} V ${toY(points[i].value)}`
    }
    return d
  }

  if (type === 'linear') {
    let d = `M ${toX(points[0].time)} ${toY(points[0].value)}`
    for (let i = 1; i < points.length; i++) {
      d += ` L ${toX(points[i].time)} ${toY(points[i].value)}`
    }
    return d
  }

  const resolved = computeHandles(points)
  let d = `M ${toX(resolved[0].time)} ${toY(resolved[0].value)}`
  for (let i = 1; i < resolved.length; i++) {
    const prev = resolved[i - 1]
    const curr = resolved[i]
    const cp1x = prev.outHandle ? toX(prev.outHandle[0]) : toX(prev.time)
    const cp1y = prev.outHandle ? toY(prev.outHandle[1]) : toY(prev.value)
    const cp2x = curr.inHandle ? toX(curr.inHandle[0]) : toX(curr.time)
    const cp2y = curr.inHandle ? toY(curr.inHandle[1]) : toY(curr.value)
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX(curr.time)} ${toY(curr.value)}`
  }
  return d
}

const TYPE_LABELS: Record<CurveType, string> = {
  linear: '线性',
  smooth: '平滑',
  step: '阶梯',
}

export default function CurveEditor({ value, onChange, label, height = 120 }: CurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState<'point' | 'inHandle' | 'outHandle' | null>(null)
  const dragIndex = useRef<number | null>(null)

  const toLocal = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const w = rect.width
      const h = rect.height
      const t = clamp((clientX - rect.left - PADDING) / (w - 2 * PADDING), 0, 1)
      const v = clamp(1 - (clientY - rect.top - PADDING) / (h - 2 * PADDING), 0, 1)
      return { t, v }
    },
    [],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault()
      const rect = svgRef.current!.getBoundingClientRect()
      const { t, v } = toLocal(e.clientX, e.clientY, rect)
      const points = value.points
      const hitRadius = 12

      for (let i = 0; i < points.length; i++) {
        const px = PADDING + points[i].time * (rect.width - 2 * PADDING)
        const py = PADDING + (1 - points[i].value) * (rect.height - 2 * PADDING)
        const dist = Math.hypot(e.clientX - rect.left - px, e.clientY - rect.top - py)
        if (dist < hitRadius) {
          setSelectedIndex(i)
          dragIndex.current = i
          setDragging('point')
          return
        }
      }

      if (value.type === 'smooth') {
        const resolved = computeHandles(points)
        for (let i = 0; i < resolved.length; i++) {
          if (resolved[i].outHandle) {
            const hx = PADDING + resolved[i].outHandle![0] * (rect.width - 2 * PADDING)
            const hy = PADDING + (1 - resolved[i].outHandle![1]) * (rect.height - 2 * PADDING)
            const dist = Math.hypot(e.clientX - rect.left - hx, e.clientY - rect.top - hy)
            if (dist < hitRadius) {
              setSelectedIndex(i)
              dragIndex.current = i
              setDragging('outHandle')
              return
            }
          }
          if (resolved[i].inHandle) {
            const hx = PADDING + resolved[i].inHandle![0] * (rect.width - 2 * PADDING)
            const hy = PADDING + (1 - resolved[i].inHandle![1]) * (rect.height - 2 * PADDING)
            const dist = Math.hypot(e.clientX - rect.left - hx, e.clientY - rect.top - hy)
            if (dist < hitRadius) {
              setSelectedIndex(i)
              dragIndex.current = i
              setDragging('inHandle')
              return
            }
          }
        }
      }

      const newPoint: CurvePoint = { time: t, value: v }
      const newPoints = [...points, newPoint].sort((a, b) => a.time - b.time)
      const newIdx = newPoints.findIndex((p) => p === newPoint)
      onChange({ ...value, points: newPoints })
      setSelectedIndex(newIdx)
    },
    [value, onChange, toLocal],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!dragging || dragIndex.current === null) return
      const rect = svgRef.current!.getBoundingClientRect()
      const { t, v } = toLocal(e.clientX, e.clientY, rect)
      const idx = dragIndex.current
      const points = [...value.points]

      if (dragging === 'point') {
        const point = { ...points[idx] }
        point.time = clamp(t, 0, 1)
        point.value = clamp(v, 0, 1)
        if (idx > 0) point.time = Math.max(point.time, points[idx - 1].time + 0.001)
        if (idx < points.length - 1) point.time = Math.min(point.time, points[idx + 1].time - 0.001)
        point.inHandle = undefined
        point.outHandle = undefined
        points[idx] = point
        onChange({ ...value, points })
      } else if (dragging === 'outHandle') {
        const point = { ...points[idx] }
        point.outHandle = [clamp(t, 0, 1), clamp(v, 0, 1)]
        points[idx] = point
        onChange({ ...value, points })
      } else if (dragging === 'inHandle') {
        const point = { ...points[idx] }
        point.inHandle = [clamp(t, 0, 1), clamp(v, 0, 1)]
        points[idx] = point
        onChange({ ...value, points })
      }
    },
    [dragging, value, onChange, toLocal],
  )

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    dragIndex.current = null
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault()
      const rect = svgRef.current!.getBoundingClientRect()
      const points = value.points
      const hitRadius = 12

      for (let i = 0; i < points.length; i++) {
        const px = PADDING + points[i].time * (rect.width - 2 * PADDING)
        const py = PADDING + (1 - points[i].value) * (rect.height - 2 * PADDING)
        const dist = Math.hypot(e.clientX - rect.left - px, e.clientY - rect.top - py)
        if (dist < hitRadius && points.length > 2) {
          const newPoints = points.filter((_, idx) => idx !== i)
          onChange({ ...value, points: newPoints })
          if (selectedIndex === i) setSelectedIndex(null)
          else if (selectedIndex !== null && selectedIndex > i) setSelectedIndex(selectedIndex - 1)
          return
        }
      }
    },
    [value, onChange, selectedIndex],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault()
      const rect = svgRef.current!.getBoundingClientRect()
      const points = value.points
      const hitRadius = 12

      for (let i = 0; i < points.length; i++) {
        const px = PADDING + points[i].time * (rect.width - 2 * PADDING)
        const py = PADDING + (1 - points[i].value) * (rect.height - 2 * PADDING)
        const dist = Math.hypot(e.clientX - rect.left - px, e.clientY - rect.top - py)
        if (dist < hitRadius) {
          const types: CurveType[] = ['linear', 'smooth', 'step']
          const currentIdx = types.indexOf(value.type)
          const nextType = types[(currentIdx + 1) % types.length]
          onChange({ ...value, type: nextType })
          return
        }
      }
    },
    [value, onChange],
  )

  const changeCurveType = useCallback(
    (type: CurveType) => {
      onChange({ ...value, type })
    },
    [value, onChange],
  )

  const w = 400
  const h = height
  const toX = (t: number) => PADDING + t * (w - 2 * PADDING)
  const toY = (v: number) => PADDING + (1 - v) * (h - 2 * PADDING)

  const curvePath = buildCurvePath(value.points, value.type, w, h)
  const resolvedPoints = value.type === 'smooth' ? computeHandles(value.points) : value.points

  const gridLines = []
  for (let i = 0; i <= 4; i++) {
    const frac = i * 0.25
    const x = toX(frac)
    const y = toY(frac)
    gridLines.push(
      <line key={`gv${i}`} x1={x} y1={PADDING} x2={x} y2={h - PADDING} stroke="#2d2d44" strokeWidth={0.5} />,
      <line key={`gh${i}`} x1={PADDING} y1={y} x2={w - PADDING} y2={y} stroke="#2d2d44" strokeWidth={0.5} />,
    )
  }

  const handleElements: React.ReactNode[] = []
  if (value.type === 'smooth') {
    for (let i = 0; i < resolvedPoints.length; i++) {
      const p = resolvedPoints[i]
      const cx = toX(p.time)
      const cy = toY(p.value)
      if (p.outHandle) {
        const hx = toX(p.outHandle[0])
        const hy = toY(p.outHandle[1])
        handleElements.push(
          <line key={`oh${i}`} x1={cx} y1={cy} x2={hx} y2={hy} stroke="#ffffff40" strokeWidth={1} />,
          <rect
            key={`ohr${i}`}
            x={hx - HANDLE_SIZE / 2}
            y={hy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff80"
            stroke="#ffffff40"
            strokeWidth={0.5}
          />,
        )
      }
      if (p.inHandle) {
        const hx = toX(p.inHandle[0])
        const hy = toY(p.inHandle[1])
        handleElements.push(
          <line key={`ih${i}`} x1={cx} y1={cy} x2={hx} y2={hy} stroke="#ffffff40" strokeWidth={1} />,
          <rect
            key={`ihr${i}`}
            x={hx - HANDLE_SIZE / 2}
            y={hy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff80"
            stroke="#ffffff40"
            strokeWidth={0.5}
          />,
        )
      }
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <span className="text-xs text-[#e0e0e0]">{label}</span>}
      <div className="relative w-full" style={{ height: h }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="w-full h-full rounded border border-[#2d2d44]"
          style={{ background: '#1a1a2e' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClick}
        >
          {gridLines}
          <text x={PADDING} y={h - PADDING + 14} fill="#e0e0e080" fontSize={8} textAnchor="middle">
            0
          </text>
          <text x={w - PADDING} y={PADDING - 4} fill="#e0e0e080" fontSize={8} textAnchor="middle">
            1
          </text>
          {curvePath && (
            <path d={curvePath} fill="none" stroke="#00f0ff" strokeWidth={2} />
          )}
          {handleElements}
          {resolvedPoints.map((p, i) => {
            const cx = toX(p.time)
            const cy = toY(p.value)
            const isSelected = i === selectedIndex
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isSelected ? SELECTED_RADIUS : POINT_RADIUS}
                fill="#00f0ff"
                stroke={isSelected ? '#ff6b35' : '#ffffff'}
                strokeWidth={isSelected ? 2 : 1}
              />
            )
          })}
        </svg>
        <div className="absolute top-1 right-1 flex gap-0.5">
          {(['linear', 'smooth', 'step'] as CurveType[]).map((ct) => (
            <button
              key={ct}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                changeCurveType(ct)
              }}
              className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                value.type === ct
                  ? 'bg-[#00f0ff] text-[#1a1a2e] font-medium'
                  : 'bg-[#2d2d44] text-[#e0e0e0] hover:bg-[#3d3d54]'
              }`}
            >
              {TYPE_LABELS[ct]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
