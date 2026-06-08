import type { ParticleScene } from '@/types/particle'

export function exportToJSON(scene: ParticleScene): string {
  return JSON.stringify(scene, null, 2)
}

export function exportToUnity(scene: ParticleScene): string {
  const unityData = {
    version: '1.0',
    format: 'unity-particle-system',
    emitters: scene.emitters.map((e) => ({
      name: e.name,
      shape: e.shape,
      emissionRate: e.emissionRate,
      burstMode: e.burstMode,
      burstCount: e.burstCount,
      duration: e.duration,
      looping: e.looping,
      startLifetime: { min: e.lifetime[0], max: e.lifetime[1] },
      startSpeed: { min: e.initialSpeed[0], max: e.initialSpeed[1] },
      gravityModifier: Math.abs(e.acceleration[1]) / 9.8,
      startRotation: { min: e.rotationSpeed[0], max: e.rotationSpeed[1] },
      colorOverLifetime: e.colorGradient,
      sizeOverLifetime: e.sizeCurve,
      blendMode: e.blendMode,
      position: { x: e.position[0], y: e.position[1], z: e.position[2] },
    })),
    forceFields: scene.forceFields,
    collisions: scene.collisions,
  }
  return JSON.stringify(unityData, null, 2)
}

export function exportCocos2d(scene: ParticleScene): string {
  const e = scene.emitters[0]
  if (!e) return ''
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>duration</key>
  <real>${e.duration}</real>
  <key>emitterType</key>
  <integer>0</integer>
  <key>maxParticles</key>
  <integer>${e.emissionRate * e.duration}</integer>
  <key>particleLifespan</key>
  <real>${(e.lifetime[0] + e.lifetime[1]) / 2}</real>
  <key>particleLifespanVariance</key>
  <real>${(e.lifetime[1] - e.lifetime[0]) / 2}</real>
  <key>startParticleSize</key>
  <real>1</real>
  <key>startParticleSizeVariance</key>
  <real>0</real>
  <key>speed</key>
  <real>${(e.initialSpeed[0] + e.initialSpeed[1]) / 2}</real>
  <key>speedVariance</key>
  <real>${(e.initialSpeed[1] - e.initialSpeed[0]) / 2}</real>
  <key>gravityx</key>
  <real>${e.acceleration[0]}</real>
  <key>gravityy</key>
  <real>${e.acceleration[1]}</real>
  <key>blendFuncSource</key>
  <integer>${e.blendMode === 'additive' ? 770 : 771}</integer>
  <key>blendFuncDestination</key>
  <integer>1</integer>
  <key>rotationStart</key>
  <real>${e.rotationSpeed[0]}</real>
  <key>rotationEnd</key>
  <real>${e.rotationSpeed[1]}</real>
</dict>
</plist>`
  return plist
}

export async function exportSpriteSheet(
  scene: ParticleScene,
  fps: number,
  duration: number,
): Promise<Blob> {
  void scene
  void fps
  void duration
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#00f0ff'
  ctx.font = '14px JetBrains Mono, monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Sprite Sheet Preview', 256, 256)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  })
}
