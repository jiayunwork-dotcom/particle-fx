import type { EmitterConfig, ForceField, CollisionPlane } from '@/types/particle'
import { ParticlePool } from './ParticlePool'
import { ParticleEmitter } from './ParticleEmitter'
import { ForceFieldEngine } from './ForceFieldEngine'
import { CollisionEngine } from './CollisionEngine'

export class ParticleSystem {
  private pool: ParticlePool
  private emitters: Map<string, ParticleEmitter> = new Map()
  private forceFieldEngine: ForceFieldEngine
  private collisionEngine: CollisionEngine
  private forceFields: ForceField[] = []
  private collisionPlanes: CollisionPlane[] = []

  constructor() {
    this.pool = new ParticlePool()
    this.forceFieldEngine = new ForceFieldEngine()
    this.collisionEngine = new CollisionEngine()
  }

  update(dt: number): void {
    this.emitters.forEach(emitter => {
      emitter.emit(dt)
      emitter.update(dt)
    })

    this.forceFieldEngine.apply(this.pool, this.forceFields, dt)
    this.collisionEngine.apply(this.pool, this.collisionPlanes, dt)
  }

  getPool(): ParticlePool {
    return this.pool
  }

  addEmitter(config: EmitterConfig): void {
    if (this.emitters.has(config.id)) return
    const emitter = new ParticleEmitter(config, this.pool)
    this.emitters.set(config.id, emitter)
  }

  removeEmitter(id: string): void {
    this.emitters.delete(id)
  }

  updateEmitter(config: EmitterConfig): void {
    const emitter = this.emitters.get(config.id)
    if (emitter) {
      emitter.setConfig(config)
    } else {
      this.addEmitter(config)
    }
  }

  setForceFields(fields: ForceField[]): void {
    this.forceFields = fields
  }

  setCollisionPlanes(planes: CollisionPlane[]): void {
    this.collisionPlanes = planes
  }

  getForceFields(): ForceField[] {
    return this.forceFields
  }

  getCollisionPlanes(): CollisionPlane[] {
    return this.collisionPlanes
  }

  getEmitter(id: string): ParticleEmitter | undefined {
    return this.emitters.get(id)
  }

  getEmitterCount(): number {
    return this.emitters.size
  }

  reset(): void {
    this.pool.reset()
    this.emitters.forEach(emitter => emitter.reset())
  }
}
