export const MAX_PARTICLES = 50000
export const MAX_TRAIL_LENGTH = 100

export class ParticlePool {
  readonly positions: Float32Array
  readonly prevPositions: Float32Array
  readonly velocities: Float32Array
  readonly colors: Float32Array
  readonly accelerations: Float32Array
  readonly sizes: Float32Array
  readonly opacities: Float32Array
  readonly rotations: Float32Array
  readonly ages: Float32Array
  readonly lifetimes: Float32Array
  readonly initialSpeeds: Float32Array
  readonly frameIndices: Float32Array
  readonly alive: Uint8Array
  readonly isFixed: Uint8Array
  readonly ownerIds: Uint32Array
  readonly prevAge: Float32Array
  readonly triggeredLifecycleEvents: Uint8Array

  readonly trailPositions: Float32Array
  readonly trailColors: Float32Array
  readonly trailSizes: Float32Array
  readonly trailCounts: Uint16Array
  readonly trailSampleCounters: Uint8Array
  readonly trailDying: Uint8Array
  readonly trailDyingRemaining: Uint16Array
  readonly trailEmitterKeys: Uint32Array

  private freeList: number[]
  private aliveList: number[]
  private trailAliveList: number[]

  constructor() {
    const N = MAX_PARTICLES
    const T = MAX_TRAIL_LENGTH
    this.positions = new Float32Array(N * 3)
    this.prevPositions = new Float32Array(N * 3)
    this.velocities = new Float32Array(N * 3)
    this.colors = new Float32Array(N * 4)
    this.accelerations = new Float32Array(N * 3)
    this.sizes = new Float32Array(N)
    this.opacities = new Float32Array(N)
    this.rotations = new Float32Array(N)
    this.ages = new Float32Array(N)
    this.lifetimes = new Float32Array(N)
    this.initialSpeeds = new Float32Array(N)
    this.frameIndices = new Float32Array(N)
    this.alive = new Uint8Array(N)
    this.isFixed = new Uint8Array(N)
    this.ownerIds = new Uint32Array(N)
    this.prevAge = new Float32Array(N)
    this.triggeredLifecycleEvents = new Uint8Array(N * 8)

    this.trailPositions = new Float32Array(N * T * 3)
    this.trailColors = new Float32Array(N * T * 4)
    this.trailSizes = new Float32Array(N * T)
    this.trailCounts = new Uint16Array(N)
    this.trailSampleCounters = new Uint8Array(N)
    this.trailDying = new Uint8Array(N)
    this.trailDyingRemaining = new Uint16Array(N)
    this.trailEmitterKeys = new Uint32Array(N)

    this.freeList = []
    for (let i = N - 1; i >= 0; i--) {
      this.freeList.push(i)
    }
    this.aliveList = []
    this.trailAliveList = []
  }

  acquire(ownerKey: number): number {
    if (this.freeList.length === 0) return -1
    const idx = this.freeList.pop()!
    this.alive[idx] = 1
    this.isFixed[idx] = 0
    this.ownerIds[idx] = ownerKey
    this.prevPositions[idx * 3] = 0
    this.prevPositions[idx * 3 + 1] = 0
    this.prevPositions[idx * 3 + 2] = 0
    this.trailCounts[idx] = 0
    this.trailSampleCounters[idx] = 0
    this.trailDying[idx] = 0
    this.trailDyingRemaining[idx] = 0
    this.trailEmitterKeys[idx] = ownerKey
    this.aliveList.push(idx)
    return idx
  }

  addTrailAlive(index: number): void {
    if (index < 0 || index >= MAX_PARTICLES) return
    if (this.trailCounts[index] === 1) {
      this.trailAliveList.push(index)
    }
  }

  removeTrailAlive(index: number): void {
    if (index < 0 || index >= MAX_PARTICLES) return
    const listIdx = this.trailAliveList.indexOf(index)
    if (listIdx !== -1) {
      const last = this.trailAliveList.length - 1
      this.trailAliveList[listIdx] = this.trailAliveList[last]
      this.trailAliveList.pop()
    }
  }

  release(index: number): void {
    if (index < 0 || index >= MAX_PARTICLES) return
    if (!this.alive[index] && this.trailDying[index] === 0) return
    const listIdx = this.aliveList.indexOf(index)
    if (listIdx !== -1) {
      const last = this.aliveList.length - 1
      this.aliveList[listIdx] = this.aliveList[last]
      this.aliveList.pop()
    }
    this.alive[index] = 0
    this.isFixed[index] = 0
    this.prevAge[index] = 0
    this.triggeredLifecycleEvents.fill(0, index * 8, index * 8 + 8)
    this.removeTrailAlive(index)
    this.trailCounts[index] = 0
    this.trailSampleCounters[index] = 0
    this.trailDying[index] = 0
    this.trailDyingRemaining[index] = 0
    this.prevPositions[index * 3] = 0
    this.prevPositions[index * 3 + 1] = 0
    this.prevPositions[index * 3 + 2] = 0
    this.freeList.push(index)
  }

  startTrailDying(index: number): void {
    if (index < 0 || index >= MAX_PARTICLES) return
    this.trailDying[index] = 1
    this.trailDyingRemaining[index] = this.trailCounts[index]
    if (this.alive[index]) {
      const listIdx = this.aliveList.indexOf(index)
      if (listIdx !== -1) {
        const last = this.aliveList.length - 1
        this.aliveList[listIdx] = this.aliveList[last]
        this.aliveList.pop()
      }
      this.alive[index] = 0
      this.prevAge[index] = 0
      this.triggeredLifecycleEvents.fill(0, index * 8, index * 8 + 8)
    }
  }

  isTrailOnly(index: number): boolean {
    return index >= 0 && index < MAX_PARTICLES && this.trailDying[index] === 1 && this.alive[index] === 0
  }

  hasAnyTrail(): boolean {
    return this.trailAliveList.length > 0
  }

  reset(): void {
    this.alive.fill(0)
    this.isFixed.fill(0)
    this.prevAge.fill(0)
    this.triggeredLifecycleEvents.fill(0)
    this.trailCounts.fill(0)
    this.trailSampleCounters.fill(0)
    this.trailDying.fill(0)
    this.trailDyingRemaining.fill(0)
    this.trailEmitterKeys.fill(0)
    this.positions.fill(0)
    this.prevPositions.fill(0)
    this.velocities.fill(0)
    this.freeList = []
    for (let i = MAX_PARTICLES - 1; i >= 0; i--) {
      this.freeList.push(i)
    }
    this.aliveList = []
    this.trailAliveList = []
  }

  setFixed(index: number, fixed: boolean): void {
    if (index < 0 || index >= MAX_PARTICLES) return
    this.isFixed[index] = fixed ? 1 : 0
  }

  isParticleFixed(index: number): boolean {
    return index >= 0 && index < MAX_PARTICLES && this.isFixed[index] === 1
  }

  getTrailAliveList(): readonly number[] {
    return this.trailAliveList
  }

  getCount(): number {
    return this.aliveList.length
  }

  getAliveCount(): number {
    return this.aliveList.length
  }

  getAliveList(): readonly number[] {
    return this.aliveList
  }

  isAlive(index: number): boolean {
    return index >= 0 && index < MAX_PARTICLES && this.alive[index] === 1
  }
}
