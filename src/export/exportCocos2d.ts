import type { ParticleScene, EmitterConfig } from '@/types/particle'

function mapBlendMode(mode: string): number {
  switch (mode) {
    case 'additive': return 1
    case 'alpha': return 0
    case 'multiply': return 2
    default: return 0
  }
}

function mapEmitterToPlist(emitter: EmitterConfig): Record<string, string | number> {
  const avgLifetime = (emitter.lifetime[0] + emitter.lifetime[1]) / 2
  const avgSpeed = (emitter.initialSpeed[0] + emitter.initialSpeed[1]) / 2
  const startColor = emitter.colorGradient[0]
  const endColor = emitter.colorGradient[emitter.colorGradient.length - 1]
  const startSize = emitter.sizeCurve.points[0]?.value ?? 1
  const endSize = emitter.sizeCurve.points[emitter.sizeCurve.points.length - 1]?.value ?? 0
  const startOpacity = emitter.opacityCurve.points[0]?.value ?? 1
  const endOpacity = emitter.opacityCurve.points[emitter.opacityCurve.points.length - 1]?.value ?? 0

  return {
    emitterType: emitter.shape === 'sphere' ? 1 : 0,
    maxParticles: emitter.burstMode ? emitter.burstCount : emitter.emissionRate * avgLifetime,
    lifespan: avgLifetime,
    lifespanVariance: (emitter.lifetime[1] - emitter.lifetime[0]) / 2,
    startSize,
    startSizeVariance: emitter.shape === 'rectangle' ? 0.05 : 0,
    endSize,
    endSizeVariance: 0,
    emitAngle: emitter.shape === 'cone' ? (emitter.shapeParams.angle ?? 30) : 360,
    emitAngleVariance: 0,
    speed: avgSpeed,
    speedVariance: (emitter.initialSpeed[1] - emitter.initialSpeed[0]) / 2,
    gravityx: emitter.acceleration[0],
    gravityy: emitter.acceleration[1],
    sourcePositionVariancex: emitter.shape === 'rectangle' ? (emitter.shapeParams.width ?? 10) / 2 : (emitter.shapeParams.radius ?? 0),
    sourcePositionVariancey: emitter.shape === 'rectangle' ? (emitter.shapeParams.height ?? 1) / 2 : (emitter.shapeParams.radius ?? 0),
    startColorRed: startColor?.color[0] ?? 1,
    startColorGreen: startColor?.color[1] ?? 1,
    startColorBlue: startColor?.color[2] ?? 1,
    startColorAlpha: (startColor?.alpha ?? 1) * startOpacity,
    startColorRedVariance: 0,
    startColorGreenVariance: 0,
    startColorBlueVariance: 0,
    startColorAlphaVariance: 0,
    finishColorRed: endColor?.color[0] ?? 1,
    finishColorGreen: endColor?.color[1] ?? 1,
    finishColorBlue: endColor?.color[2] ?? 1,
    finishColorAlpha: (endColor?.alpha ?? 0) * endOpacity,
    finishColorRedVariance: 0,
    finishColorGreenVariance: 0,
    finishColorBlueVariance: 0,
    finishColorAlphaVariance: 0,
    blendFuncSource: mapBlendMode(emitter.blendMode) === 1 ? 770 : 1,
    blendFuncDestination: mapBlendMode(emitter.blendMode) === 1 ? 1 : 771,
    rotationStart: 0,
    rotationStartVariance: 0,
    rotationEnd: (emitter.rotationSpeed[0] + emitter.rotationSpeed[1]) / 2 * avgLifetime,
    rotationEndVariance: 0,
    particleLifespan: avgLifetime,
    particleLifespanVariance: (emitter.lifetime[1] - emitter.lifetime[0]) / 2,
    duration: emitter.duration,
  }
}

function buildPlistXml(dict: Record<string, string | number>): string {
  let xml = ''
  const keys = Object.keys(dict)
  for (const key of keys) {
    xml += `      <key>${key}</key>\n`
    const val = dict[key]
    if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        xml += `      <integer>${val}</integer>\n`
      } else {
        xml += `      <real>${val}</real>\n`
      }
    } else {
      xml += `      <string>${val}</string>\n`
    }
  }
  return xml
}

export function exportToCocos2d(scene: ParticleScene): string {
  const emitter = scene.emitters[0]
  if (!emitter) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict></dict></plist>'
  }

  const dict = mapEmitterToPlist(emitter)

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
  xml += '<plist version="1.0">\n'
  xml += '  <dict>\n'
  xml += buildPlistXml(dict)
  xml += '  </dict>\n'
  xml += '</plist>'

  return xml
}
