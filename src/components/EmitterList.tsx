import { useState } from 'react'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Copy,
  Circle,
  Square,
  Box,
  Globe,
  Triangle,
  Wind,
  Layers,
} from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import type { FieldType } from '@/types/particle'
import { cn } from '@/lib/utils'

const shapeIcons: Record<string, React.ReactNode> = {
  point: <Circle size={14} />,
  circle: <Circle size={14} />,
  rectangle: <Square size={14} />,
  sphere: <Globe size={14} />,
  cone: <Triangle size={14} />,
}

export default function EmitterList() {
  const {
    scene,
    selectedEmitterId,
    leftPanelOpen,
    selectEmitter,
    addEmitter,
    removeEmitter,
    duplicateEmitter,
    updateEmitter,
    addForceField,
    removeForceField,
    addCollision,
    removeCollision,
    toggleLeftPanel,
  } = useEditorStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const handleCommitEdit = (id: string) => {
    if (editName.trim()) {
      updateEmitter(id, { name: editName.trim() })
    }
    setEditingId(null)
  }

  if (!leftPanelOpen) {
    return (
      <div className="flex flex-col items-center w-8 bg-[#2d2d44] border-r border-[#1a1a2e] py-2">
        <button
          onClick={toggleLeftPanel}
          className="text-[#888] hover:text-[#00f0ff] transition-colors"
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    )
  }

  const handleAddForceField = () => {
    const types: FieldType[] = ['gravity', 'repulsion', 'turbulence', 'directional']
    const type = types[Math.floor(Math.random() * types.length)]
    addForceField({
      id: crypto.randomUUID(),
      type,
      position: [0, 0, 0],
      strength: 10,
      radius: 5,
    })
  }

  const handleAddCollision = () => {
    addCollision({
      position: [0, -2, 0],
      normal: [0, 1, 0],
      bounce: 0.5,
      friction: 0.3,
      lifeDecay: 0,
      killOnCollision: false,
    })
  }

  return (
    <div className="flex flex-col w-[240px] bg-[#2d2d44] border-r border-[#1a1a2e] overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#1a1a2e]">
        <span className="text-xs font-medium text-[#e0e0e0]">发射器</span>
        <div className="flex items-center gap-1">
          <button
            onClick={addEmitter}
            className="text-[#888] hover:text-[#00f0ff] transition-colors"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={toggleLeftPanel}
            className="text-[#888] hover:text-[#00f0ff] transition-colors"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {scene.emitters.map((emitter) => (
            <div
              key={emitter.id}
              onClick={() => selectEmitter(emitter.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors border-l-2',
                selectedEmitterId === emitter.id
                  ? 'border-l-[#00f0ff] bg-[#3a3a55]'
                  : 'border-l-transparent hover:bg-[#353550]',
              )}
            >
              <span className="text-[#00f0ff] shrink-0">
                {shapeIcons[emitter.shape] ?? <Box size={14} />}
              </span>
              {editingId === emitter.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleCommitEdit(emitter.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitEdit(emitter.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                  className="flex-1 min-w-0 px-1 py-0 text-xs bg-[#1a1a2e] border border-[#00f0ff] rounded text-[#e0e0e0] outline-none"
                />
              ) : (
                <span
                  className="flex-1 min-w-0 text-xs text-[#e0e0e0] truncate"
                  onDoubleClick={() => handleStartEdit(emitter.id, emitter.name)}
                >
                  {emitter.name}
                </span>
              )}
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 hover:!opacity-100"
                style={{ opacity: selectedEmitterId === emitter.id ? 1 : undefined }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateEmitter(emitter.id) }}
                  className="text-[#888] hover:text-[#00f0ff] transition-colors"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeEmitter(emitter.id) }}
                  className="text-[#888] hover:text-[#ff4444] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1a1a2e] mt-1 pt-1 px-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Wind size={12} className="text-[#888]" />
              <span className="text-xs font-medium text-[#888]">力场</span>
            </div>
            <button
              onClick={handleAddForceField}
              className="text-[#888] hover:text-[#00f0ff] transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
          {scene.forceFields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between px-1 py-0.5 rounded hover:bg-[#353550] group"
            >
              <span className="text-xs text-[#e0e0e0]">
                {field.type} <span className="text-[#888]">{field.strength}</span>
              </span>
              <button
                onClick={() => removeForceField(field.id)}
                className="text-[#888] hover:text-[#ff4444] transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1a1a2e] mt-1 pt-1 px-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Layers size={12} className="text-[#888]" />
              <span className="text-xs font-medium text-[#888]">碰撞</span>
            </div>
            <button
              onClick={handleAddCollision}
              className="text-[#888] hover:text-[#00f0ff] transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
          {scene.collisions.map((collision, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-1 py-0.5 rounded hover:bg-[#353550] group"
            >
              <span className="text-xs text-[#e0e0e0]">
                Plane <span className="text-[#888]">b:{collision.bounce}</span>
              </span>
              <button
                onClick={() => removeCollision(index)}
                className="text-[#888] hover:text-[#ff4444] transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
