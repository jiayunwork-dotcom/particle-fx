import * as THREE from 'three'
import type { BlendMode } from '@/types/particle'
import { ParticlePool, MAX_PARTICLES, MAX_TRAIL_LENGTH } from '@/engine/ParticlePool'

const MAX_TRAIL_SEGMENTS = MAX_PARTICLES * MAX_TRAIL_LENGTH
const MAX_VERTICES = MAX_TRAIL_SEGMENTS * 4
const MAX_INDICES = MAX_TRAIL_SEGMENTS * 6

const vertexShader = `
attribute vec3 aStartPos;
attribute vec3 aEndPos;
attribute vec2 aSideUv;
attribute vec4 aStartColor;
attribute vec4 aEndColor;
attribute float aStartWidth;
attribute float aEndWidth;
attribute float aSegAlpha;

uniform float uWidthScale;

varying vec4 vColor;
varying float vSegAlpha;

void main() {
  float side = aSideUv.x;
  float along = aSideUv.y;

  vec3 startPos = aStartPos;
  vec3 endPos = aEndPos;
  vec3 midPos = (startPos + endPos) * 0.5;
  vec3 basePos = mix(startPos, endPos, along);

  vec3 lineDir = endPos - startPos;
  float lineLen = length(lineDir);
  if (lineLen < 0.0001) {
    lineDir = vec3(1.0, 0.0, 0.0);
  } else {
    lineDir = lineDir / lineLen;
  }

  vec3 camDir = normalize(cameraPosition - basePos);
  vec3 widthDir = normalize(cross(camDir, lineDir));
  if (length(widthDir) < 0.0001) {
    widthDir = normalize(cross(camDir, vec3(0.0, 1.0, 0.0)));
  }

  float width = mix(aStartWidth, aEndWidth, along) * 0.5 * uWidthScale;
  vec3 worldPos = basePos + widthDir * side * width;

  vec4 color = mix(aStartColor, aEndColor, along);
  vColor = color;
  vSegAlpha = aSegAlpha;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
`

const fragmentShader = `
varying vec4 vColor;
varying float vSegAlpha;

uniform int uBlendMode;

void main() {
  vec4 color = vColor;
  color.a *= vSegAlpha;

  if (uBlendMode == 0) {
    color.rgb *= color.a;
  } else if (uBlendMode == 2) {
    color.rgb = vec3(1.0) - (vec3(1.0) - color.rgb) * color.a;
  }

  gl_FragColor = color;
}
`

export interface TrailEmitterConfig {
  id: string
  ownerKey: number
  blendMode: BlendMode
  trailWidth: number
  trailColorMode: 'particle' | 'fixed'
  trailFixedColor: [number, number, number]
}

export class TrailRenderer {
  private scene: THREE.Scene
  private material: THREE.ShaderMaterial
  private geometry: THREE.BufferGeometry
  private mesh: THREE.Mesh

  private aStartPos: THREE.BufferAttribute
  private aEndPos: THREE.BufferAttribute
  private aSideUv: THREE.BufferAttribute
  private aStartColor: THREE.BufferAttribute
  private aEndColor: THREE.BufferAttribute
  private aStartWidth: THREE.BufferAttribute
  private aEndWidth: THREE.BufferAttribute
  private aSegAlpha: THREE.BufferAttribute
  private indexBuffer: THREE.BufferAttribute

  private vertexCount: number = 0
  private indexCount: number = 0

  private emitterConfigs: Map<number, TrailEmitterConfig> = new Map()

