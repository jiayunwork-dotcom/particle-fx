import type { ParticlePool } from './ParticlePool'
import type { ParticleSnapshot, RecordingClip, Constraint, DistanceConstraint } from '@/types/particle'

const LAZY_LOAD_THRESHOLD = 1000
const FPS_WINDOW = 500
const MAX_DROP_THRESHOLD = 0.1

export class PlaybackRecorder {
  private isRecording = false
  private frames: ParticleSnapshot[] = []
  private frameInterval = 2
  private frameCounter = 0
  private startTime = 0
  private lastFrameTime = 0
  private fpsSampleCount = 0
  private fpsSampleStart = 0
  private lastAdjustedFps = 60
  private baseFps = 60
  private particleCountSnapshot = 0

  constructor() {}

  start(baseFps = 60, initialInterval = 2): void {
    this.isRecording = true
    this.frames = []
    this.frameInterval = initialInterval
    this.frameCounter = 0
    this.startTime = performance.now()
    this.lastFrameTime = this.startTime
    this.fpsSampleCount = 0
    this.fpsSampleStart = this.startTime
    this.baseFps = baseFps
    this.lastAdjustedFps = baseFps
    this.particleCountSnapshot = 0
  }

  stop(): RecordingClip | null {
    if (!this.isRecording) return null
    this.isRecording = false

    if (this.frames.length === 0) return null

    const totalDuration = (performance.now() - this.startTime) / 1000
    const id = crypto.randomUUID()
    const createdAt = Date.now()
    const clip: RecordingClip = {
      id,
      name: `录制片段 ${this.formatDate(createdAt)}`,
      createdAt,
      frameInterval: this.frameInterval,
      particleCount: this.particleCountSnapshot,
      totalFrames: this.frames.length,
      duration: totalDuration,
      frames: this.frames,
      lazyLoaded: this.frames.length > LAZY_LOAD_THRESHOLD,
      loadedFrames: new Set(),
    }

    return clip
  }

  capture(pool: ParticlePool, constraints: Constraint[], fixedParticles: number[]): void {
    if (!this.isRecording) return

    this.frameCounter++
    const now = performance.now()
    this.fpsSampleCount++

    if (now - this.fpsSampleStart >= FPS_WINDOW) {
      const elapsedMs = now - this.fpsSampleStart
      const currentFps = (this.fpsSampleCount / elapsedMs) * 1000
      this.adjustFrameInterval(currentFps)
      this.fpsSampleCount = 0
      this.fpsSampleStart = now
    }

    if (this.frameCounter < this.frameInterval) return
    this.frameCounter = 0

    const aliveList = pool.getAliveList()
    const positions: number[] = []
    const velocities: number[] = []

    for (let i = 0; i < aliveList.length; i++) {
      const idx = aliveList[i]
      positions.push(pool.positions[idx * 3])
      positions.push(pool.positions[idx * 3 + 1])
      positions.push(pool.positions[idx * 3 + 2])
      velocities.push(pool.velocities[idx * 3])
      velocities.push(pool.velocities[idx * 3 + 1])
      velocities.push(pool.velocities[idx * 3 + 2])
    }

    const brokenConstraintIds: string[] = []
    for (let i = 0; i < constraints.length; i++) {
      const c = constraints[i]
      if (c.type === 'distance' && (c as DistanceConstraint).broken) {
        brokenConstraintIds.push(c.id)
      }
    }

    const snapshot: ParticleSnapshot = {
      positions,
      velocities,
      aliveList: [...aliveList],
      brokenConstraintIds,
      fixedParticles: [...fixedParticles],
      timestamp: (now - this.startTime) / 1000,
    }

    this.frames.push(snapshot)
    this.particleCountSnapshot = Math.max(this.particleCountSnapshot, aliveList.length)
  }

  private adjustFrameInterval(currentFps: number): void {
    const dropRatio = (this.baseFps - currentFps) / this.baseFps
    if (dropRatio > MAX_DROP_THRESHOLD) {
      this.frameInterval = Math.min(this.frameInterval * 2, 32)
    } else if (dropRatio < MAX_DROP_THRESHOLD * 0.5 && this.frameInterval > 2) {
      this.frameInterval = Math.max(Math.floor(this.frameInterval / 2), 1)
    }
    this.lastAdjustedFps = currentFps
  }

  getCurrentFrameInterval(): number {
    return this.frameInterval
  }

