import * as THREE from 'three'
import type { EmitterConfig, ForceField, CollisionPlane, Constraint, DistanceConstraint, AngleConstraint, AreaConstraint } from '@/types/particle'
import type { ParticlePool } from '@/engine/ParticlePool'
import { MAX_PARTICLES } from '@/engine/ParticlePool'

export function createEmitterWireframe(config: EmitterConfig): THREE.LineSegments {
  const points: THREE.Vector3[] = []
  const segments = 32
  const params = config.shapeParams

  switch (config.shape) {
    case 'point': {
      points.push(new THREE.Vector3(0, 0, 0))
      points.push(new THREE.Vector3(0, 0, 0))
      break
    }
    case 'circle': {
      const r = params.radius ?? 1
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2
        const a2 = ((i + 1) / segments) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a1) * r, Math.sin(a1) * r, 0))
        points.push(new THREE.Vector3(Math.cos(a2) * r, Math.sin(a2) * r, 0))
      }
      break
    }
    case 'rectangle': {
      const w = (params.width ?? 1) / 2
      const h = (params.height ?? 1) / 2
      points.push(new THREE.Vector3(-w, -h, 0), new THREE.Vector3(w, -h, 0))
      points.push(new THREE.Vector3(w, -h, 0), new THREE.Vector3(w, h, 0))
      points.push(new THREE.Vector3(w, h, 0), new THREE.Vector3(-w, h, 0))
      points.push(new THREE.Vector3(-w, h, 0), new THREE.Vector3(-w, -h, 0))
      break
    }
    case 'sphere': {
      const r = params.radius ?? 1
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2
        const a2 = ((i + 1) / segments) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a1) * r, 0, Math.sin(a1) * r))
        points.push(new THREE.Vector3(Math.cos(a2) * r, 0, Math.sin(a2) * r))
      }
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2
        const a2 = ((i + 1) / segments) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a1) * r, Math.sin(a1) * r, 0))
        points.push(new THREE.Vector3(Math.cos(a2) * r, Math.sin(a2) * r, 0))
      }
      break
    }
    case 'cone': {
      const angle = (params.angle ?? 45) * Math.PI / 180
      const r = params.radius ?? 1
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      const topY = cosA * r
      const baseR = sinA * r
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2
        const a2 = ((i + 1) / segments) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a1) * baseR, topY, Math.sin(a1) * baseR))
        points.push(new THREE.Vector3(Math.cos(a2) * baseR, topY, Math.sin(a2) * baseR))
        points.push(new THREE.Vector3(Math.cos(a1) * baseR, topY, Math.sin(a1) * baseR))
        points.push(new THREE.Vector3(0, 0, 0))
      }
      break
    }
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 })
  const lines = new THREE.LineSegments(geo, mat)
  lines.position.set(config.position[0], config.position[1], config.position[2])
  return lines
}

export function createForceFieldHelper(field: ForceField): THREE.Group {
  const group = new THREE.Group()

  const sphereGeo = new THREE.SphereGeometry(field.radius, 16, 12)
  const sphereMat = new THREE.MeshBasicMaterial({
    color: field.type === 'gravity' ? 0x4444ff : field.type === 'repulsion' ? 0xff4444 : 0x44ff44,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  })
  const sphere = new THREE.Mesh(sphereGeo, sphereMat)
  group.add(sphere)

  const dir = field.direction ?? [0, 0, 0]
  const dirLen = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2])

  if (field.type === 'directional' && dirLen > 0.001) {
    const arrowDir = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize()
    const arrow = new THREE.ArrowHelper(arrowDir, new THREE.Vector3(0, 0, 0), field.radius * 0.5, 0xffff00, field.radius * 0.15, field.radius * 0.08)
    group.add(arrow)
  } else if (field.type === 'gravity') {
    const center = new THREE.Vector3(0, 0, 0)
    const dirs = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ]
    dirs.forEach(d => {
      const arrow = new THREE.ArrowHelper(d, center, field.radius * 0.3, 0x6666ff, field.radius * 0.1, field.radius * 0.06)
      group.add(arrow)
    })
  } else if (field.type === 'repulsion') {
    const center = new THREE.Vector3(0, 0, 0)
    const dirs = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ]
    dirs.forEach(d => {
      const arrow = new THREE.ArrowHelper(d.negate(), center, field.radius * 0.3, 0xff6666, field.radius * 0.1, field.radius * 0.06)
      group.add(arrow)
    })
  }

  group.position.set(field.position[0], field.position[1], field.position[2])
  return group
}

