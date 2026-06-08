import type { ParticleScene, EmitterConfig, Curve, GradientStop } from '@/types/particle'

interface UnityColorOverLifetimeModule {
  enabled: boolean
  gradient: { keys: { time: number; r: number; g: number; b: number; a: number }[] }
}

interface UnitySizeOverLifetimeModule {
  enabled: boolean
  curve: { keys: { time: number; value: number }[] }
}

interface UnityMainModule {
  duration: number
  looping: boolean
  startLifetime: { min: number; max: number }
  startSpeed: { min: number; max: number }
  startColor: { gradient: UnityColorOverLifetimeModule['gradient'] }
  startSize: number
  gravityModifier: number
  emissionRate: number
  burstCount: number
}

interface UnityEmissionModule {
  enabled: boolean
  rateOverTime: number
  burstCount: number
  bursts: { count: number; cycleCount: number; repeatInterval: number }[]
}

interface UnityShapeModule {
  enabled: boolean
  shapeType: number
  radius: number
  angle: number
  boxX: number
  boxY: number
  boxZ: number
}

interface UnityVelocityOverLifetimeModule {
  enabled: boolean
  x: { constant: number }
  y: { constant: number }
  z: { constant: number }
}

interface UnityRotationOverLifetimeModule {
  enabled: boolean
  x: { constant: number }
  y: { constant: number }
  z: { constant: number }
}

interface UnityTextureSheetAnimationModule {
  enabled: boolean
  mode: number
  numRows: number
  numColumns: number
}

interface UnitySubEmittersModule {
  enabled: boolean
  subEmitters: { type: number; emitterIndex: number }[]
}

interface UnityParticleSystem {
  name: string
  mainModule: UnityMainModule
  emissionModule: UnityEmissionModule
  shapeModule: UnityShapeModule
  velocityOverLifetime: UnityVelocityOverLifetimeModule
  colorOverLifetime: UnityColorOverLifetimeModule
  sizeOverLifetime: UnitySizeOverLifetimeModule
  rotationOverLifetime: UnityRotationOverLifetimeModule
  textureSheetAnimation: UnityTextureSheetAnimationModule
  subEmittersModule: UnitySubEmittersModule
  renderer: { renderMode: number }
}

const shapeTypeMap: Record<string, number> = {
  point: 0,
  circle: 2,
  rectangle: 1,
  sphere: 0,
  cone: 3,
}

function mapGradientToUnity(stops: GradientStop[]): UnityColorOverLifetimeModule['gradient'] {
  const keys = stops.map((s) => ({
    time: s.time * 255,
    r: Math.round(s.color[0] * 255),
    g: Math.round(s.color[1] * 255),
    b: Math.round(s.color[2] * 255),
    a: Math.round(s.alpha * 255),
  }))
  return { keys }
}

function mapCurveToUnity(curve: Curve): UnitySizeOverLifetimeModule['curve'] {
  return {
    keys: curve.points.map((p) => ({ time: p.time * 255, value: p.value * 255 })),
  }
}

function mapEmitterToUnity(emitter: EmitterConfig, index: number): UnityParticleSystem {
  const gravityModifier = emitter.acceleration[1] / -9.8

  let shapeType = shapeTypeMap[emitter.shape] ?? 0
  let radius = emitter.shapeParams.radius ?? 0
  let angle = emitter.shapeParams.angle ?? 0
  let boxX = 0
  let boxY = 0
  let boxZ = 0

  if (emitter.shape === 'rectangle') {
    shapeType = 1
    boxX = (emitter.shapeParams.width ?? 1) / 2
    boxY = (emitter.shapeParams.height ?? 1) / 2
    boxZ = 0
    radius = 0
  }

  if (emitter.shape === 'sphere') {
    shapeType = 0
    radius = emitter.shapeParams.radius ?? 1
  }

  if (emitter.shape === 'cone') {
    shapeType = 3
    radius = emitter.shapeParams.radius ?? 1
    angle = emitter.shapeParams.angle ?? 25
  }

  const isVelocityAligned = emitter.orientation === 'velocity'

  return {
    name: emitter.name,
    mainModule: {
      duration: emitter.duration,
      looping: emitter.looping,
      startLifetime: { min: emitter.lifetime[0], max: emitter.lifetime[1] },
      startSpeed: { min: emitter.initialSpeed[0], max: emitter.initialSpeed[1] },
      startColor: { gradient: mapGradientToUnity(emitter.colorGradient) },
      startSize: emitter.sizeCurve.points[0]?.value ?? 1,
      gravityModifier,
      emissionRate: emitter.emissionRate,
      burstCount: emitter.burstMode ? emitter.burstCount : 0,
    },
    emissionModule: {
      enabled: true,
      rateOverTime: emitter.emissionRate,
      burstCount: emitter.burstMode ? 1 : 0,
      bursts: emitter.burstMode
        ? [{ count: emitter.burstCount, cycleCount: 1, repeatInterval: 0.01 }]
        : [],
    },
    shapeModule: {
      enabled: true,
      shapeType,
      radius,
      angle,
      boxX,
      boxY,
      boxZ,
    },
    velocityOverLifetime: {
      enabled: emitter.direction === 'fixed',
      x: { constant: emitter.fixedDirection[0] },
      y: { constant: emitter.fixedDirection[1] },
      z: { constant: emitter.fixedDirection[2] },
    },
    colorOverLifetime: {
      enabled: true,
      gradient: mapGradientToUnity(emitter.colorGradient),
    },
    sizeOverLifetime: {
      enabled: true,
      curve: mapCurveToUnity(emitter.sizeCurve),
    },
    rotationOverLifetime: {
      enabled: emitter.rotationSpeed[0] !== 0 || emitter.rotationSpeed[1] !== 0,
      x: { constant: emitter.rotationSpeed[0] },
      y: { constant: 0 },
      z: { constant: emitter.rotationSpeed[1] },
    },
    textureSheetAnimation: {
      enabled: emitter.spriteSheet !== null,
      mode: 0,
      numRows: emitter.spriteSheet?.rows ?? 1,
      numColumns: emitter.spriteSheet?.cols ?? 1,
    },
    subEmittersModule: {
      enabled: emitter.subEmitters.length > 0,
      subEmitters: emitter.subEmitters.map((se, i) => ({
        type: se.event === 'birth' ? 0 : se.event === 'death' ? 1 : 2,
        emitterIndex: i,
      })),
    },
    renderer: {
      renderMode: isVelocityAligned ? 3 : 0,
    },
  }
}

export function exportToUnity(scene: ParticleScene): string {
  const systems = scene.emitters.map((e, i) => mapEmitterToUnity(e, i))

  const output = {
    particleSystems: systems,
    forceFields: scene.forceFields.map((ff) => ({
      type: ff.type,
      position: { x: ff.position[0], y: ff.position[1], z: ff.position[2] },
      strength: ff.strength,
      radius: ff.radius,
      frequency: ff.frequency ?? 0,
    })),
    collisions: scene.collisions.map((c) => ({
      position: { x: c.position[0], y: c.position[1], z: c.position[2] },
      normal: { x: c.normal[0], y: c.normal[1], z: c.normal[2] },
      bounce: c.bounce,
      friction: c.friction,
      lifeDecay: c.lifeDecay,
      killOnCollision: c.killOnCollision,
    })),
  }

  return JSON.stringify(output, null, 2)
}
