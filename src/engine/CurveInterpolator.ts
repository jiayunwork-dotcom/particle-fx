import type { Curve, GradientStop } from '@/types/particle'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function sampleCurve(curve: Curve, t: number): number {
  const points = curve.points
  if (points.length === 0) return 0
  if (points.length === 1) return points[0].value
  if (t <= points[0].time) return points[0].value
  if (t >= points[points.length - 1].time) return points[points.length - 1].value

  if (curve.type === 'step') {
    let val = points[0].value
    for (let i = 0; i < points.length; i++) {
      if (points[i].time <= t) val = points[i].value
      else break
    }
    return val
  }

  let idx = 0
  for (let i = 0; i < points.length - 1; i++) {
    if (t >= points[i].time && t <= points[i + 1].time) {
      idx = i
      break
    }
  }

  const p0 = points[idx]
  const p1 = points[idx + 1]
  const segT = (t - p0.time) / (p1.time - p0.time)

  if (curve.type === 'linear') {
    return lerp(p0.value, p1.value, segT)
  }

  if (curve.type === 'smooth') {
    const dx = p1.time - p0.time
    let c0x: number, c0y: number, c1x: number, c1y: number

    if (p0.outHandle) {
      c0x = p0.time + p0.outHandle[0] * dx
      c0y = p0.value + p0.outHandle[1] * (p1.value - p0.value)
    } else {
      c0x = p0.time + dx / 3
      c0y = p0.value
    }

    if (p1.inHandle) {
      c1x = p1.time + p1.inHandle[0] * dx
      c1y = p1.value + p1.inHandle[1] * (p1.value - p0.value)
    } else {
      c1x = p1.time - dx / 3
      c1y = p1.value
    }

    const u = 1 - segT
    const tt = segT
    const uu = tt * tt
    const uuu = uu * tt
    const uuu2 = u * u * u

    return uuu2 * p0.value
      + 3 * u * u * tt * c0y
      + 3 * u * uu * c1y
      + uuu * p1.value
  }

  return lerp(p0.value, p1.value, segT)
}

export function sampleGradient(stops: GradientStop[], t: number): { color: [number, number, number]; alpha: number } {
  if (stops.length === 0) return { color: [1, 1, 1], alpha: 1 }
  if (stops.length === 1) return { color: [...stops[0].color], alpha: stops[0].alpha }
  if (t <= stops[0].time) return { color: [...stops[0].color], alpha: stops[0].alpha }
  if (t >= stops[stops.length - 1].time) {
    const last = stops[stops.length - 1]
    return { color: [...last.color], alpha: last.alpha }
  }

  let idx = 0
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].time && t <= stops[i + 1].time) {
      idx = i
      break
    }
  }

  const s0 = stops[idx]
  const s1 = stops[idx + 1]
  const segT = (t - s0.time) / (s1.time - s0.time)

  return {
    color: [
      lerp(s0.color[0], s1.color[0], segT),
      lerp(s0.color[1], s1.color[1], segT),
      lerp(s0.color[2], s1.color[2], segT),
    ],
    alpha: lerp(s0.alpha, s1.alpha, segT),
  }
}
