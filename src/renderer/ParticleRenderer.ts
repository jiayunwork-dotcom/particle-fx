import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { BlendMode } from '@/types/particle'
import { ParticlePool } from '@/engine/ParticlePool'
import { MAX_PARTICLES } from '@/engine/ParticlePool'
import { createSoftCircleTexture, createSquareTexture, createStarTexture, createSmokeTexture } from './BuiltInTextures'

const vertexShader = `
attribute vec3 instancePosition;
attribute float instanceSize;
attribute float instanceRotation;
attribute vec4 instanceColor;
attribute float instanceFrameIndex;

uniform int uOrientation;
uniform vec3 uVelocity;

varying vec2 vUv;
varying vec4 vColor;

void main() {
  vUv = uv;
  vColor = instanceColor;

  vec3 right;
  vec3 up;

  if (uOrientation == 0) {
    right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  } else if (uOrientation == 1) {
    right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    right.y = 0.0;
    float rLen = length(right);
    right = rLen > 0.001 ? right / rLen : vec3(1.0, 0.0, 0.0);
    up = vec3(0.0, 1.0, 0.0);
  } else {
    right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 velDir = normalize(uVelocity);
    up = velDir;
    vec3 correctedRight = normalize(cross(up, vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2])));
    float crLen = length(correctedRight);
    right = crLen > 0.001 ? correctedRight : right;
    up = normalize(cross(right, up));
  }

  float c = cos(instanceRotation);
  float s = sin(instanceRotation);
  vec3 rotRight = right * c + up * s;
  vec3 rotUp = -right * s + up * c;

  vec3 offset = rotRight * (position.x - 0.5) * instanceSize + rotUp * (position.y - 0.5) * instanceSize;

  vec3 worldPos = instancePosition + offset;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
`

const fragmentShader = `
varying vec2 vUv;
varying vec4 vColor;

uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform int uBuiltInShape;
uniform int uBlendMode;
uniform vec2 uSpriteSheetSize;
uniform bool uUseSpriteSheet;
uniform float uFrameCount;

void main() {
  vec2 uv = vUv;

  if (uUseSpriteSheet) {
    float cols = uSpriteSheetSize.y;
    float rows = uSpriteSheetSize.x;
    float frameIndex = floor(vColor.a * uFrameCount + 0.5);
    frameIndex = mod(frameIndex, uFrameCount);
    float col = mod(frameIndex, cols);
    float row = floor(frameIndex / cols);
    uv.x = (uv.x + col) / cols;
    uv.y = 1.0 - (1.0 - uv.y + row) / rows;
  }

  vec4 texColor;

  if (uUseTexture) {
    texColor = texture2D(uTexture, uv);
  } else if (uBuiltInShape == 1) {
    float dist = length(vUv - 0.5) * 2.0;
    float alpha = 1.0 - smoothstep(0.6, 1.0, dist);
    texColor = vec4(1.0, 1.0, 1.0, alpha);
  } else if (uBuiltInShape == 2) {
    vec2 d = abs(vUv - 0.5) * 2.0;
    float maxD = max(d.x, d.y);
    float alpha = 1.0 - smoothstep(0.7, 1.0, maxD);
    texColor = vec4(1.0, 1.0, 1.0, alpha);
  } else if (uBuiltInShape == 3) {
    vec2 p = vUv - 0.5;
    float angle = atan(p.y, p.x);
    float radius = length(p) * 2.0;
    float star = cos(angle * 5.0) * 0.5 + 0.5;
    float inner = 0.3 + star * 0.2;
    float alpha = 1.0 - smoothstep(inner, inner + 0.15, radius);
    texColor = vec4(1.0, 1.0, 1.0, alpha);
  } else if (uBuiltInShape == 4) {
    float dist = length(vUv - 0.5) * 2.0;
    float n = sin(vUv.x * 12.0 + vUv.y * 8.0) * 0.1 + sin(vUv.x * 7.0 - vUv.y * 13.0) * 0.08;
    float falloff = 1.0 - smoothstep(0.3, 1.0, dist);
    float alpha = clamp(falloff * (0.85 + n), 0.0, 1.0);
    texColor = vec4(1.0, 1.0, 1.0, alpha);
  } else {
    texColor = vec4(1.0, 1.0, 1.0, 1.0);
  }

  vec4 color = texColor * vec4(vColor.rgb, 1.0);
  color.a = texColor.a * vColor.a;

  if (uBlendMode == 0) {
    color.rgb *= color.a;
  } else if (uBlendMode == 2) {
    color.rgb = vec3(1.0) - (vec3(1.0) - color.rgb) * color.a;
  }

  gl_FragColor = color;
}
`