export function createCollisionPlaneHelper(plane: CollisionPlane): THREE.Mesh {
  const n = plane.normal
  const nLen = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2])
  const nx = nLen > 0.001 ? n[0] / nLen : 0
  const ny = nLen > 0.001 ? n[1] / nLen : 1
  const nz = nLen > 0.001 ? n[2] / nLen : 0

  const geo = new THREE.PlaneGeometry(10, 10)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(plane.position[0], plane.position[1], plane.position[2])
  mesh.lookAt(
    plane.position[0] + nx,
    plane.position[1] + ny,
    plane.position[2] + nz
  )
  return mesh
}

export function createAreaConstraintHelper(area: AreaConstraint): THREE.LineSegments {
  const hx = area.halfExtents[0]
  const hy = area.halfExtents[1]
  const hz = area.halfExtents[2]

  const corners = [
    new THREE.Vector3(-hx, -hy, -hz), new THREE.Vector3(hx, -hy, -hz),
    new THREE.Vector3(hx, -hy, -hz), new THREE.Vector3(hx, hy, -hz),
    new THREE.Vector3(hx, hy, -hz), new THREE.Vector3(-hx, hy, -hz),
    new THREE.Vector3(-hx, hy, -hz), new THREE.Vector3(-hx, -hy, -hz),
    new THREE.Vector3(-hx, -hy, hz), new THREE.Vector3(hx, -hy, hz),
    new THREE.Vector3(hx, -hy, hz), new THREE.Vector3(hx, hy, hz),
    new THREE.Vector3(hx, hy, hz), new THREE.Vector3(-hx, hy, hz),
    new THREE.Vector3(-hx, hy, hz), new THREE.Vector3(-hx, -hy, hz),
    new THREE.Vector3(-hx, -hy, -hz), new THREE.Vector3(-hx, -hy, hz),
    new THREE.Vector3(hx, -hy, -hz), new THREE.Vector3(hx, -hy, hz),
    new THREE.Vector3(hx, hy, -hz), new THREE.Vector3(hx, hy, hz),
    new THREE.Vector3(-hx, hy, -hz), new THREE.Vector3(-hx, hy, hz),
  ]

  const geo = new THREE.BufferGeometry().setFromPoints(corners)
  const mat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7 })
  const lines = new THREE.LineSegments(geo, mat)
  lines.position.set(area.center[0], area.center[1], area.center[2])
  return lines
}

const _stressResult = new THREE.Color()
const _stressColors = [
  new THREE.Color(0x00ff44),
  new THREE.Color(0x88ff00),
  new THREE.Color(0xffff00),
  new THREE.Color(0xff2222),
]
function stressColor(stress: number): THREE.Color {
  stress = Math.max(0, Math.min(1, stress))
  if (stress < 0.33) {
    const t = stress / 0.33
    return _stressResult.copy(_stressColors[0]).lerp(_stressColors[1], t)
  } else if (stress < 0.66) {
    const t = (stress - 0.33) / 0.33
    return _stressResult.copy(_stressColors[1]).lerp(_stressColors[2], t)
  } else {
    const t = (stress - 0.66) / 0.34
    return _stressResult.copy(_stressColors[2]).lerp(_stressColors[3], t)
  }
}

export class ConstraintVisualizer {
  group: THREE.Group
  private mergedDistance: THREE.LineSegments | null = null
  private mergedPositions: Float32Array = new Float32Array(0)
  private mergedColors: Float32Array = new Float32Array(0)
  private mergedCapacity = 0
  private angleArcs: Map<string, THREE.Line> = new Map()
  private areaHelpers: Map<string, THREE.LineSegments> = new Map()
  private readonly CHUNK_SIZE = 1024

  constructor() {
    this.group = new THREE.Group()
  }