  constructor(scene: THREE.Scene) {
    this.scene = scene

    const startPosArr = new Float32Array(MAX_VERTICES * 3)
    const endPosArr = new Float32Array(MAX_VERTICES * 3)
    const sideUvArr = new Float32Array(MAX_VERTICES * 2)
    const startColorArr = new Float32Array(MAX_VERTICES * 4)
    const endColorArr = new Float32Array(MAX_VERTICES * 4)
    const startWidthArr = new Float32Array(MAX_VERTICES)
    const endWidthArr = new Float32Array(MAX_VERTICES)
    const segAlphaArr = new Float32Array(MAX_VERTICES)
    const indicesArr = new Uint32Array(MAX_INDICES)

    this.geometry = new THREE.BufferGeometry()
    this.aStartPos = new THREE.BufferAttribute(startPosArr, 3)
    this.aEndPos = new THREE.BufferAttribute(endPosArr, 3)
    this.aSideUv = new THREE.BufferAttribute(sideUvArr, 2)
    this.aStartColor = new THREE.BufferAttribute(startColorArr, 4)
    this.aEndColor = new THREE.BufferAttribute(endColorArr, 4)
    this.aStartWidth = new THREE.BufferAttribute(startWidthArr, 1)
    this.aEndWidth = new THREE.BufferAttribute(endWidthArr, 1)
    this.aSegAlpha = new THREE.BufferAttribute(segAlphaArr, 1)
    this.indexBuffer = new THREE.BufferAttribute(indicesArr, 1)

    this.aStartPos.setUsage(THREE.DynamicDrawUsage)
    this.aEndPos.setUsage(THREE.DynamicDrawUsage)
    this.aSideUv.setUsage(THREE.DynamicDrawUsage)
    this.aStartColor.setUsage(THREE.DynamicDrawUsage)
    this.aEndColor.setUsage(THREE.DynamicDrawUsage)
    this.aStartWidth.setUsage(THREE.DynamicDrawUsage)
    this.aEndWidth.setUsage(THREE.DynamicDrawUsage)
    this.aSegAlpha.setUsage(THREE.DynamicDrawUsage)
    this.indexBuffer.setUsage(THREE.DynamicDrawUsage)

    this.geometry.setAttribute('aStartPos', this.aStartPos)
    this.geometry.setAttribute('aEndPos', this.aEndPos)
    this.geometry.setAttribute('aSideUv', this.aSideUv)
    this.geometry.setAttribute('aStartColor', this.aStartColor)
    this.geometry.setAttribute('aEndColor', this.aEndColor)
    this.geometry.setAttribute('aStartWidth', this.aStartWidth)
    this.geometry.setAttribute('aEndWidth', this.aEndWidth)
    this.geometry.setAttribute('aSegAlpha', this.aSegAlpha)
    this.geometry.setIndex(this.indexBuffer)

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uWidthScale: { value: 1.0 },
        uBlendMode: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.scene.add(this.mesh)
  }

  setPixelRatio(ratio: number): void {
    this.material.uniforms.uWidthScale.value = ratio
  }

  updateEmitterConfig(config: TrailEmitterConfig): void {
    this.emitterConfigs.set(config.ownerKey, config)
  }

  removeEmitterConfig(ownerKey: number): void {
    this.emitterConfigs.delete(ownerKey)
  }

  clearEmitterConfigs(): void {
    this.emitterConfigs.clear()
  }

