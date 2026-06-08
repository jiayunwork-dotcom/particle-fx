import type { EmitterConfig, SubEmitterEvent } from '@/types/particle'
import { ParticlePool } from './ParticlePool'
import { sampleCurve, sampleGradient } from './CurveInterpolator'
import type { ParticleSystem } from './ParticleSystem'

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomOnUnitSphere(): [number, number, number] {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const sinPhi = Math.sin(phi)
  return [sinPhi * Math.cos(theta), sinPhi * Math.sin(theta), Math.cos(phi)]
}

function randomInUnitSphere(): [number, number, number] {
  const [x, y, z] = randomOnUnitSphere()
  const r = Math.cbrt(Math.random())
  return [x * r, y * r, z * r]
}

function randomOnCircle(): [number, number] {
  const angle = Math.random() * Math.PI * 2
  return [Math.cos(angle), Math.sin(angle)]
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z)
  if (len < 1e-8) return [0, 1, 0]
  return [x / len, y / len, z / len]
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

type SubEmitterEntry = { event: SubEmitterEvent; lifecyclePercent?: number; emitter: ParticleEmitter; slotIndex: number }

export class ParticleEmitter {
  config: EmitterConfig
  pool: ParticlePool
  private ownerKey: number
  private elapsed: number = 0
  private emitAccumulator: number = 0
  private burstFired: boolean = false
  private finished: boolean = false
  private subEmitterMap: Map<number, SubEmitterEntry> = new Map()
  private system: ParticleSystem | null = null
  isSubEmitter: boolean = false

  constructor(config: EmitterConfig, pool: ParticlePool, system?: ParticleSystem) {
    this.config = config
    this.pool = pool
    this.ownerKey = hashCode(config.id)
    this.system = system ?? null
  }

  markAsSubEmitter(): void {
    this.isSubEmitter = true
  }

  registerSubEmitters(subEmitters: { event: SubEmitterEvent; lifecyclePercent?: number; emitter: EmitterConfig }[], system: ParticleSystem): void {
    this.subEmitterMap.clear()
    this.system = system
    subEmitters.forEach((sub, index) => {
      const subConfig = { ...sub.emitter }
      subConfig.position = [0, 0, 0]
      subConfig.burstMode = true
      if (!subConfig.burstCount || subConfig.burstCount <= 0) {
        subConfig.burstCount = 50
      }
      const subEmitter = new ParticleEmitter(subConfig, this.pool, system)
      subEmitter.markAsSubEmitter()
      const key = (this.ownerKey << 8) | (index & 0xff)
      this.subEmitterMap.set(key, {
        event: sub.event,
        lifecyclePercent: sub.lifecyclePercent,
        emitter: subEmitter,
        slotIndex: index & 0x7,
      })
      system.registerSubEmitterInstance(subEmitter, this.config.id, index, sub.emitter.id)
    })
  }

  emit(dt: number): void {
    if (this.isSubEmitter) return
    if (this.finished) return

    this.elapsed += dt

    if (this.config.duration > 0 && this.elapsed >= this.config.duration) {
      if (this.config.looping) {
        this.elapsed -= this.config.duration
        this.emitAccumulator = 0
        this.burstFired = false
      } else {
        this.finished = true
        return
      }
    }

    if (this.config.burstMode) {
      if (!this.burstFired) {
        this.burstFired = true
        for (let i = 0; i < this.config.burstCount; i++) {
          this.spawnParticle()
        }
      }
      return
    }

    this.emitAccumulator += this.config.emissionRate * dt
    const toSpawn = Math.floor(this.emitAccumulator)
    if (toSpawn > 0) {
      this.emitAccumulator -= toSpawn
      for (let i = 0; i < toSpawn; i++) {
        this.spawnParticle()
      }
    }
  }

  emitAtPosition(position: [number, number, number]): void {
    const burstCount = this.config.burstCount > 0 ? this.config.burstCount : 50
    for (let i = 0; i < burstCount; i++) {
      this.spawnParticleAtPosition(position)
    }
  }