  getRecording(): boolean {
    return this.isRecording
  }

  static interpolatePosition(
    clip: RecordingClip,
    targetFrame: number,
    particleIndex: number
  ): { x: number; y: number; z: number } | null {
    if (clip.frames.length === 0) return null

    const floorFrame = Math.max(0, Math.floor(targetFrame))
    const ceilFrame = Math.min(clip.frames.length - 1, Math.ceil(targetFrame))
    const t = targetFrame - floorFrame

    const f0 = clip.frames[floorFrame]
    const f1 = clip.frames[ceilFrame]

    if (!f0 || !f1) return null

    const pIdx0 = f0.aliveList.indexOf(particleIndex)
    const pIdx1 = f1.aliveList.indexOf(particleIndex)

    if (pIdx0 === -1 && pIdx1 === -1) return null

    if (pIdx0 === -1) {
      return {
        x: f1.positions[pIdx1 * 3],
        y: f1.positions[pIdx1 * 3 + 1],
        z: f1.positions[pIdx1 * 3 + 2],
      }
    }

    if (pIdx1 === -1) {
      return {
        x: f0.positions[pIdx0 * 3],
        y: f0.positions[pIdx0 * 3 + 1],
        z: f0.positions[pIdx0 * 3 + 2],
      }
    }

    return {
      x: f0.positions[pIdx0 * 3] * (1 - t) + f1.positions[pIdx1 * 3] * t,
      y: f0.positions[pIdx0 * 3 + 1] * (1 - t) + f1.positions[pIdx1 * 3 + 1] * t,
      z: f0.positions[pIdx0 * 3 + 2] * (1 - t) + f1.positions[pIdx1 * 3 + 2] * t,
    }
  }

  static getClipForExport(clip: RecordingClip): object {
    return {
      id: clip.id,
      name: clip.name,
      createdAt: clip.createdAt,
      frameInterval: clip.frameInterval,
      particleCount: clip.particleCount,
      totalFrames: clip.totalFrames,
      duration: clip.duration,
      frames: clip.frames,
    }
  }

  static validateImportedClip(data: unknown): { valid: boolean; error?: string; clip?: RecordingClip } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: '无效的JSON格式' }
    }
    const obj = data as Record<string, unknown>
    if (!Array.isArray(obj.frames) || obj.frames.length === 0) {
      return { valid: false, error: '帧数组为空或无效' }
    }
    const frames = obj.frames as Array<Record<string, unknown>>

    const particleCounts = new Set<number>()
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      if (!frame || typeof frame !== 'object') {
        return { valid: false, error: `第 ${i} 帧数据无效` }
      }
      const f = frame as Record<string, unknown>
      if (!Array.isArray(f.aliveList) || !Array.isArray(f.positions)) {
        return { valid: false, error: `第 ${i} 帧缺少 aliveList 或 positions` }
      }
      const aliveList = f.aliveList as number[]
      const positions = f.positions as number[]
      if (positions.length !== aliveList.length * 3) {
        return { valid: false, error: `第 ${i} 帧粒子位置数量与aliveList不匹配` }
      }
      particleCounts.add(aliveList.length)
    }

    if (particleCounts.size > 1) {
      return { valid: false, error: '每帧粒子数不一致' }
    }

    const particleSnapshots = obj.frames as ParticleSnapshot[]

    const clip: RecordingClip = {
      id: (obj.id as string) ?? crypto.randomUUID(),
      name: (obj.name as string) ?? `导入片段 ${new Date().toLocaleTimeString()}`,
      createdAt: (obj.createdAt as number) ?? Date.now(),
      frameInterval: (obj.frameInterval as number) ?? 2,
      particleCount: (obj.particleCount as number) ?? particleSnapshots[0].aliveList.length,
      totalFrames: particleSnapshots.length,
      duration: (obj.duration as number) ?? (particleSnapshots.length * ((obj.frameInterval as number) ?? 2)) / 60,
      frames: particleSnapshots,
      lazyLoaded: particleSnapshots.length > LAZY_LOAD_THRESHOLD,
      loadedFrames: new Set(),
    }

    return { valid: true, clip }
  }

  private formatDate(timestamp: number): string {
    const d = new Date(timestamp)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  downloadClipAsJSON(clip: RecordingClip): void {
    const exportData = PlaybackRecorder.getClipForExport(clip)
    const jsonStr = JSON.stringify(exportData, null, 0)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${clip.name}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
