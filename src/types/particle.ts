export type EmitterShape = 'point' | 'circle' | 'rectangle' | 'sphere' | 'cone'

export type BlendMode = 'additive' | 'alpha' | 'multiply'

export type OrientationMode = 'billboard' | 'horizontal' | 'velocity'

export type CurveType = 'linear' | 'smooth' | 'step'

export type SubEmitterEvent = 'birth' | 'death' | 'lifecycle'

export type FieldType = 'gravity' | 'repulsion' | 'turbulence' | 'directional'

export interface CurvePoint {
  time: number
  value: number
  inHandle?: [number, number]
  outHandle?: [number, number]
}

export interface Curve {
  type: CurveType
  points: CurvePoint[]
}

export interface GradientStop {
  time: number
  color: [number, number, number]
  alpha: number
}

export interface EmitterConfig {
  id: string
  name: string
  shape: EmitterShape
  shapeParams: Record<string, number>
  emissionRate: number
  burstMode: boolean
  burstCount: number
  duration: number
  looping: boolean
  lifetime: [number, number]
  initialSpeed: [number, number]
  direction: 'normal' | 'fixed'
  fixedDirection: [number, number, number]
  acceleration: [number, number, number]
  colorGradient: GradientStop[]
  sizeCurve: Curve
  opacityCurve: Curve
  rotationSpeed: [number, number]
  texture: string | null
  builtInShape: 'softCircle' | 'square' | 'star' | 'smoke' | null
  spriteSheet: { rows: number; cols: number } | null
  blendMode: BlendMode
  orientation: OrientationMode
  subEmitters: { event: SubEmitterEvent; lifecyclePercent?: number; emitter: EmitterConfig }[]
  position: [number, number, number]
  rotation: [number, number, number]
}

export interface ForceField {
  id: string
  type: FieldType
  position: [number, number, number]
  strength: number
  radius: number
  frequency?: number
  direction?: [number, number, number]
}

export interface CollisionPlane {
  position: [number, number, number]
  normal: [number, number, number]
  bounce: number
  friction: number
  lifeDecay: number
  killOnCollision: boolean
}

export interface ParticleScene {
  emitters: EmitterConfig[]
  forceFields: ForceField[]
  collisions: CollisionPlane[]
  background: 'black' | 'white' | 'checker' | 'custom'
  customBgColor?: string
}

export function createDefaultCurve(): Curve {
  return {
    type: 'smooth',
    points: [
      { time: 0, value: 1 },
      { time: 1, value: 1 },
    ],
  }
}

export function createDefaultGradient(): GradientStop[] {
  return [
    { time: 0, color: [1, 1, 1], alpha: 1 },
    { time: 1, color: [1, 1, 1], alpha: 0 },
  ]
}

export function createDefaultEmitter(): EmitterConfig {
  return {
    id: crypto.randomUUID(),
    name: 'Emitter',
    shape: 'point',
    shapeParams: {},
    emissionRate: 50,
    burstMode: false,
    burstCount: 0,
    duration: 2,
    looping: true,
    lifetime: [1, 3],
    initialSpeed: [1, 3],
    direction: 'normal',
    fixedDirection: [0, 1, 0],
    acceleration: [0, -9.8, 0],
    colorGradient: createDefaultGradient(),
    sizeCurve: createDefaultCurve(),
    opacityCurve: createDefaultCurve(),
    rotationSpeed: [0, 0],
    texture: null,
    builtInShape: 'softCircle',
    spriteSheet: null,
    blendMode: 'additive',
    orientation: 'billboard',
    subEmitters: [],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  }
}
