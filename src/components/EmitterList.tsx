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
  Link2,
  Lock,
  Move,
  X,
} from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import type { FieldType, DistanceConstraint, AngleConstraint, AreaConstraint } from '@/types/particle'
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
    addConstraint,
    removeConstraint,
    setConstraints,
    addFixedParticle,
    removeFixedParticle,
    setFixedParticles,
    setConstraintSolver,
    toggleLeftPanel,
  } = useEditorStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [distA, setDistA] = useState(0)
  const [distB, setDistB] = useState(1)
  const [distRest, setDistRest] = useState(1)
  const [distStiff, setDistStiff] = useState(1)

  const [angleA, setAngleA] = useState(0)
  const [angleB, setAngleB] = useState(1)
  const [angleC, setAngleC] = useState(2)
  const [angleMin, setAngleMin] = useState(0)
  const [angleMax, setAngleMax] = useState(Math.PI)
  const [angleStiff, setAngleStiff] = useState(1)

  const [areaCx, setAreaCx] = useState(0)
  const [areaCy, setAreaCy] = useState(0)
  const [areaCz, setAreaCz] = useState(0)
  const [areaHx, setAreaHx] = useState(5)
  const [areaHy, setAreaHy] = useState(5)
  const [areaHz, setAreaHz] = useState(5)
  const [areaBounce, setAreaBounce] = useState(0.8)

  const [gridRows, setGridRows] = useState(10)
  const [gridCols, setGridCols] = useState(10)
  const [gridSpacing, setGridSpacing] = useState(1)
  const [gridStartIdx, setGridStartIdx] = useState(0)
  const [gridDiagonal, setGridDiagonal] = useState(true)
  const [gridHorizontal, setGridHorizontal] = useState(true)
  const [gridVertical, setGridVertical] = useState(true)

  const [fixedIdxInput, setFixedIdxInput] = useState(0)

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

  const handleAddDistanceConstraint = () => {
    const con: DistanceConstraint = {
      id: crypto.randomUUID(),
      type: 'distance',
      particleA: distA,
      particleB: distB,
      restDistance: distRest,
      stiffness: distStiff,
      broken: false,
    }
    addConstraint(con)
  }

  const handleAddAngleConstraint = () => {
    const con: AngleConstraint = {
      id: crypto.randomUUID(),
      type: 'angle',
      particleA: angleA,
      particleB: angleB,
      particleC: angleC,
      minAngle: angleMin,
      maxAngle: angleMax,
      stiffness: angleStiff,
    }
    addConstraint(con)
  }

  const handleAddAreaConstraint = () => {
    const con: AreaConstraint = {
      id: crypto.randomUUID(),
      type: 'area',
      center: [areaCx, areaCy, areaCz],
      halfExtents: [areaHx, areaHy, areaHz],
      bounce: areaBounce,
    }
    addConstraint(con)
  }

  const handleCreateGridConstraints = () => {
    const newConstraints: DistanceConstraint[] = []
    const rows = Math.max(1, Math.floor(gridRows))
    const cols = Math.max(1, Math.floor(gridCols))
    const start = Math.max(0, Math.floor(gridStartIdx))
    const spacing = Math.max(0.01, gridSpacing)
    const idx = (r: number, c: number) => start + r * cols + c

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (gridHorizontal && c < cols - 1) {
          newConstraints.push({
            id: crypto.randomUUID(),
            type: 'distance',
            particleA: idx(r, c),
            particleB: idx(r, c + 1),
            restDistance: spacing,
            stiffness: 1,
            broken: false,
          })
        }
        if (gridVertical && r < rows - 1) {
          newConstraints.push({
            id: crypto.randomUUID(),
            type: 'distance',
            particleA: idx(r, c),
            particleB: idx(r + 1, c),
            restDistance: spacing,
            stiffness: 1,
            broken: false,
          })
        }
        if (gridDiagonal && r < rows - 1 && c < cols - 1) {
          newConstraints.push({
            id: crypto.randomUUID(),
            type: 'distance',
            particleA: idx(r, c),
            particleB: idx(r + 1, c + 1),
            restDistance: spacing * Math.SQRT2,
            stiffness: 1,
            broken: false,
          })
        }
      }
    }
    setConstraints([...scene.constraints, ...newConstraints])
  }

  const handleAddFixedParticle = () => {
    addFixedParticle(fixedIdxInput)
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

        <div className="border-t border-[#1a1a2e] mt-1 pt-1 px-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Link2 size={12} className="text-[#888]" />
              <span className="text-xs font-medium text-[#888]">约束</span>
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-[10px] text-[#888] mb-0.5">求解迭代次数</label>
            <input
              type="number"
              value={scene.constraintSolver.iterations}
              onChange={(e) => setConstraintSolver({ iterations: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-1.5 py-0.5 text-[11px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none focus:border-[#00f0ff]"
              min={1}
              max={50}
            />
          </div>

          <div className="mb-2 p-1.5 rounded border border-[#3a3a55] bg-[#25253d]">
            <div className="text-[10px] text-[#888] mb-1 font-medium">距离约束</div>
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">粒子A</label>
                <input type="number" value={distA} onChange={(e) => setDistA(parseInt(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">粒子B</label>
                <input type="number" value={distB} onChange={(e) => setDistB(parseInt(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">目标距离</label>
                <input type="number" step="0.1" value={distRest} onChange={(e) => setDistRest(parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">刚度0-1</label>
                <input type="number" step="0.1" min={0} max={1} value={distStiff} onChange={(e) => setDistStiff(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <button onClick={handleAddDistanceConstraint}
              className="w-full py-0.5 text-[10px] text-[#888] hover:text-[#00f0ff] bg-[#1a1a2e] rounded border border-[#3a3a55] hover:border-[#00f0ff] transition-colors">
              + 距离约束
            </button>
          </div>

          <div className="mb-2 p-1.5 rounded border border-[#3a3a55] bg-[#25253d]">
            <div className="text-[10px] text-[#888] mb-1 font-medium">角度约束</div>
            <div className="grid grid-cols-3 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">粒子A</label>
                <input type="number" value={angleA} onChange={(e) => setAngleA(parseInt(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">中间点B</label>
                <input type="number" value={angleB} onChange={(e) => setAngleB(parseInt(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">粒子C</label>
                <input type="number" value={angleC} onChange={(e) => setAngleC(parseInt(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">最小角度</label>
                <input type="number" step="0.1" value={angleMin} onChange={(e) => setAngleMin(parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">最大角度</label>
                <input type="number" step="0.1" value={angleMax} onChange={(e) => setAngleMax(parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">刚度</label>
                <input type="number" step="0.1" min={0} max={1} value={angleStiff} onChange={(e) => setAngleStiff(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <button onClick={handleAddAngleConstraint}
              className="w-full py-0.5 text-[10px] text-[#888] hover:text-[#00f0ff] bg-[#1a1a2e] rounded border border-[#3a3a55] hover:border-[#00f0ff] transition-colors">
              + 角度约束
            </button>
          </div>

          <div className="mb-2 p-1.5 rounded border border-[#3a3a55] bg-[#25253d]">
            <div className="text-[10px] text-[#888] mb-1 font-medium">区域约束 (AABB)</div>
            <div className="grid grid-cols-3 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">中心X</label>
                <input type="number" step="0.1" value={areaCx} onChange={(e) => setAreaCx(parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">中心Y</label>
                <input type="number" step="0.1" value={areaCy} onChange={(e) => setAreaCy(parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">中心Z</label>
                <input type="number" step="0.1" value={areaCz} onChange={(e) => setAreaCz(parseFloat(e.target.value) || 0)}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">半宽X</label>
                <input type="number" step="0.1" min={0.1} value={areaHx} onChange={(e) => setAreaHx(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">半宽Y</label>
                <input type="number" step="0.1" min={0.1} value={areaHy} onChange={(e) => setAreaHy(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">半宽Z</label>
                <input type="number" step="0.1" min={0.1} value={areaHz} onChange={(e) => setAreaHz(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <div className="mb-1">
              <label className="block text-[9px] text-[#666] mb-0.5">弹性系数</label>
              <input type="number" step="0.1" min={0} max={1} value={areaBounce} onChange={(e) => setAreaBounce(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
            </div>
            <button onClick={handleAddAreaConstraint}
              className="w-full py-0.5 text-[10px] text-[#888] hover:text-[#00f0ff] bg-[#1a1a2e] rounded border border-[#3a3a55] hover:border-[#00f0ff] transition-colors">
              + 区域约束
            </button>
          </div>

          <div className="mb-2 p-1.5 rounded border border-[#3a3a55] bg-[#25253d]">
            <div className="text-[10px] text-[#888] mb-1 font-medium">批量网格连接</div>
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">行数</label>
                <input type="number" min={2} value={gridRows} onChange={(e) => setGridRows(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">列数</label>
                <input type="number" min={2} value={gridCols} onChange={(e) => setGridCols(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 mb-1">
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">间距</label>
                <input type="number" step="0.1" min={0.1} value={gridSpacing} onChange={(e) => setGridSpacing(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
              <div>
                <label className="block text-[9px] text-[#666] mb-0.5">起始索引</label>
                <input type="number" min={0} value={gridStartIdx} onChange={(e) => setGridStartIdx(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mb-1">
              <label className="flex items-center gap-1 text-[9px] text-[#888]">
                <input type="checkbox" checked={gridHorizontal} onChange={(e) => setGridHorizontal(e.target.checked)} className="accent-[#00f0ff]" />横
              </label>
              <label className="flex items-center gap-1 text-[9px] text-[#888]">
                <input type="checkbox" checked={gridVertical} onChange={(e) => setGridVertical(e.target.checked)} className="accent-[#00f0ff]" />纵
              </label>
              <label className="flex items-center gap-1 text-[9px] text-[#888]">
                <input type="checkbox" checked={gridDiagonal} onChange={(e) => setGridDiagonal(e.target.checked)} className="accent-[#00f0ff]" />对角
              </label>
            </div>
            <button onClick={handleCreateGridConstraints}
              className="w-full py-0.5 text-[10px] text-[#888] hover:text-[#00f0ff] bg-[#1a1a2e] rounded border border-[#3a3a55] hover:border-[#00f0ff] transition-colors">
              生成网格约束
            </button>
          </div>

          <div className="mb-2 p-1.5 rounded border border-[#3a3a55] bg-[#25253d]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Lock size={10} className="text-[#888]" />
                <span className="text-[10px] font-medium text-[#888]">固定粒子 ({scene.fixedParticles.length})</span>
              </div>
            </div>
            <div className="flex gap-1 mb-1">
              <input type="number" value={fixedIdxInput} onChange={(e) => setFixedIdxInput(parseInt(e.target.value) || 0)}
                className="flex-1 px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#3a3a55] rounded text-[#e0e0e0] outline-none" />
              <button onClick={handleAddFixedParticle}
                className="px-1.5 py-0.5 text-[10px] text-[#888] hover:text-[#00f0ff] bg-[#1a1a2e] rounded border border-[#3a3a55] hover:border-[#00f0ff] transition-colors">
                <Lock size={10} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
              {scene.fixedParticles.map((idx) => (
                <span key={idx} className="flex items-center gap-0.5 px-1 py-0.5 text-[9px] bg-[#1a1a2e] rounded border border-[#3a3a55] text-[#e0e0e0]">
                  #{idx}
                  <button onClick={() => removeFixedParticle(idx)} className="text-[#888] hover:text-[#ff4444]">
                    <X size={8} />
                  </button>
                </span>
              ))}
            </div>
            {scene.fixedParticles.length > 0 && (
              <button onClick={() => setFixedParticles([])}
                className="w-full mt-1 py-0.5 text-[9px] text-[#888] hover:text-[#ff4444] transition-colors">
                清除所有
              </button>
            )}
          </div>

          <div className="mb-2">
            <div className="text-[10px] text-[#888] mb-1">约束列表 ({scene.constraints.length})</div>
            <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
              {scene.constraints.map((con) => (
                <div key={con.id} className="flex items-center justify-between px-1 py-0.5 rounded hover:bg-[#353550] group">
                  <span className="text-[10px] text-[#e0e0e0]">
                    {con.type === 'distance' && `Dist ${con.particleA}-${con.particleB}`}
                    {con.type === 'angle' && `Angle ${con.particleA}-${con.particleB}-${con.particleC}`}
                    {con.type === 'area' && `Area [${con.center.join(',')}]`}
                  </span>
                  <button onClick={() => removeConstraint(con.id)}
                    className="text-[#888] hover:text-[#ff4444] transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={9} />
                  </button>
                </div>
              ))}
            </div>
            {scene.constraints.length > 0 && (
              <button onClick={() => setConstraints([])}
                className="w-full mt-1 py-0.5 text-[9px] text-[#888] hover:text-[#ff4444] transition-colors">
                清除所有约束
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