  clear(): void {
    if (this.mergedDistance) {
      this.mergedDistance.geometry.dispose()
      ;(this.mergedDistance.material as THREE.Material).dispose()
      this.group.remove(this.mergedDistance)
      this.mergedDistance = null
    }
    this.mergedCapacity = 0
    this.mergedPositions = new Float32Array(0)
    this.mergedColors = new Float32Array(0)
    this.angleArcs.forEach(arc => {
      arc.geometry.dispose()
      ;(arc.material as THREE.Material).dispose()
    })
    this.angleArcs.clear()
    this.areaHelpers.forEach(box => {
      box.geometry.dispose()
      ;(box.material as THREE.Material).dispose()
    })
    this.areaHelpers.clear()
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0])
    }
  }

  private ensureCapacity(segmentsNeeded: number): void {
    const needed = segmentsNeeded * 2 * 3
    if (needed <= this.mergedCapacity) return
    const chunks = Math.ceil(segmentsNeeded / this.CHUNK_SIZE)
    const newCap = chunks * this.CHUNK_SIZE * 2 * 3
    const newPos = new Float32Array(newCap)
    const newCol = new Float32Array(newCap)
    if (this.mergedPositions.length > 0) {
      newPos.set(this.mergedPositions)
      newCol.set(this.mergedColors)
    }
    this.mergedPositions = newPos
    this.mergedColors = newCol
    this.mergedCapacity = newCap
    if (this.mergedDistance) {
      this.mergedDistance.geometry.dispose()
      this.group.remove(this.mergedDistance)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.mergedPositions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this.mergedColors, 3))
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })
    this.mergedDistance = new THREE.LineSegments(geo, mat)
    this.group.add(this.mergedDistance)
  }

  update(constraints: Constraint[], pool: ParticlePool): void {
    const validIds = new Set<string>()
    const validAngleIds = new Set<string>()
    const validAreaIds = new Set<string>()

    let distanceCount = 0
    for (let i = 0; i < constraints.length; i++) {
      if (constraints[i].type === 'distance' && !((constraints[i] as DistanceConstraint).broken)) {
        distanceCount++
      }
    }

    this.ensureCapacity(distanceCount)
    let distanceWrite = 0

    for (let i = 0; i < constraints.length; i++) {
      const c = constraints[i]
      validIds.add(c.id)
      if (c.type === 'distance') {
        const written = this.writeDistanceSegment(c as DistanceConstraint, pool, distanceWrite)
        if (written >= 0) {
          distanceWrite++
        }
      } else if (c.type === 'angle') {
        validAngleIds.add(c.id)
        this.updateAngleArc(c as AngleConstraint, pool)
      } else if (c.type === 'area') {
        validAreaIds.add(c.id)
        this.updateAreaBox(c as AreaConstraint)
      }
    }

    if (this.mergedDistance && this.mergedDistance.geometry) {
      const geo = this.mergedDistance.geometry as THREE.BufferGeometry
      geo.setDrawRange(0, distanceWrite * 2)
      if (geo.attributes.position) {
        geo.attributes.position.needsUpdate = true
      }
      if (geo.attributes.color) {
        geo.attributes.color.needsUpdate = true
      }
    }

    this.angleArcs.forEach((obj, id) => {
      if (!validAngleIds.has(id)) {
        obj.geometry.dispose()
        const mat = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat.dispose()
        this.group.remove(obj)
        this.angleArcs.delete(id)
      }
    })
    this.areaHelpers.forEach((obj, id) => {
      if (!validAreaIds.has(id)) {
        obj.geometry.dispose()
        const mat = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat.dispose()
        this.group.remove(obj)
        this.areaHelpers.delete(id)
      }
    })
  }

  private writeDistanceSegment(c: DistanceConstraint, pool: ParticlePool, slot: number): number {
    if (c.broken) return -1
    if (c.particleA < 0 || c.particleA >= MAX_PARTICLES) return -1
    if (c.particleB < 0 || c.particleB >= MAX_PARTICLES) return -1
    if (!pool.isAlive(c.particleA) || !pool.isAlive(c.particleB)) return -1

    const ax = pool.positions[c.particleA * 3]
    const ay = pool.positions[c.particleA * 3 + 1]
    const az = pool.positions[c.particleA * 3 + 2]
    const bx = pool.positions[c.particleB * 3]
    const by = pool.positions[c.particleB * 3 + 1]
    const bz = pool.positions[c.particleB * 3 + 2]

    const dx = bx - ax
    const dy = by - ay
    const dz = bz - az
    const distSq = dx * dx + dy * dy + dz * dz
    const dist = Math.sqrt(distSq)
    const stress = c.restDistance > 0 ? Math.abs(dist - c.restDistance) / (c.restDistance * 2) : 0

    const col = stressColor(stress)
    const pi = slot * 2 * 3

    this.mergedPositions[pi] = ax
    this.mergedPositions[pi + 1] = ay
    this.mergedPositions[pi + 2] = az
    this.mergedPositions[pi + 3] = bx
    this.mergedPositions[pi + 4] = by
    this.mergedPositions[pi + 5] = bz

    this.mergedColors[pi] = col.r
    this.mergedColors[pi + 1] = col.g
    this.mergedColors[pi + 2] = col.b
    this.mergedColors[pi + 3] = col.r
    this.mergedColors[pi + 4] = col.g
    this.mergedColors[pi + 5] = col.b

    return slot
  }

  private updateAngleArc(c: AngleConstraint, pool: ParticlePool): void {
    if (c.particleA < 0 || c.particleA >= MAX_PARTICLES) return
    if (c.particleB < 0 || c.particleB >= MAX_PARTICLES) return
    if (c.particleC < 0 || c.particleC >= MAX_PARTICLES) return
    if (!pool.isAlive(c.particleA) || !pool.isAlive(c.particleB) || !pool.isAlive(c.particleC)) return

    const bx = pool.positions[c.particleB * 3]
    const by = pool.positions[c.particleB * 3 + 1]
    const bz = pool.positions[c.particleB * 3 + 2]
    const ax = pool.positions[c.particleA * 3] - bx
    const ay = pool.positions[c.particleA * 3 + 1] - by
    const az = pool.positions[c.particleA * 3 + 2] - bz
    const cx = pool.positions[c.particleC * 3] - bx
    const cy = pool.positions[c.particleC * 3 + 1] - by
    const cz = pool.positions[c.particleC * 3 + 2] - bz

    const la = Math.sqrt(ax * ax + ay * ay + az * az)
    const lc = Math.sqrt(cx * cx + cy * cy + cz * cz)
    if (la < 1e-4 || lc < 1e-4) return

    const ar = 0.3 * Math.min(la, lc)
    let dot = (ax * cx + ay * cy + az * cz) / (la * lc)
    dot = Math.max(-1, Math.min(1, dot))
    const currentAngle = Math.acos(dot)
    const segments = 24

    const crossX = ay * cz - az * cy
    const crossY = az * cx - ax * cz
    const crossZ = ax * cy - ay * cx
    let axisLen = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ)
    if (axisLen < 1e-6) {
      axisLen = 1
    }
    const axis = new THREE.Vector3(crossX / axisLen, crossY / axisLen, crossZ / axisLen)
    const ba = new THREE.Vector3(ax / la, ay / la, az / la)
    const endAngle = Math.max(c.maxAngle, currentAngle)

    let arc = this.angleArcs.get(c.id)
    let geo: THREE.BufferGeometry
    let positionArr: Float32Array
    const totalPoints = (segments + 1) * 3
    const expectedLength = totalPoints * 3

    if (!arc) {
      geo = new THREE.BufferGeometry()
      positionArr = new Float32Array(expectedLength)
      geo.setAttribute('position', new THREE.BufferAttribute(positionArr, 3))
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 })
      arc = new THREE.Line(geo, mat)
      this.angleArcs.set(c.id, arc)
      this.group.add(arc)
    } else {
      geo = arc.geometry as THREE.BufferGeometry
      const existing = geo.attributes.position.array as Float32Array
      if (existing.length !== expectedLength) {
        geo.dispose()
        positionArr = new Float32Array(expectedLength)
        geo.setAttribute('position', new THREE.BufferAttribute(positionArr, 3))
      } else {
        positionArr = existing
      }
    }

    let writeIdx = 0
    const writeArc = (angle1: number, angle2: number) => {
      for (let s = 0; s <= segments; s++) {
        const t = angle1 + (angle2 - angle1) * s / segments
        const cosT = Math.cos(t)
        const sinT = Math.sin(t)
        const x = ba.x
        const y = ba.y
        const z = ba.z
        const ux = axis.x
        const uy = axis.y
        const uz = axis.z
        const vx = x * cosT + (uy * z - uz * y) * sinT + ux * (ux * x + uy * y + uz * z) * (1 - cosT)
        const vy = y * cosT + (uz * x - ux * z) * sinT + uy * (ux * x + uy * y + uz * z) * (1 - cosT)
        const vz = z * cosT + (ux * y - uy * x) * sinT + uz * (ux * x + uy * y + uz * z) * (1 - cosT)
        positionArr[writeIdx++] = bx + vx * ar
        positionArr[writeIdx++] = by + vy * ar
        positionArr[writeIdx++] = bz + vz * ar
      }
    }
    if (c.minAngle > 0) writeArc(0, c.minAngle)
    writeArc(Math.max(0, c.minAngle), Math.min(endAngle, c.maxAngle))
    if (c.maxAngle < Math.PI * 2) writeArc(c.maxAngle, Math.max(c.maxAngle, endAngle + 0.01))

    geo.setDrawRange(0, writeIdx / 3 - 1)
    geo.attributes.position.needsUpdate = true
    geo.computeBoundingSphere()
  }

  private updateAreaBox(c: AreaConstraint): void {
    let box = this.areaHelpers.get(c.id)
    if (!box) {
      box = createAreaConstraintHelper(c)
      this.areaHelpers.set(c.id, box)
      this.group.add(box)
    }
    box.position.set(c.center[0], c.center[1], c.center[2])
  }
}
