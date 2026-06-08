import type { ParticleScene } from '@/types/particle'

export function exportToJSON(scene: ParticleScene): string {
  return JSON.stringify(scene, null, 2)
}
