import * as THREE from 'three'
import type { EmitterConfig, ForceField, CollisionPlane } from '@/types/particle'

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
