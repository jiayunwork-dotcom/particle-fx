import type { ForceField } from '@/types/particle'
import { ParticlePool } from './ParticlePool'
import { SimplexNoise } from './SimplexNoise'

export class ForceFieldEngine {
  private noise: SimplexNoise

  constructor() {
    this.noise = new SimplexNoise(42)
  }

  apply(pool: ParticlePool, fields: ForceField[], dt: number): void {
    if (fields.length === 0) return

    const positions = pool.positions
    const velocities = pool.velocities
    const alive = pool.alive
    const N = alive.length

    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue

      const px = positions[i * 3]
      const py = positions[i * 3 + 1]
      const pz = positions[i * 3 + 2]

      let dvx = 0
      let dvy = 0
      let dvz = 0

      for (let f = 0; f < fields.length; f++) {
        const field = fields[f]
        const dx = px - field.position[0]
        const dy = py - field.position[1]
        const dz = pz - field.position[2]
        const distSq = dx * dx + dy * dy + dz * dz
        const radius = field.radius

        if (distSq >= radius * radius) continue

        const dist = Math.sqrt(distSq)
        const falloff = 1 - dist / radius

        switch (field.type) {
          case 'gravity': {
            if (dist < 1e-8) break
            const invDist = 1 / dist
            const s = field.strength * falloff * invDist
            dvx -= dx * s
            dvy -= dy * s
            dvz -= dz * s
            break
          }

          case 'repulsion': {
            if (dist < 1e-8) break
            const invDist = 1 / dist
            const s = field.strength * falloff * invDist
            dvx += dx * s
            dvy += dy * s
            dvz += dz * s
            break
          }

          case 'turbulence': {
            const freq = field.frequency ?? 1
            const nx = this.noise.noise3D(px * freq, py * freq, pz * freq)
            const ny = this.noise.noise3D(px * freq + 31.416, py * freq + 47.853, pz * freq + 62.271)
            const nz = this.noise.noise3D(px * freq + 93.128, py * freq + 78.534, pz * freq + 15.926)
            const s = field.strength * falloff
            dvx += nx * s
            dvy += ny * s
            dvz += nz * s
            break
          }

          case 'directional': {
            const dir = field.direction ?? [0, 0, 0]
            const s = field.strength * falloff
            dvx += dir[0] * s
            dvy += dir[1] * s
            dvz += dir[2] * s
            break
          }
        }
      }

      velocities[i * 3] += dvx * dt
      velocities[i * 3 + 1] += dvy * dt
      velocities[i * 3 + 2] += dvz * dt
    }
  }
}
