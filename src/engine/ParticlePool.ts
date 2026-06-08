export const MAX_PARTICLES = 50000

export class ParticlePool {
  readonly positions: Float32Array
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
  readonly ownerIds: Uint32Array
  readonly prevAge: Float32Array
  readonly triggeredLifecycleEvents: Uint8Array

  private freeList: number[]
  private aliveList: number[]

  constructor() {
    const N = MAX_PARTICLES
    this.positions = new Float32Array(N * 3)
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
    this.ownerIds = new Uint32Array(N)
    this.prevAge = new Float32Array(N)
    this.triggeredLifecycleEvents = new Uint8Array(N * 8)

    this.freeList = []
    for (let i = N - 1; i >= 0; i--) {
      this.freeList.push(i)
    }
    this.aliveList = []
  }

  acquire(ownerKey: number): number {
    if (this.freeList.length === 0) return -1
    const idx = this.freeList.pop()!
    this.alive[idx] = 1
    this.ownerIds[idx] = ownerKey
    this.aliveList.push(idx)
    return idx
  }

  release(index: number): void {
    if (index < 0 || index >= MAX_PARTICLES) return
    if (!this.alive[index]) return
    const listIdx = this.aliveList.indexOf(index)
    if (listIdx !== -1) {
      const last = this.aliveList.length - 1
      this.aliveList[listIdx] = this.aliveList[last]
      this.aliveList.pop()
    }
    this.alive[index] = 0
    this.prevAge[index] = 0
    this.triggeredLifecycleEvents.fill(0, index * 8, index * 8 + 8)
    this.freeList.push(index)
  }

  reset(): void {
    this.alive.fill(0)
    this.prevAge.fill(0)
    this.triggeredLifecycleEvents.fill(0)
    this.freeList = []
    for (let i = MAX_PARTICLES - 1; i >= 0; i--) {
      this.freeList.push(i)
    }
    this.aliveList = []
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