export class ParticleRenderer {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  private material: THREE.ShaderMaterial
  private geometry: THREE.InstancedBufferGeometry
  private mesh: THREE.Mesh
  private instancePosition: THREE.InstancedBufferAttribute
  private instanceSizeAttr: THREE.InstancedBufferAttribute
  private instanceRotationAttr: THREE.InstancedBufferAttribute
  private instanceColorAttr: THREE.InstancedBufferAttribute
  private instanceFrameIndexAttr: THREE.InstancedBufferAttribute
  private gridHelper: THREE.GridHelper | null = null
  private axesHelper: THREE.AxesHelper | null = null
  private builtInTextures: Map<string, THREE.DataTexture> = new Map()
  private currentTexture: THREE.Texture | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111111)

    const aspect = canvas.clientWidth / canvas.clientHeight || 1
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
    this.camera.position.set(5, 5, 5)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.1

    const quadPositions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ])
    const quadUvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
    ])
    const quadIndices = new Uint16Array([0, 1, 2, 0, 2, 3])

    this.geometry = new THREE.InstancedBufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(quadPositions, 3))
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(quadUvs, 2))
    this.geometry.setIndex(new THREE.BufferAttribute(quadIndices, 1))
    this.geometry.setDrawRange(0, 6)

    const posData = new Float32Array(MAX_PARTICLES * 3)
    const sizeData = new Float32Array(MAX_PARTICLES)
    const rotData = new Float32Array(MAX_PARTICLES)
    const colorData = new Float32Array(MAX_PARTICLES * 4)
    const frameData = new Float32Array(MAX_PARTICLES)

    this.instancePosition = new THREE.InstancedBufferAttribute(posData, 3)
    this.instanceSizeAttr = new THREE.InstancedBufferAttribute(sizeData, 1)
    this.instanceRotationAttr = new THREE.InstancedBufferAttribute(rotData, 1)
    this.instanceColorAttr = new THREE.InstancedBufferAttribute(colorData, 4)
    this.instanceFrameIndexAttr = new THREE.InstancedBufferAttribute(frameData, 1)

    this.instancePosition.setUsage(THREE.DynamicDrawUsage)
    this.instanceSizeAttr.setUsage(THREE.DynamicDrawUsage)
    this.instanceRotationAttr.setUsage(THREE.DynamicDrawUsage)
    this.instanceColorAttr.setUsage(THREE.DynamicDrawUsage)
    this.instanceFrameIndexAttr.setUsage(THREE.DynamicDrawUsage)

    this.geometry.setAttribute('instancePosition', this.instancePosition)
    this.geometry.setAttribute('instanceSize', this.instanceSizeAttr)
    this.geometry.setAttribute('instanceRotation', this.instanceRotationAttr)
    this.geometry.setAttribute('instanceColor', this.instanceColorAttr)
    this.geometry.setAttribute('instanceFrameIndex', this.instanceFrameIndexAttr)

    this.geometry.instanceCount = 0

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uOrientation: { value: 0 },
        uVelocity: { value: new THREE.Vector3(0, 1, 0) },
        uTexture: { value: null },
        uUseTexture: { value: false },
        uBuiltInShape: { value: 1 },
        uBlendMode: { value: 0 },
        uSpriteSheetSize: { value: new THREE.Vector2(1, 1) },
        uUseSpriteSheet: { value: false },
        uFrameCount: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)

    this.builtInTextures.set('softCircle', createSoftCircleTexture())
    this.builtInTextures.set('square', createSquareTexture())
    this.builtInTextures.set('star', createStarTexture())
    this.builtInTextures.set('smoke', createSmokeTexture())

    this.setBuiltInShape('softCircle')
    this.showHelpers(true)
  }

  updateFromPool(pool: ParticlePool): void {
    const alive = pool.alive
    const positions = pool.positions
    const sizes = pool.sizes
    const opacities = pool.opacities
    const rotations = pool.rotations
    const colors = pool.colors
    const N = alive.length

    let count = 0
    const posArr = this.instancePosition.array as Float32Array
    const sizeArr = this.instanceSizeAttr.array as Float32Array
    const rotArr = this.instanceRotationAttr.array as Float32Array
    const colorArr = this.instanceColorAttr.array as Float32Array
    const frameArr = this.instanceFrameIndexAttr.array as Float32Array

    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue
      const i3 = count * 3
      const i4 = count * 4
      posArr[i3] = positions[i * 3]
      posArr[i3 + 1] = positions[i * 3 + 1]
      posArr[i3 + 2] = positions[i * 3 + 2]
      sizeArr[count] = sizes[i]
      rotArr[count] = rotations[i]
      colorArr[i4] = colors[i * 4]
      colorArr[i4 + 1] = colors[i * 4 + 1]
      colorArr[i4 + 2] = colors[i * 4 + 2]
      colorArr[i4 + 3] = colors[i * 4 + 3] * opacities[i]
      frameArr[count] = 0
      count++
    }

    this.instancePosition.needsUpdate = true
    this.instanceSizeAttr.needsUpdate = true
    this.instanceRotationAttr.needsUpdate = true
    this.instanceColorAttr.needsUpdate = true
    this.instanceFrameIndexAttr.needsUpdate = true

    this.geometry.instanceCount = count
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

  setOrientation(mode: string): void {
    switch (mode) {
      case 'billboard':
        this.material.uniforms.uOrientation.value = 0
        break
      case 'horizontal':
        this.material.uniforms.uOrientation.value = 1
        break
      case 'velocity':
        this.material.uniforms.uOrientation.value = 2
        break
    }
  }

  setVelocityDirection(vx: number, vy: number, vz: number): void {
    this.material.uniforms.uVelocity.value.set(vx, vy, vz)
  }

  setBuiltInShape(shape: string | null): void {
    if (shape && this.builtInTextures.has(shape)) {
      const tex = this.builtInTextures.get(shape)!
      this.material.uniforms.uTexture.value = tex
      this.material.uniforms.uUseTexture.value = true
      this.currentTexture = tex
      switch (shape) {
        case 'softCircle':
          this.material.uniforms.uBuiltInShape.value = 1
          break
        case 'square':
          this.material.uniforms.uBuiltInShape.value = 2
          break
        case 'star':
          this.material.uniforms.uBuiltInShape.value = 3
          break
        case 'smoke':
          this.material.uniforms.uBuiltInShape.value = 4
          break
      }
    } else {
      this.material.uniforms.uUseTexture.value = false
      this.material.uniforms.uBuiltInShape.value = 0
      this.currentTexture = null
    }
  }

  setCustomTexture(texture: THREE.Texture | null): void {
    if (texture) {
      this.material.uniforms.uTexture.value = texture
      this.material.uniforms.uUseTexture.value = true
      this.currentTexture = texture
    } else {
      this.material.uniforms.uTexture.value = this.builtInTextures.get('softCircle') || null
      this.material.uniforms.uUseTexture.value = true
      this.material.uniforms.uBuiltInShape.value = 1
      this.currentTexture = null
    }
  }

  setSpriteSheet(rows: number, cols: number, frameCount: number): void {
    if (rows > 1 || cols > 1) {
      this.material.uniforms.uUseSpriteSheet.value = true
      this.material.uniforms.uSpriteSheetSize.value.set(rows, cols)
      this.material.uniforms.uFrameCount.value = frameCount
    } else {
      this.material.uniforms.uUseSpriteSheet.value = false
    }
  }

  setBackground(type: string, customColor?: string): void {
    switch (type) {
      case 'black':
        this.scene.background = new THREE.Color(0x111111)
        break
      case 'white':
        this.scene.background = new THREE.Color(0xffffff)
        break
      case 'custom':
        this.scene.background = new THREE.Color(customColor ?? '#333333')
        break
      case 'checker':
        this.scene.background = this.createCheckerBackground()
        break
      default:
        this.scene.background = new THREE.Color(0x111111)
    }
  }

  private createCheckerBackground(): THREE.Color {
    return new THREE.Color(0x222222)
  }

  showHelpers(visible: boolean): void {
    if (visible) {
      if (!this.gridHelper) {
        this.gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333)
        this.scene.add(this.gridHelper)
      }
      if (!this.axesHelper) {
        this.axesHelper = new THREE.AxesHelper(3)
        this.scene.add(this.axesHelper)
      }
      this.gridHelper.visible = true
      this.axesHelper.visible = true
    } else {
      if (this.gridHelper) this.gridHelper.visible = false
      if (this.axesHelper) this.axesHelper.visible = false
    }
  }

  render(): void {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.renderer.dispose()
    this.controls.dispose()
    this.builtInTextures.forEach(tex => tex.dispose())
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper)
      this.gridHelper.dispose()
    }
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper)
      this.axesHelper.dispose()
    }
  }
}