  updateFromPool(pool: ParticlePool): void {
    this.vertexCount = 0
    this.indexCount = 0

    const startPosArr = this.aStartPos.array as Float32Array
    const endPosArr = this.aEndPos.array as Float32Array
    const sideUvArr = this.aSideUv.array as Float32Array
    const startColorArr = this.aStartColor.array as Float32Array
    const endColorArr = this.aEndColor.array as Float32Array
    const startWidthArr = this.aStartWidth.array as Float32Array
    const endWidthArr = this.aEndWidth.array as Float32Array
    const segAlphaArr = this.aSegAlpha.array as Float32Array
    const indicesArr = this.indexBuffer.array as Uint32Array

    let anyTrail = false

    const trailList = pool.getTrailAliveList()
    for (let j = 0; j < trailList.length; j++) {
      const pi = trailList[j]
      const count = pool.trailCounts[pi]
      if (count < 2) continue

      const ownerKey = pool.trailEmitterKeys[pi]
      const config = this.emitterConfigs.get(ownerKey)
      if (!config) continue

      anyTrail = true

      const widthMult = config.trailWidth

      const totalSegs = count - 1
      for (let seg = 0; seg < totalSegs; seg++) {
        if (this.vertexCount + 4 > MAX_VERTICES) break
        if (this.indexCount + 6 > MAX_INDICES) break

        const idx0 = seg
        const idx1 = seg + 1

        const i0Base = pi * MAX_TRAIL_LENGTH + idx0
        const i1Base = pi * MAX_TRAIL_LENGTH + idx1

        const p0x = pool.trailPositions[i0Base * 3]
        const p0y = pool.trailPositions[i0Base * 3 + 1]
        const p0z = pool.trailPositions[i0Base * 3 + 2]

        const p1x = pool.trailPositions[i1Base * 3]
        const p1y = pool.trailPositions[i1Base * 3 + 1]
        const p1z = pool.trailPositions[i1Base * 3 + 2]

        const size0 = pool.trailSizes[i0Base]
        const size1 = pool.trailSizes[i1Base]

        const c0r = pool.trailColors[i0Base * 4]
        const c0g = pool.trailColors[i0Base * 4 + 1]
        const c0b = pool.trailColors[i0Base * 4 + 2]
        const c0a = pool.trailColors[i0Base * 4 + 3]

        const c1r = pool.trailColors[i1Base * 4]
        const c1g = pool.trailColors[i1Base * 4 + 1]
        const c1b = pool.trailColors[i1Base * 4 + 2]
        const c1a = pool.trailColors[i1Base * 4 + 3]

        let fr = c0r, fg = c0g, fb = c0b
        if (config.trailColorMode === 'fixed') {
          fr = config.trailFixedColor[0]
          fg = config.trailFixedColor[1]
          fb = config.trailFixedColor[2]
        }
        let sr = c1r, sg = c1g, sb = c1b
        if (config.trailColorMode === 'fixed') {
          sr = config.trailFixedColor[0]
          sg = config.trailFixedColor[1]
          sb = config.trailFixedColor[2]
        }

        const width0 = size0 * widthMult
        const width1 = size1 * widthMult

        const segAlpha0 = idx0 / Math.max(1, totalSegs)
        const segAlpha1 = idx1 / Math.max(1, totalSegs)

        const vBase = this.vertexCount

        for (let v = 0; v < 4; v++) {
          const vIdx = vBase + v
          const vi3 = vIdx * 3
          const vi2 = vIdx * 2
          const vi4 = vIdx * 4

          let side: number
          let along: number

          if (v === 0) {
            side = -1; along = 0
          } else if (v === 1) {
            side = 1; along = 0
          } else if (v === 2) {
            side = 1; along = 1
          } else {
            side = -1; along = 1
          }

          startPosArr[vi3] = p0x
          startPosArr[vi3 + 1] = p0y
          startPosArr[vi3 + 2] = p0z

          endPosArr[vi3] = p1x
          endPosArr[vi3 + 1] = p1y
          endPosArr[vi3 + 2] = p1z

          sideUvArr[vi2] = side
          sideUvArr[vi2 + 1] = along

          startColorArr[vi4] = fr
          startColorArr[vi4 + 1] = fg
          startColorArr[vi4 + 2] = fb
          startColorArr[vi4 + 3] = c0a

          endColorArr[vi4] = sr
          endColorArr[vi4 + 1] = sg
          endColorArr[vi4 + 2] = sb
          endColorArr[vi4 + 3] = c1a

          startWidthArr[vIdx] = width0
          endWidthArr[vIdx] = width1
          segAlphaArr[vIdx] = along < 0.5 ? segAlpha0 : segAlpha1
        }

        indicesArr[this.indexCount] = vBase
        indicesArr[this.indexCount + 1] = vBase + 1
        indicesArr[this.indexCount + 2] = vBase + 2
        indicesArr[this.indexCount + 3] = vBase
        indicesArr[this.indexCount + 4] = vBase + 2
        indicesArr[this.indexCount + 5] = vBase + 3

        this.vertexCount += 4
        this.indexCount += 6
      }
    }

    this.aStartPos.needsUpdate = true
    this.aEndPos.needsUpdate = true
    this.aSideUv.needsUpdate = true
    this.aStartColor.needsUpdate = true
    this.aEndColor.needsUpdate = true
    this.aStartWidth.needsUpdate = true
    this.aEndWidth.needsUpdate = true
    this.aSegAlpha.needsUpdate = true
    this.indexBuffer.needsUpdate = true

    this.geometry.setDrawRange(0, this.indexCount)
    this.mesh.visible = anyTrail && this.indexCount > 0
  }

  setBlendMode(mode: BlendMode): void {
    switch (mode) {
      case 'additive':
        this.material.blending = THREE.AdditiveBlending
        this.material.uniforms.uBlendMode.value = 0
        break
      case 'alpha':
        this.material.blending = THREE.NormalBlending
        this.material.uniforms.uBlendMode.value = 1
        break
      case 'multiply':
        this.material.blending = THREE.MultiplyBlending
        this.material.uniforms.uBlendMode.value = 2
        break
    }
    this.material.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.scene.remove(this.mesh)
  }
}
