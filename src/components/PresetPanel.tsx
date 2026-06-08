import { useEditorStore } from '@/store/useEditorStore'
import { builtInPresets } from '@/presets/builtInPresets'
import Modal from '@/components/ui/Modal'

function gradientFromScene(preset: typeof builtInPresets[number]): string {
  const first = preset.scene.emitters[0]?.colorGradient[0]
  const last = preset.scene.emitters[0]?.colorGradient[preset.scene.emitters[0].colorGradient.length - 1]
  if (!first || !last) return '#333'
  const r1 = Math.round(first.color[0] * 255)
  const g1 = Math.round(first.color[1] * 255)
  const b1 = Math.round(first.color[2] * 255)
  const r2 = Math.round(last.color[0] * 255)
  const g2 = Math.round(last.color[1] * 255)
  const b2 = Math.round(last.color[2] * 255)
  return `linear-gradient(135deg, rgb(${r1},${g1},${b1}), rgb(${r2},${g2},${b2}))`
}

export default function PresetPanel() {
  const { showPresets, togglePresets, loadPreset } = useEditorStore()

  const handleSelect = (scene: typeof builtInPresets[number]['scene']) => {
    loadPreset(scene)
    togglePresets()
  }

  return (
    <Modal open={showPresets} onClose={togglePresets} title="预设库">
      <div className="grid grid-cols-2 gap-3">
        {builtInPresets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handleSelect(preset.scene)}
            className="group relative h-[90px] w-[140px] overflow-hidden rounded-lg border border-[#3a3a55] transition-all duration-200 hover:scale-105 hover:border-[#00f0ff]/60"
            style={{ background: gradientFromScene(preset) }}
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <span className="relative z-10 flex h-full items-center justify-center text-sm font-medium text-white drop-shadow-md">
              {preset.name}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
