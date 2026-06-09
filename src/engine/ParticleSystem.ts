import type { EmitterConfig, ForceField, CollisionPlane, Constraint, ConstraintSolverConfig } from '@/types/particle'
import { ParticlePool } from './ParticlePool'
import { ParticleEmitter } from './ParticleEmitter'
import { ForceFieldEngine } from './ForceFieldEngine'
import { CollisionEngine } from './CollisionEngine'
import { ConstraintEngine } from './ConstraintEngine'

export class ParticleSystem {
  private pool: ParticlePool
  private emitters: Map<string, ParticleEmitter> = new Map()
  private subEmitterInstances: Map<string, ParticleEmitter> = new Map()
  private forceFieldEngine: ForceFieldEngine
  private collisionEngine: CollisionEngine
  private constraintEngine: ConstraintEngine
  private forceFields: ForceField[] = []
  private collisionPlanes: CollisionPlane[] = []
  private constraints: Constraint[] = []
  private constraintSolver: ConstraintSolverConfig = { iterations: 4 }
  private constraintsChanged: boolean = false

  constructor() {
    this.pool = new ParticlePool()
    this.forceFieldEngine = new ForceFieldEngine()
    this.collisionEngine = new CollisionEngine()
    this.constraintEngine = new ConstraintEngine()
  }

  update(dt: number): void {
    this.emitters.forEach(emitter => {
      emitter.emit(dt)
      emitter.updateLifecycle(dt)
    })

    this.subEmitterInstances.forEach(emitter => {
      emitter.updateLifecycle(dt)
    })

    this.syncFixedParticles()

    if (this.constraints.length > 0) {
      const newConstraints = this.constraintEngine.apply(
        this.pool,
        this.constraints,
        this.constraintSolver.iterations,
        dt
      )
      if (newConstraints !== this.constraints) {
        this.constraints = newConstraints
        this.constraintsChanged = true
      }
    } else {
      this.emitters.forEach(emitter => {
        emitter.updatePhysics(dt)
      })
      this.subEmitterInstances.forEach(emitter => {
        emitter.updatePhysics(dt)
      })
    }

    this.forceFieldEngine.apply(this.pool, this.forceFields, dt)
    this.collisionEngine.apply(this.pool, this.collisionPlanes, dt)
  }

  didConstraintsChange(): boolean {
    const changed = this.constraintsChanged
    this.constraintsChanged = false
    return changed
  }

  private syncFixedParticles(): void {
  }

  setFixedParticles(indices: number[]): void {
    this.pool.isFixed.fill(0)
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i]
      if (idx >= 0 && idx < this.pool.isFixed.length) {
        this.pool.isFixed[idx] = 1
      }
    }
  }

  getPool(): ParticlePool {
    return this.pool
  }

  getConstraints(): Constraint[] {
    return this.constraints
  }

  setConstraints(constraints: Constraint[]): void {
    this.constraints = constraints
  }

  setConstraintSolver(config: ConstraintSolverConfig): void {
    this.constraintSolver = config
  }

  getConstraintSolver(): ConstraintSolverConfig {
    return this.constraintSolver
  }

  registerSubEmitterInstance(emitter: ParticleEmitter, parentId: string, subIndex: number, subEmitterId: string): void {
    const key = `${parentId}_${subIndex}_${subEmitterId}`
    this.subEmitterInstances.set(key, emitter)
  }

  addEmitter(config: EmitterConfig): void {
    if (this.emitters.has(config.id)) return
    const emitter = new ParticleEmitter(config, this.pool, this)
    this.emitters.set(config.id, emitter)
    this.removeSubEmittersForParent(config.id)
    if (config.subEmitters && config.subEmitters.length > 0) {
      emitter.registerSubEmitters(config.subEmitters, this)
    }
  }

  private removeSubEmittersForParent(parentId: string): void {
    const keysToDelete: string[] = []
    this.subEmitterInstances.forEach((_emitter, key) => {
      if (key.startsWith(`${parentId}_`)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.subEmitterInstances.delete(key))
  }

  removeEmitter(id: string): void {
    this.emitters.delete(id)
    this.removeSubEmittersForParent(id)
  }

  updateEmitter(config: EmitterConfig): void {
    const emitter = this.emitters.get(config.id)
    if (emitter) {
      emitter.setConfig(config)
      this.removeSubEmittersForParent(config.id)
      if (config.subEmitters && config.subEmitters.length > 0) {
        emitter.registerSubEmitters(config.subEmitters, this)
      }
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

  getEmitterIds(): string[] {
    return Array.from(this.emitters.keys())
  }

  reset(): void {
    this.pool.reset()
    this.emitters.forEach(emitter => emitter.reset())
    this.subEmitterInstances.forEach(emitter => emitter.reset())
  }
}
