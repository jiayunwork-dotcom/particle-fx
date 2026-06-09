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

function stressColor(stress: number): THREE.Color {
  stress = Math.max(0, Math.min(1, stress))
  if (stress < 0.33) {
    const t = stress / 0.33
    return new THREE.Color(0x00ff44).lerp(new THREE.Color(0x88ff00), t)
  } else if (stress < 0.66) {
    const t = (stress - 0.33) / 0.33
    return new THREE.Color(0x88ff00).lerp(new THREE.Color(0xffff00), t)
  } else {
    const t = (stress - 0.66) / 0.34
    return new THREE.Color(0xffff00).lerp(new THREE.Color(0xff2222), t)
  }
}

export class ConstraintVisualizer {
  group: THREE.Group
  private distanceLines: Map<string, THREE.Line> = new Map()
  private angleArcs: Map<string, THREE.Line> = new Map()
  private areaHelpers: Map<string, THREE.LineSegments> = new Map()

  constructor() {
    this.group = new THREE.Group()
  }

  clear(): void {
    this.distanceLines.forEach(line => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    })
    this.distanceLines.clear()
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

  update(constraints: Constraint[], pool: ParticlePool): void {
    const validIds = new Set<string>()

    for (let i = 0; i < constraints.length; i++) {
      const c = constraints[i]
      validIds.add(c.id)
      if (c.type === 'distance') {
        this.updateDistanceLine(c, pool)
      } else if (c.type === 'angle') {
        this.updateAngleArc(c, pool)
      } else if (c.type === 'area') {
        this.updateAreaBox(c)
      }
    }

    const cleanup = <T extends THREE.Object3D>(map: Map<string, T>) => {
      map.forEach((obj, id) => {
        if (!validIds.has(id)) {
          if ((obj as any).geometry) (obj as any).geometry.dispose()
          if ((obj as any).material) {
            const mat = (obj as any).material
            if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose())
            else mat.dispose()
          }
          this.group.remove(obj)
          map.delete(id)
        }
      })
    }
    cleanup(this.distanceLines)
    cleanup(this.angleArcs)
    cleanup(this.areaHelpers)
  }

  private updateDistanceLine(c: DistanceConstraint, pool: ParticlePool): void {
    if (c.broken) return
    if (c.particleA < 0 || c.particleA >= MAX_PARTICLES) return
    if (c.particleB < 0 || c.particleB >= MAX_PARTICLES) return
    if (!pool.isAlive(c.particleA) || !pool.isAlive(c.particleB)) return

    const ax = pool.positions[c.particleA * 3]
    const ay = pool.positions[c.particleA * 3 + 1]
    const az = pool.positions[c.particleA * 3 + 2]
    const bx = pool.positions[c.particleB * 3]
    const by = pool.positions[c.particleB * 3 + 1]
    const bz = pool.positions[c.particleB * 3 + 2]

    const dx = bx - ax
    const dy = by - ay
    const dz = bz - az
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const stress = c.restDistance > 0 ? Math.abs(dist - c.restDistance) / (c.restDistance * 2) : 0

    let line = this.distanceLines.get(c.id)
    if (!line) {
      const positions = new Float32Array(6)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.9 })
      line = new THREE.Line(geo, mat)
      this.distanceLines.set(c.id, line)
      this.group.add(line)
    }

    const pos = (line.geometry.attributes.position.array as Float32Array)
    pos[0] = ax; pos[1] = ay; pos[2] = az
    pos[3] = bx; pos[4] = by; pos[5] = bz
    line.geometry.attributes.position.needsUpdate = true
    ;(line.material as THREE.LineBasicMaterial).color.copy(stressColor(stress))
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

    const points: THREE.Vector3[] = []
    const startAngle = Math.min(c.minAngle, currentAngle)
    const endAngle = Math.max(c.maxAngle, currentAngle)

    const crossX = ay * cz - az * cy
    const crossY = az * cx - ax * cz
    const crossZ = ax * cy - ay * cx
    let axisLen = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ)
    if (axisLen < 1e-6) {
      axisLen = 1
    }
    const axis = new THREE.Vector3(crossX / axisLen, crossY / axisLen, crossZ / axisLen)
    const ba = new THREE.Vector3(ax / la, ay / la, az / la)

    const arcPoints = (angle1: number, angle2: number, color: THREE.Color) => {
      for (let s = 0; s <= segments; s++) {
        const t = angle1 + (angle2 - angle1) * s / segments
        const v = ba.clone().applyAxisAngle(axis, t)
        points.push(new THREE.Vector3(bx + v.x * ar, by + v.y * ar, bz + v.z * ar))
      }
    }

    if (c.minAngle > 0) {
      arcPoints(0, c.minAngle, new THREE.Color(0x666666))
    }
    arcPoints(Math.max(0, c.minAngle), Math.min(endAngle, c.maxAngle), new THREE.Color(0x00ffff))
    if (c.maxAngle < Math.PI * 2) {
      arcPoints(c.maxAngle, Math.max(c.maxAngle, endAngle + 0.01), new THREE.Color(0x666666))
    }

    let arc = this.angleArcs.get(c.id)
    if (!arc) {
      const geo = new THREE.BufferGeometry()
      const mat = new THREE.LineBasicMaterial({ vertexColors: false, color: 0x00ffff, transparent: true, opacity: 0.8 })
      arc = new THREE.Line(geo, mat)
      this.angleArcs.set(c.id, arc)
      this.group.add(arc)
    }
    const geo = arc.geometry as THREE.BufferGeometry
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points.length * 3), 3))
    const arr = geo.attributes.position.array as Float32Array
    for (let i = 0; i < points.length; i++) {
      arr[i * 3] = points[i].x
      arr[i * 3 + 1] = points[i].y
      arr[i * 3 + 2] = points[i].z
    }
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
