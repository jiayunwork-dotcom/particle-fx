import { Eye, Sun, Grid3x3, Sparkles, Download, HelpCircle } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import Viewport from '@/components/Viewport'
import EmitterList from '@/components/EmitterList'
import ParamPanel from '@/components/ParamPanel'
import TimelineBar from '@/components/TimelineBar'
import PresetPanel from '@/components/PresetPanel'
import ExportPanel from '@/components/ExportPanel'

export default function EditorLayout() {
  const {
    background,
    setBackground,
    togglePresets,
    toggleExport,
  } = useEditorStore()

  const handleBgSwitch = (bg: 'black' | 'white' | 'checker') => {
    setBackground(bg)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#1a1a2e]">
      <div className="flex h-10 shrink-0 items-center border-b border-[#2d2d44] bg-[#2d2d44]/60 px-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#00f0ff]" />
          <span className="text-sm font-bold text-[#00f0ff]">Particle FX</span>
        </div>

        <div className="mx-auto flex items-center gap-2">
          <button
            onClick={togglePresets}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-[#888] transition-colors hover:bg-[#3a3a55] hover:text-[#e0e0e0]"
          >
            <Sparkles size={13} />
            预设
          </button>
          <button
            onClick={toggleExport}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-[#888] transition-colors hover:bg-[#3a3a55] hover:text-[#e0e0e0]"
          >
            <Download size={13} />
            导出
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleBgSwitch('black')}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${background === 'black' ? 'bg-[#1a1a2e] text-[#00f0ff]' : 'text-[#888] hover:text-[#e0e0e0]'}`}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleBgSwitch('white')}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${background === 'white' ? 'bg-[#1a1a2e] text-[#00f0ff]' : 'text-[#888] hover:text-[#e0e0e0]'}`}
          >
            <Sun size={14} />
          </button>
          <button
            onClick={() => handleBgSwitch('checker')}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${background === 'checker' ? 'bg-[#1a1a2e] text-[#00f0ff]' : 'text-[#888] hover:text-[#e0e0e0]'}`}
          >
            <Grid3x3 size={14} />
          </button>
          <div className="mx-1 h-4 w-px bg-[#3a3a55]" />
          <button
            className="flex h-7 w-7 items-center justify-center rounded text-[#888] transition-colors hover:bg-[#3a3a55] hover:text-[#e0e0e0]"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <EmitterList />
        <Viewport />
        <ParamPanel />
      </div>

      <TimelineBar />

      <PresetPanel />
      <ExportPanel />
    </div>
  )
}
