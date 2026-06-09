import type { Constraint, DistanceConstraint, AngleConstraint, AreaConstraint } from '@/types/particle'
import { ParticlePool, MAX_PARTICLES } from './ParticlePool'

export class ConstraintEngine {
  apply(
    pool: ParticlePool,
    constraints: Constraint[],
    iterations: number,
    dt: number
  ): Constraint[] {
    if (constraints.length === 0) return constraints
    if (iterations <= 0) iterations = 4

    const positions = pool.positions
    const prevPositions = pool.prevPositions
    const velocities = pool.velocities
    const alive = pool.getAliveList()

    for (let j = 0; j < alive.length; j++) {
      const i = alive[j]
      if (pool.isParticleFixed(i)) continue
      prevPositions[i * 3] = positions[i * 3]
      prevPositions[i * 3 + 1] = positions[i * 3 + 1]
      prevPositions[i * 3 + 2] = positions[i * 3 + 2]
    }

    const dtSq = dt * dt
    for (let j = 0; j < alive.length; j++) {
      const i = alive[j]
      if (pool.isParticleFixed(i)) continue
      const ax = pool.accelerations[i * 3]
      const ay = pool.accelerations[i * 3 + 1]
      const az = pool.accelerations[i * 3 + 2]
      positions[i * 3] += velocities[i * 3] * dt + ax * dtSq * 0.5
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt + ay * dtSq * 0.5
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt + az * dtSq * 0.5
    }

    const brokenIds = new Set<string>()

    for (let iter = 0; iter < iterations; iter++) {
      for (let c = 0; c < constraints.length; c++) {
        const constraint = constraints[c]
        if (constraint.type === 'distance') {
          if (constraint.broken) continue
          if (this.solveDistance(pool, constraint)) {
            brokenIds.add(constraint.id)
          }
        } else if (constraint.type === 'angle') {
          this.solveAngle(pool, constraint)
        }
      }

      for (let c = 0; c < constraints.length; c++) {
        const constraint = constraints[c]
        if (constraint.type === 'area') {
          this.solveArea(pool, constraint)
        }
      }
    }

    if (dt > 1e-8) {
      const invDt = 1 / dt
      for (let j = 0; j < alive.length; j++) {
        const i = alive[j]
        if (pool.isParticleFixed(i)) {
          velocities[i * 3] = 0
          velocities[i * 3 + 1] = 0
          velocities[i * 3 + 2] = 0
          continue
        }
        velocities[i * 3] = (positions[i * 3] - prevPositions[i * 3]) * invDt
        velocities[i * 3 + 1] = (positions[i * 3 + 1] - prevPositions[i * 3 + 1]) * invDt
        velocities[i * 3 + 2] = (positions[i * 3 + 2] - prevPositions[i * 3 + 2]) * invDt
      }
    }

    if (brokenIds.size > 0) {
      const result: Constraint[] = []
      for (let c = 0; c < constraints.length; c++) {
        const con = constraints[c]
        if (con.type === 'distance' && brokenIds.has(con.id)) {
          continue
        }
        result.push(con)
      }
      return result
    }

    return constraints
  }

  private solveDistance(pool: ParticlePool, c: DistanceConstraint): boolean {
    const pa = c.particleA
    const pb = c.particleB
    if (pa < 0 || pa >= MAX_PARTICLES || pb < 0 || pb >= MAX_PARTICLES) return false
    if (!pool.isAlive(pa) || !pool.isAlive(pb)) return false

    const positions = pool.positions
    const ax = positions[pa * 3]
    const ay = positions[pa * 3 + 1]
    const az = positions[pa * 3 + 2]
    const bx = positions[pb * 3]
    const by = positions[pb * 3 + 1]
    const bz = positions[pb * 3 + 2]

    const dx = bx - ax
    const dy = by - ay
    const dz = bz - az
    const distSq = dx * dx + dy * dy + dz * dz
    const restDist = c.restDistance

    if (distSq > restDist * restDist * 4) {
      return true
    }

    const dist = Math.sqrt(distSq)
    if (dist < 1e-8) return false

    const diff = (dist - restDist) / dist
    const stiffness = c.stiffness
    const corrX = dx * 0.5 * diff * stiffness
    const corrY = dy * 0.5 * diff * stiffness
    const corrZ = dz * 0.5 * diff * stiffness

    const aFixed = pool.isParticleFixed(pa)
    const bFixed = pool.isParticleFixed(pb)

    if (!aFixed && !bFixed) {
      positions[pa * 3] += corrX
      positions[pa * 3 + 1] += corrY
      positions[pa * 3 + 2] += corrZ
      positions[pb * 3] -= corrX
      positions[pb * 3 + 1] -= corrY
      positions[pb * 3 + 2] -= corrZ
    } else if (!aFixed) {
      positions[pa * 3] += corrX * 2
      positions[pa * 3 + 1] += corrY * 2
      positions[pa * 3 + 2] += corrZ * 2
    } else if (!bFixed) {
      positions[pb * 3] -= corrX * 2
      positions[pb * 3 + 1] -= corrY * 2
      positions[pb * 3 + 2] -= corrZ * 2
    }

    return false
  }

