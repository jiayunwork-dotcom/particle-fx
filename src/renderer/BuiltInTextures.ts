import * as THREE from 'three'

export function createSoftCircleTexture(size: number = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const half = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - half + 0.5
      const dy = y - half + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy) / half
      const alpha = 1.0 - Math.min(Math.max(dist, 0), 1)
      const a = Math.floor(alpha * alpha * 255)
      const idx = (y * size + x) * 4
      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = a
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

export function createSquareTexture(size: number = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const half = size / 2
  const edge = 2.0 / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - half + 0.5) / half
      const dy = Math.abs(y - half + 0.5) / half
      const maxDist = Math.max(dx, dy)
      const alpha = 1.0 - Math.min(Math.max((maxDist - (1.0 - edge)) / edge, 0), 1)
      const idx = (y * size + x) * 4
      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = Math.floor(alpha * 255)
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

export function createStarTexture(size: number = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const half = size / 2
  const points = 5
  const outerR = half * 0.9
  const innerR = half * 0.35
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x - half + 0.5
      const py = y - half + 0.5
      let inside = false
      for (let i = 0; i < points * 2; i++) {
        const a1 = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
        const a2 = ((i + 1) / (points * 2)) * Math.PI * 2 - Math.PI / 2
        const r1 = i % 2 === 0 ? outerR : innerR
        const r2 = (i + 1) % 2 === 0 ? outerR : innerR
        const x1 = Math.cos(a1) * r1
        const y1 = Math.sin(a1) * r1
        const x2 = Math.cos(a2) * r2
        const y2 = Math.sin(a2) * r2
        if ((y1 > py) !== (y2 > py)) {
          const t = (py - y1) / (y2 - y1)
          const ix = x1 + t * (x2 - x1)
          if (px < ix) inside = !inside
        }
      }
      const edge = 2.0 / size
      let alpha = 0
      if (inside) {
        const dist = Math.sqrt(px * px + py * py) / half
        alpha = 1.0 - Math.min(Math.max((dist - (1.0 - edge * 3)) / (edge * 3), 0), 1)
      } else {
        const dist = Math.sqrt(px * px + py * py) / half
        if (dist < 1.0) {
          alpha = 0.0
        }
      }
      const idx = (y * size + x) * 4
      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = Math.floor(alpha * 255)
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

export function createSmokeTexture(size: number = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const half = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - half + 0.5
      const dy = y - half + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy) / half
      const n1 = Math.sin(dx * 0.3 + dy * 0.7) * 0.15
      const n2 = Math.sin(dx * 0.5 - dy * 0.3 + 1.7) * 0.1
      const n3 = Math.sin(dx * 0.8 + dy * 0.2 - 2.3) * 0.08
      const noise = n1 + n2 + n3
      const falloff = 1.0 - Math.min(Math.max(dist, 0), 1)
      const alpha = Math.max(0, Math.min(1, falloff * (0.8 + noise)))
      const idx = (y * size + x) * 4
      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = Math.floor(alpha * alpha * 255)
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}