  private spawnParticleAtPosition(position: [number, number, number]): void {
    const idx = this.pool.acquire(this.ownerKey)
    if (idx === -1) return

    const pos = this.getShapePosition()
    this.pool.positions[idx * 3] = pos[0] + position[0]
    this.pool.positions[idx * 3 + 1] = pos[1] + position[1]
    this.pool.positions[idx * 3 + 2] = pos[2] + position[2]

    const speed = randRange(this.config.initialSpeed[0], this.config.initialSpeed[1])
    const dir = this.getDirection(pos)
    this.pool.velocities[idx * 3] = dir[0] * speed
    this.pool.velocities[idx * 3 + 1] = dir[1] * speed
    this.pool.velocities[idx * 3 + 2] = dir[2] * speed

    this.pool.initialSpeeds[idx] = speed

    this.pool.accelerations[idx * 3] = this.config.acceleration[0]
    this.pool.accelerations[idx * 3 + 1] = this.config.acceleration[1]
    this.pool.accelerations[idx * 3 + 2] = this.config.acceleration[2]

    const lifetime = randRange(this.config.lifetime[0], this.config.lifetime[1])
    this.pool.ages[idx] = 0
    this.pool.lifetimes[idx] = lifetime

    const initColor = this.config.colorGradient.length > 0
      ? this.config.colorGradient[0]
      : { color: [1, 1, 1] as [number, number, number], alpha: 1 }
    this.pool.colors[idx * 4] = initColor.color[0]
    this.pool.colors[idx * 4 + 1] = initColor.color[1]
    this.pool.colors[idx * 4 + 2] = initColor.color[2]
    this.pool.colors[idx * 4 + 3] = initColor.alpha

    const initSize = this.config.sizeCurve.points.length > 0
      ? this.config.sizeCurve.points[0].value
      : 1
    this.pool.sizes[idx] = initSize

    const initOpacity = this.config.opacityCurve.points.length > 0
      ? this.config.opacityCurve.points[0].value
      : 1
    this.pool.opacities[idx] = initOpacity

    this.pool.rotations[idx] = randRange(this.config.rotationSpeed[0], this.config.rotationSpeed[1])

    this.pool.prevAge[idx] = 0
    this.pool.triggeredLifecycleEvents.fill(0, idx * 8, idx * 8 + 8)
  }

  spawnParticle(): void {
    const idx = this.pool.acquire(this.ownerKey)
    if (idx === -1) return

    const pos = this.getShapePosition()
    this.pool.positions[idx * 3] = pos[0] + this.config.position[0]
    this.pool.positions[idx * 3 + 1] = pos[1] + this.config.position[1]
    this.pool.positions[idx * 3 + 2] = pos[2] + this.config.position[2]

    const speed = randRange(this.config.initialSpeed[0], this.config.initialSpeed[1])
    const dir = this.getDirection(pos)
    this.pool.velocities[idx * 3] = dir[0] * speed
    this.pool.velocities[idx * 3 + 1] = dir[1] * speed
    this.pool.velocities[idx * 3 + 2] = dir[2] * speed

    this.pool.initialSpeeds[idx] = speed

    this.pool.accelerations[idx * 3] = this.config.acceleration[0]
    this.pool.accelerations[idx * 3 + 1] = this.config.acceleration[1]
    this.pool.accelerations[idx * 3 + 2] = this.config.acceleration[2]

    const lifetime = randRange(this.config.lifetime[0], this.config.lifetime[1])
    this.pool.ages[idx] = 0
    this.pool.lifetimes[idx] = lifetime

    const initColor = this.config.colorGradient.length > 0
      ? this.config.colorGradient[0]
      : { color: [1, 1, 1] as [number, number, number], alpha: 1 }
    this.pool.colors[idx * 4] = initColor.color[0]
    this.pool.colors[idx * 4 + 1] = initColor.color[1]
    this.pool.colors[idx * 4 + 2] = initColor.color[2]
    this.pool.colors[idx * 4 + 3] = initColor.alpha

    const initSize = this.config.sizeCurve.points.length > 0
      ? this.config.sizeCurve.points[0].value
      : 1
    this.pool.sizes[idx] = initSize

    const initOpacity = this.config.opacityCurve.points.length > 0
      ? this.config.opacityCurve.points[0].value
      : 1
    this.pool.opacities[idx] = initOpacity

    this.pool.rotations[idx] = randRange(this.config.rotationSpeed[0], this.config.rotationSpeed[1])

    this.pool.prevAge[idx] = 0
    this.pool.triggeredLifecycleEvents.fill(0, idx * 8, idx * 8 + 8)

    const parentPos: [number, number, number] = [
      this.pool.positions[idx * 3],
      this.pool.positions[idx * 3 + 1],
      this.pool.positions[idx * 3 + 2],
    ]
    this.subEmitterMap.forEach(entry => {
      if (entry.event === 'birth') {
        entry.emitter.emitAtPosition(parentPos)
      }
    })
  }