  private solveAngle(pool: ParticlePool, c: AngleConstraint): void {
    const pa = c.particleA
    const pb = c.particleB
    const pc = c.particleC
    if (pa < 0 || pa >= MAX_PARTICLES || pb < 0 || pb >= MAX_PARTICLES || pc < 0 || pc >= MAX_PARTICLES) return
    if (!pool.isAlive(pa) || !pool.isAlive(pb) || !pool.isAlive(pc)) return

    const positions = pool.positions
    const ax = positions[pa * 3]
    const ay = positions[pa * 3 + 1]
    const az = positions[pa * 3 + 2]
    const bx = positions[pb * 3]
    const by = positions[pb * 3 + 1]
    const bz = positions[pb * 3 + 2]
    const cx = positions[pc * 3]
    const cy = positions[pc * 3 + 1]
    const cz = positions[pc * 3 + 2]

    const bax = ax - bx
    const bay = ay - by
    const baz = az - bz
    const bcx = cx - bx
    const bcy = cy - by
    const bcz = cz - bz

    const baLenSq = bax * bax + bay * bay + baz * baz
    const bcLenSq = bcx * bcx + bcy * bcy + bcz * bcz
    if (baLenSq < 1e-8 || bcLenSq < 1e-8) return

    const baLen = Math.sqrt(baLenSq)
    const bcLen = Math.sqrt(bcLenSq)
    const baxN = bax / baLen
    const bayN = bay / baLen
    const bazN = baz / baLen
    const bcxN = bcx / bcLen
    const bcyN = bcy / bcLen
    const bczN = bcz / bcLen

    let dot = baxN * bcxN + bayN * bcyN + bazN * bczN
    dot = Math.max(-1, Math.min(1, dot))
    const currentAngle = Math.acos(dot)

    const minAngle = c.minAngle
    const maxAngle = c.maxAngle

    if (currentAngle >= minAngle && currentAngle <= maxAngle) return

    const targetAngle = currentAngle < minAngle ? minAngle : maxAngle
    const angleDiff = targetAngle - currentAngle
    const stiffness = c.stiffness

    const crossX = bayN * bczN - bazN * bcyN
    const crossY = bazN * bcxN - baxN * bczN
    const crossZ = baxN * bcyN - bayN * bcxN
    const crossLenSq = crossX * crossX + crossY * crossY + crossZ * crossZ
    if (crossLenSq < 1e-8) return
    const crossLen = Math.sqrt(crossLenSq)
    const axisX = crossX / crossLen
    const axisY = crossY / crossLen
    const axisZ = crossZ / crossLen

    const rotAngle = angleDiff * 0.5 * stiffness

    this.rotatePointAroundAxis(positions, pb, pc, axisX, axisY, axisZ, -rotAngle)
    this.rotatePointAroundAxis(positions, pb, pa, axisX, axisY, axisZ, rotAngle)
  }

  private rotatePointAroundAxis(
    positions: Float32Array,
    pivotIdx: number,
    pointIdx: number,
    axisX: number,
    axisY: number,
    axisZ: number,
    angle: number
  ): void {
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    const px = positions[pivotIdx * 3]
    const py = positions[pivotIdx * 3 + 1]
    const pz = positions[pivotIdx * 3 + 2]
    const x = positions[pointIdx * 3] - px
    const y = positions[pointIdx * 3 + 1] - py
    const z = positions[pointIdx * 3 + 2] - pz

    const dot = axisX * x + axisY * y + axisZ * z
    const crossX = axisY * z - axisZ * y
    const crossY = axisZ * x - axisX * z
    const crossZ = axisX * y - axisY * x

    positions[pointIdx * 3] = px + x * cosA + crossX * sinA + axisX * dot * (1 - cosA)
    positions[pointIdx * 3 + 1] = py + y * cosA + crossY * sinA + axisY * dot * (1 - cosA)
    positions[pointIdx * 3 + 2] = pz + z * cosA + crossZ * sinA + axisZ * dot * (1 - cosA)
  }

  private solveArea(pool: ParticlePool, c: AreaConstraint): void {
    const positions = pool.positions
    const velocities = pool.velocities
    const alive = pool.getAliveList()

    const minX = c.center[0] - c.halfExtents[0]
    const maxX = c.center[0] + c.halfExtents[0]
    const minY = c.center[1] - c.halfExtents[1]
    const maxY = c.center[1] + c.halfExtents[1]
    const minZ = c.center[2] - c.halfExtents[2]
    const maxZ = c.center[2] + c.halfExtents[2]
    const bounce = c.bounce

    for (let j = 0; j < alive.length; j++) {
      const i = alive[j]
      if (pool.isParticleFixed(i)) continue

      let px = positions[i * 3]
      let py = positions[i * 3 + 1]
      let pz = positions[i * 3 + 2]
      let vx = velocities[i * 3]
      let vy = velocities[i * 3 + 1]
      let vz = velocities[i * 3 + 2]

      if (px < minX) {
        px = minX
        vx = -vx * bounce
      } else if (px > maxX) {
        px = maxX
        vx = -vx * bounce
      }

      if (py < minY) {
        py = minY
        vy = -vy * bounce
      } else if (py > maxY) {
        py = maxY
        vy = -vy * bounce
      }

      if (pz < minZ) {
        pz = minZ
        vz = -vz * bounce
      } else if (pz > maxZ) {
        pz = maxZ
        vz = -vz * bounce
      }

      positions[i * 3] = px
      positions[i * 3 + 1] = py
      positions[i * 3 + 2] = pz
      velocities[i * 3] = vx
      velocities[i * 3 + 1] = vy
      velocities[i * 3 + 2] = vz
    }
  }
}
