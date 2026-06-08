import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import { exportToJSON, exportToUnity, exportCocos2d, exportSpriteSheet } from '@/export/'
import Modal from '@/components/ui/Modal'
import NumberInput from '@/components/ui/NumberInput'

type ExportFormat = 'json' | 'unity' | 'cocos2d' | 'spritesheet'

const formats: { key: ExportFormat; label: string }[] = [
  { key: 'json', label: 'JSON' },
  { key: 'unity', label: 'Unity' },
  { key: 'cocos2d', label: 'Cocos2d' },
  { key: 'spritesheet', label: '序列帧PNG' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadText(text: string, filename: string, type = 'application/json') {
  const blob = new Blob([text], { type })
  downloadBlob(blob, filename)
}

export default function ExportPanel() {
  const { showExport, toggleExport, scene } = useEditorStore()
  const [format, setFormat] = useState<ExportFormat>('json')
  const [fps, setFps] = useState(30)
  const [duration, setDuration] = useState(2)

  const jsonPreview = useMemo(() => {
    if (format !== 'json') return ''
    return exportToJSON(scene)
  }, [format, scene])

  const handleExport = async () => {
    switch (format) {
      case 'json': {
        const text = exportToJSON(scene)
        downloadText(text, 'particle-config.json')
        break
      }
      case 'unity': {
        const text = exportToUnity(scene)
        downloadText(text, 'particle-unity.json')
        break
      }
      case 'cocos2d': {
        const text = exportCocos2d(scene)
        downloadText(text, 'particle.plist', 'application/xml')
        break
      }
      case 'spritesheet': {
        const blob = await exportSpriteSheet(scene, fps, duration)
        downloadBlob(blob, 'spritesheet.png')
        break
      }
    }
    toggleExport()
  }

  return (
    <Modal open={showExport} onClose={toggleExport} title="导出">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {formats.map((f) => (
            <button
              key={f.key}
              onClick={() => setFormat(f.key)}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                format === f.key
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40'
                  : 'bg-[#1a1a2e] text-[#888] border border-[#3a3a55] hover:text-[#e0e0e0] hover:border-[#555]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {format === 'json' && (
          <pre className="max-h-60 overflow-auto rounded bg-[#1a1a2e] p-3 text-xs font-mono text-[#e0e0e0] border border-[#3a3a55]">
            {jsonPreview}
          </pre>
        )}

        {format === 'unity' && (
          <div className="rounded bg-[#1a1a2e] p-3 text-xs text-[#888] border border-[#3a3a55]">
            <p className="mb-1 text-[#e0e0e0]">Unity Particle System 格式</p>
            <p>发射器参数映射为 Unity Shuriken 粒子系统属性，包括 emission rate、startLifetime、startSpeed、gravityModifier、colorOverLifetime、sizeOverLifetime 等。</p>
          </div>
        )}

        {format === 'cocos2d' && (
          <div className="rounded bg-[#1a1a2e] p-3 text-xs text-[#888] border border-[#3a3a55]">
            <p className="mb-1 text-[#e0e0e0]">Cocos2d-x plist 格式</p>
            <p>导出为 Apple plist XML 格式，兼容 Cocos2d-x CCParticleSystem。包含 duration、emitterType、maxParticles、particleLifespan、speed、gravity、blendFunc 等属性。</p>
          </div>
        )}

        {format === 'spritesheet' && (
          <div className="flex flex-col gap-2">
            <NumberInput
              label="FPS"
              value={fps}
              min={1}
              max={120}
              step={1}
              onChange={setFps}
            />
            <NumberInput
              label="时长 (s)"
              value={duration}
              min={0.1}
              max={30}
              step={0.1}
              onChange={setDuration}
              unit="s"
            />
          </div>
        )}

        <button
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded bg-[#00f0ff]/20 py-2 text-sm font-medium text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/30 border border-[#00f0ff]/40"
        >
          <Download size={14} />
          导出
        </button>
      </div>
    </Modal>
  )
}