  update(dt: number): void {
    const pool = this.pool
    const alive = pool.getAliveList()
    const colorGradient = this.config.colorGradient
    const sizeCurve = this.config.sizeCurve
    const opacityCurve = this.config.opacityCurve
    const myKey = this.ownerKey

    const deathSubEmitters: ParticleEmitter[] = []
    this.subEmitterMap.forEach(entry => {
      if (entry.event === 'death') {
        deathSubEmitters.push(entry.emitter)
      }
    })

    const lifecycleEntries: SubEmitterEntry[] = []
    this.subEmitterMap.forEach(entry => {
      if (entry.event === 'lifecycle' && entry.lifecyclePercent !== undefined) {
        lifecycleEntries.push(entry)
      }
    })

    for (let j = 0; j < alive.length; j++) {
      const i = alive[j]
      if (pool.ownerIds[i] !== myKey) continue

      pool.prevAge[i] = pool.ages[i]
      pool.ages[i] += dt
      const age = pool.ages[i]
      const lifetime = pool.lifetimes[i]

      if (age >= lifetime) {
        const dyingPos: [number, number, number] = [
          pool.positions[i * 3],
          pool.positions[i * 3 + 1],
          pool.positions[i * 3 + 2],
        ]
        pool.release(i)
        for (const sub of deathSubEmitters) {
          sub.emitAtPosition(dyingPos)
        }
        continue
      }

      const t = age / lifetime
      const prevT = pool.prevAge[i] / lifetime

      if (this.config.spriteSheet) {
        const rows = this.config.spriteSheet.rows
        const cols = this.config.spriteSheet.cols
        const totalFrames = rows * cols
        const frame = Math.floor(t * totalFrames)
        pool.frameIndices[i] = Math.min(frame, totalFrames - 1)
      }

      for (const entry of lifecycleEntries) {
        const pct = entry.lifecyclePercent!
        const slot = entry.slotIndex
        const triggeredOffset = i * 8 + slot
        if (pool.triggeredLifecycleEvents[triggeredOffset] === 0) {
          if (prevT < pct && t >= pct) {
            pool.triggeredLifecycleEvents[triggeredOffset] = 1
            const particlePos: [number, number, number] = [
              pool.positions[i * 3],
              pool.positions[i * 3 + 1],
              pool.positions[i * 3 + 2],
            ]
            entry.emitter.emitAtPosition(particlePos)
          }
        }
      }

      pool.velocities[i * 3] += pool.accelerations[i * 3] * dt
      pool.velocities[i * 3 + 1] += pool.accelerations[i * 3 + 1] * dt
      pool.velocities[i * 3 + 2] += pool.accelerations[i * 3 + 2] * dt

      pool.positions[i * 3] += pool.velocities[i * 3] * dt
      pool.positions[i * 3 + 1] += pool.velocities[i * 3 + 1] * dt
      pool.positions[i * 3 + 2] += pool.velocities[i * 3 + 2] * dt

      pool.sizes[i] = sampleCurve(sizeCurve, t)
      pool.opacities[i] = sampleCurve(opacityCurve, t)

      if (colorGradient.length > 0) {
        const grad = sampleGradient(colorGradient, t)
        pool.colors[i * 4] = grad.color[0]
        pool.colors[i * 4 + 1] = grad.color[1]
        pool.colors[i * 4 + 2] = grad.color[2]
        pool.colors[i * 4 + 3] = grad.alpha
      }
    }
  }

  setConfig(config: EmitterConfig): void {
    this.config = config
    this.ownerKey = hashCode(config.id)
    this.elapsed = 0
    this.emitAccumulator = 0
    this.burstFired = false
    this.finished = false
  }

  isFinished(): boolean {
    return this.finished
  }

  getElapsedTime(): number {
    return this.elapsed
  }

  reset(): void {
    this.elapsed = 0
    this.emitAccumulator = 0
    this.burstFired = false
    this.finished = false
  }

  private getShapePosition(): [number, number, number] {
    const params = this.config.shapeParams
    switch (this.config.shape) {
      case 'point':
        return [0, 0, 0]

      case 'circle': {
        const r = params.radius ?? 1
        const [cx, cy] = randomOnCircle()
        return [cx * r, cy * r, 0]
      }

      case 'rectangle': {
        const w = params.width ?? 1
        const h = params.height ?? 1
        return [(Math.random() - 0.5) * w, (Math.random() - 0.5) * h, 0]
      }

      case 'sphere': {
        const r = params.radius ?? 1
        const [sx, sy, sz] = randomInUnitSphere()
        return [sx * r, sy * r, sz * r]
      }

      case 'cone': {
        const angle = (params.angle ?? 45) * Math.PI / 180
        const r = params.radius ?? 1
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const rndAngle = Math.random() * Math.PI * 2
        const rndR = Math.random()
        const x = Math.cos(rndAngle) * sinA * rndR * r
        const z = Math.sin(rndAngle) * sinA * rndR * r
        const y = cosA * r
        return [x, y, z]
      }

      default:
        return [0, 0, 0]
    }
  }

  private getDirection(shapePos: [number, number, number]): [number, number, number] {
    if (this.config.direction === 'fixed') {
      return normalize3(
        this.config.fixedDirection[0],
        this.config.fixedDirection[1],
        this.config.fixedDirection[2]
      )
    }

    const len = Math.sqrt(shapePos[0] * shapePos[0] + shapePos[1] * shapePos[1] + shapePos[2] * shapePos[2])
    if (len < 1e-8) {
      const [sx, sy, sz] = randomOnUnitSphere()
      return [sx, sy, sz]
    }
    return [shapePos[0] / len, shapePos[1] / len, shapePos[2] / len]
  }
}
