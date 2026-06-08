import type { CollisionPlane } from '@/types/particle'
import { ParticlePool } from './ParticlePool'

export class CollisionEngine {
  apply(pool: ParticlePool, planes: CollisionPlane[], _dt: number): void {
    if (planes.length === 0) return

    const positions = pool.positions
    const velocities = pool.velocities
    const lifetimes = pool.lifetimes
    const alive = pool.getAliveList()

    for (let j = 0; j < alive.length; j++) {
      const i = alive[j]

      const px = positions[i * 3]
      const py = positions[i * 3 + 1]
      const pz = positions[i * 3 + 2]

      let particleReleased = false
      for (let p = 0; p < planes.length; p++) {
        const plane = planes[p]
        const n = plane.normal
        const nLen = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2])
        if (nLen < 1e-8) continue

        const invNLen = 1 / nLen
        const nx = n[0] * invNLen
        const ny = n[1] * invNLen
        const nz = n[2] * invNLen

        const dx = px - plane.position[0]
        const dy = py - plane.position[1]
        const dz = pz - plane.position[2]
        const dist = dx * nx + dy * ny + dz * nz

        if (dist >= 0) continue

        const vx = velocities[i * 3]
        const vy = velocities[i * 3 + 1]
        const vz = velocities[i * 3 + 2]
        const vDotN = vx * nx + vy * ny + vz * nz

        if (vDotN < 0) {
          const vnx = vDotN * nx
          const vny = vDotN * ny
          const vnz = vDotN * nz

          const vxh = vx - vnx
          const vyh = vy - vny
          const vzh = vz - vnz

          const bounce = plane.bounce
          const friction = 1 - plane.friction

          velocities[i * 3] = vxh * friction - vnx * bounce
          velocities[i * 3 + 1] = vyh * friction - vny * bounce
          velocities[i * 3 + 2] = vzh * friction - vnz * bounce
        }

        const pushBack = -dist
        positions[i * 3] += nx * pushBack
        positions[i * 3 + 1] += ny * pushBack
        positions[i * 3 + 2] += nz * pushBack

        if (plane.lifeDecay > 0) {
          lifetimes[i] *= (1 - plane.lifeDecay)
        }

        if (plane.killOnCollision) {
          pool.release(i)
          particleReleased = true
          break
        }
      }
      if (particleReleased) continue
    }
  }
}
