import { useMemo } from 'react'
import { PanelRightOpen, Plus, Trash2, Upload, X } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import type { EmitterConfig, SubEmitterEvent } from '@/types/particle'
import { createDefaultEmitter } from '@/types/particle'
import FoldSection from '@/components/ui/FoldSection'
import Slider from '@/components/ui/Slider'
import NumberInput from '@/components/ui/NumberInput'
import Select from '@/components/ui/Select'
import Toggle from '@/components/ui/Toggle'
import CurveEditor from '@/components/CurveEditor'
import GradientEditor from '@/components/GradientEditor'
import ColorPicker from '@/components/ui/ColorPicker'

export default function ParamPanel() {
  const {
    scene,
    selectedEmitterId,
    rightPanelOpen,
    updateEmitter,
    toggleRightPanel,
  } = useEditorStore()

  const emitter = useMemo(
    () => scene.emitters.find((e) => e.id === selectedEmitterId) ?? null,
    [scene.emitters, selectedEmitterId],
  )

  if (!rightPanelOpen) {
    return (
      <div className="flex flex-col items-center w-8 bg-[#2d2d44] border-l border-[#1a1a2e] py-2">
        <button
          onClick={toggleRightPanel}
          className="text-[#888] hover:text-[#00f0ff] transition-colors"
        >
          <PanelRightOpen size={16} />
        </button>
      </div>
    )
  }

  if (!emitter) {
    return (
      <div className="flex flex-col w-[320px] bg-[#2d2d44] border-l border-[#1a1a2e]">
        <div className="flex items-center justify-end px-2 py-1.5 border-b border-[#1a1a2e]">
          <button
            onClick={toggleRightPanel}
            className="text-[#888] hover:text-[#00f0ff] transition-colors"
          >
            <PanelRightOpen size={14} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-[#888]">选择一个发射器</span>
        </div>
      </div>
    )
  }

  const update = (updates: Partial<EmitterConfig>) => {
    updateEmitter(emitter.id, updates)
  }

  const shapeOptions = [
    { value: 'point', label: '点发射' },
    { value: 'circle', label: '圆形发射' },
    { value: 'rectangle', label: '矩形发射' },
    { value: 'sphere', label: '球面发射' },
    { value: 'cone', label: '锥体发射' },
  ]

  const directionOptions = [
    { value: 'normal', label: '法线方向' },
    { value: 'fixed', label: '固定方向' },
  ]

  const builtInShapeOptions = [
    { value: 'softCircle', label: 'softCircle' },
    { value: 'square', label: '方形' },
    { value: 'star', label: '星形' },
    { value: 'smoke', label: '烟雾' },
  ]

  const blendModeOptions = [
    { value: 'additive', label: 'Additive' },
    { value: 'alpha', label: 'Alpha Blend' },
    { value: 'multiply', label: 'Multiply' },
  ]

  const orientationOptions = [
    { value: 'billboard', label: 'Billboard' },
    { value: 'horizontal', label: '水平' },
    { value: 'velocity', label: '速度方向' },
  ]

  const subEmitterEventOptions = [
    { value: 'birth', label: 'Birth' },
    { value: 'death', label: 'Death' },
    { value: 'lifecycle', label: 'Lifecycle' },
  ]

  const trailColorModeOptions = [
    { value: 'particle', label: '跟随粒子颜色' },
    { value: 'fixed', label: '固定颜色' },
  ]

  return (
    <div className="flex flex-col w-[320px] bg-[#2d2d44] border-l border-[#1a1a2e] overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#1a1a2e]">
        <span className="text-xs font-medium text-[#e0e0e0]">{emitter.name}</span>
        <button
          onClick={toggleRightPanel}
          className="text-[#888] hover:text-[#00f0ff] transition-colors"
        >
          <PanelRightOpen size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        <FoldSection title="发射器" defaultOpen>
          <Select
            label="形状"
            value={emitter.shape}
            options={shapeOptions}
            onChange={(v) => update({ shape: v as EmitterConfig['shape'] })}
          />
          {(emitter.shape === 'circle' || emitter.shape === 'sphere') && (
            <Slider
              label="半径"
              value={emitter.shapeParams.radius ?? 1}
              min={0.1}
              max={50}
              step={0.1}
              onChange={(v) => update({ shapeParams: { ...emitter.shapeParams, radius: v } })}
            />
          )}
          {emitter.shape === 'rectangle' && (
            <>
              <Slider
                label="宽度"
                value={emitter.shapeParams.width ?? 1}
                min={0.1}
                max={50}
                step={0.1}
                onChange={(v) => update({ shapeParams: { ...emitter.shapeParams, width: v } })}
              />
              <Slider
                label="高度"
                value={emitter.shapeParams.height ?? 1}
                min={0.1}
                max={50}
                step={0.1}
                onChange={(v) => update({ shapeParams: { ...emitter.shapeParams, height: v } })}
              />
            </>
          )}
          {emitter.shape === 'cone' && (
            <>
              <Slider
                label="角度"
                value={emitter.shapeParams.angle ?? 30}
                min={1}
                max={90}
                step={1}
                onChange={(v) => update({ shapeParams: { ...emitter.shapeParams, angle: v } })}
              />
              <Slider
                label="半径"
                value={emitter.shapeParams.radius ?? 1}
                min={0.1}
                max={50}
                step={0.1}
                onChange={(v) => update({ shapeParams: { ...emitter.shapeParams, radius: v } })}
              />
            </>
          )}
          <Slider
            label="发射率"
            value={emitter.emissionRate}
            min={1}
            max={10000}
            step={1}
            onChange={(v) => update({ emissionRate: v })}
          />
          <Toggle
            label="爆发模式"
            value={emitter.burstMode}
            onChange={(v) => update({ burstMode: v })}
          />
          {emitter.burstMode && (
            <NumberInput
              label="爆发数量"
              value={emitter.burstCount}
              min={0}
              max={100000}
              step={1}
              onChange={(v) => update({ burstCount: v })}
            />
          )}
          <NumberInput
            label="持续时间"
            value={emitter.duration}
            min={0.01}
            max={60}
            step={0.1}
            onChange={(v) => update({ duration: v })}
            unit="s"
          />
          <Toggle
            label="循环"
            value={emitter.looping}
            onChange={(v) => update({ looping: v })}
          />
          <NumberInput
            label="位置 X"
            value={emitter.position[0]}
            step={0.1}
            onChange={(v) => update({ position: [v, emitter.position[1], emitter.position[2]] })}
          />
          <NumberInput
            label="位置 Y"
            value={emitter.position[1]}
            step={0.1}
            onChange={(v) => update({ position: [emitter.position[0], v, emitter.position[2]] })}
          />
          <NumberInput
            label="位置 Z"
            value={emitter.position[2]}
            step={0.1}
            onChange={(v) => update({ position: [emitter.position[0], emitter.position[1], v] })}
          />
        </FoldSection>

        <FoldSection title="生命周期" defaultOpen>
          <NumberInput
            label="最小生命"
            value={emitter.lifetime[0]}
            min={0.01}
            max={60}
            step={0.1}
            onChange={(v) => update({ lifetime: [v, emitter.lifetime[1]] })}
            unit="s"
          />
          <NumberInput
            label="最大生命"
            value={emitter.lifetime[1]}
            min={0.01}
            max={60}
            step={0.1}
            onChange={(v) => update({ lifetime: [emitter.lifetime[0], v] })}
            unit="s"
          />
          <NumberInput
            label="最小初速度"
            value={emitter.initialSpeed[0]}
            min={0}
            max={1000}
            step={0.1}
            onChange={(v) => update({ initialSpeed: [v, emitter.initialSpeed[1]] })}
          />
          <NumberInput
            label="最大初速度"
            value={emitter.initialSpeed[1]}
            min={0}
            max={1000}
            step={0.1}
            onChange={(v) => update({ initialSpeed: [emitter.initialSpeed[0], v] })}
          />
          <Select
            label="方向"
            value={emitter.direction}
            options={directionOptions}
            onChange={(v) => update({ direction: v as 'normal' | 'fixed' })}
          />
          {emitter.direction === 'fixed' && (
            <>
              <NumberInput
                label="方向 X"
                value={emitter.fixedDirection[0]}
                step={0.1}
                onChange={(v) => update({ fixedDirection: [v, emitter.fixedDirection[1], emitter.fixedDirection[2]] })}
              />
              <NumberInput
                label="方向 Y"
                value={emitter.fixedDirection[1]}
                step={0.1}
                onChange={(v) => update({ fixedDirection: [emitter.fixedDirection[0], v, emitter.fixedDirection[2]] })}
              />
              <NumberInput
                label="方向 Z"
                value={emitter.fixedDirection[2]}
                step={0.1}
                onChange={(v) => update({ fixedDirection: [emitter.fixedDirection[0], emitter.fixedDirection[1], v] })}
              />
            </>
          )}
          <NumberInput
            label="加速度 X"
            value={emitter.acceleration[0]}
            step={0.1}
            onChange={(v) => update({ acceleration: [v, emitter.acceleration[1], emitter.acceleration[2]] })}
          />
          <NumberInput
            label="加速度 Y"
            value={emitter.acceleration[1]}
            step={0.1}
            onChange={(v) => update({ acceleration: [emitter.acceleration[0], v, emitter.acceleration[2]] })}
          />
          <NumberInput
            label="加速度 Z"
            value={emitter.acceleration[2]}
            step={0.1}
            onChange={(v) => update({ acceleration: [emitter.acceleration[0], emitter.acceleration[1], v] })}
          />
          <NumberInput
            label="最小旋转速度"
            value={emitter.rotationSpeed[0]}
            min={0}
            max={3600}
            step={1}
            onChange={(v) => update({ rotationSpeed: [v, emitter.rotationSpeed[1]] })}
            unit="°/s"
          />
          <NumberInput
            label="最大旋转速度"
            value={emitter.rotationSpeed[1]}
            min={0}
            max={3600}
            step={1}
            onChange={(v) => update({ rotationSpeed: [emitter.rotationSpeed[0], v] })}
            unit="°/s"
          />
        </FoldSection>

        <FoldSection title="颜色与大小" defaultOpen>
          <GradientEditor
            label="颜色渐变"
            value={emitter.colorGradient}
            onChange={(v) => update({ colorGradient: v })}
          />
          <CurveEditor
            label="大小曲线"
            value={emitter.sizeCurve}
            onChange={(v) => update({ sizeCurve: v })}
          />
          <CurveEditor
            label="透明度曲线"
            value={emitter.opacityCurve}
            onChange={(v) => update({ opacityCurve: v })}
          />
        </FoldSection>

        <FoldSection title="纹理" defaultOpen={false}>
          <div className="mb-2">
            <label className="block text-[10px] text-[#888] mb-1">自定义贴图</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded border border-[#3a3a55] bg-[#1a1a2e] text-[#888] hover:text-[#00f0ff] hover:border-[#00f0ff] transition-colors cursor-pointer">
                <Upload size={12} />
                <span>上传贴图</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const dataUrl = reader.result as string
                      update({ customTextureData: dataUrl, builtInShape: null })
                    }
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }}
                />
              </label>
              {emitter.customTextureData && (
                <button
                  onClick={() => update({ customTextureData: null })}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded border border-[#3a3a55] bg-[#1a1a2e] text-[#888] hover:text-[#ff4444] hover:border-[#ff4444] transition-colors"
                >
                  <X size={12} />
                  <span>清除</span>
                </button>
              )}
            </div>
            {emitter.customTextureData && (
              <div className="mt-2">
                <img
                  src={emitter.customTextureData}
                  alt="custom texture preview"
                  className="w-16 h-16 rounded border border-[#3a3a55] object-contain bg-[#1a1a2e]"
                />
              </div>
            )}
          </div>
          <Select
            label="内置形状"
            value={emitter.builtInShape ?? 'softCircle'}
            options={builtInShapeOptions}
            onChange={(v) => update({ builtInShape: v as EmitterConfig['builtInShape'], customTextureData: null })}
          />
          <Select
            label="混合模式"
            value={emitter.blendMode}
            options={blendModeOptions}
            onChange={(v) => update({ blendMode: v as EmitterConfig['blendMode'] })}
          />
          <Select
            label="朝向"
            value={emitter.orientation}
            options={orientationOptions}
            onChange={(v) => update({ orientation: v as EmitterConfig['orientation'] })}
          />
          <NumberInput
            label="Sprite行数"
            value={emitter.spriteSheet?.rows ?? 1}
            min={1}
            max={32}
            step={1}
            onChange={(v) => {
              const cols = emitter.spriteSheet?.cols ?? 1
              if (v > 1 || cols > 1) {
                update({ spriteSheet: { rows: v, cols } })
              } else {
                update({ spriteSheet: null })
              }
            }}
          />
          <NumberInput
            label="Sprite列数"
            value={emitter.spriteSheet?.cols ?? 1}
            min={1}
            max={32}
            step={1}
            onChange={(v) => {
              const rows = emitter.spriteSheet?.rows ?? 1
              if (v > 1 || rows > 1) {
                update({ spriteSheet: { rows, cols: v } })
              } else {
                update({ spriteSheet: null })
              }
            }}
          />
        </FoldSection>

        <FoldSection title="子发射器" defaultOpen={false}>
          {emitter.subEmitters.map((sub, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                label=""
                value={sub.event}
                options={subEmitterEventOptions}
                onChange={(v) => {
                  const updated = [...emitter.subEmitters]
                  updated[index] = { ...sub, event: v as SubEmitterEvent }
                  update({ subEmitters: updated })
                }}
              />
              {sub.event === 'lifecycle' && (
                <NumberInput
                  label=""
                  value={sub.lifecyclePercent ?? 0.5}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => {
                    const updated = [...emitter.subEmitters]
                    updated[index] = { ...sub, lifecyclePercent: v }
                    update({ subEmitters: updated })
                  }}
                />
              )}
              <button
                onClick={() => {
                  const updated = emitter.subEmitters.filter((_, i) => i !== index)
                  update({ subEmitters: updated })
                }}
                className="text-[#888] hover:text-[#ff4444] transition-colors shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const subEmitter = createDefaultEmitter()
              update({
                subEmitters: [
                  ...emitter.subEmitters,
                  { event: 'birth', emitter: subEmitter },
                ],
              })
            }}
            className="flex items-center justify-center gap-1 w-full py-1 text-xs text-[#888] hover:text-[#00f0ff] transition-colors rounded border border-dashed border-[#3a3a55] hover:border-[#00f0ff]"
          >
            <Plus size={12} />
            <span>添加子发射器</span>
          </button>
        </FoldSection>

        <FoldSection title="粒子拖尾" defaultOpen={false}>
          <Toggle
            label="启用拖尾"
            value={emitter.trail?.enabled ?? false}
            onChange={(v) => update({ trail: { ...emitter.trail, enabled: v } })}
          />
          {emitter.trail?.enabled && (
            <>
              <Slider
                label="拖尾长度"
                value={emitter.trail.length}
                min={5}
                max={100}
                step={1}
                onChange={(v) => update({ trail: { ...emitter.trail, length: Math.round(v) } })}
              />
              <Slider
                label="拖尾宽度"
                value={emitter.trail.width}
                min={0.05}
                max={5}
                step={0.05}
                onChange={(v) => update({ trail: { ...emitter.trail, width: v } })}
              />
              <Select
                label="颜色模式"
                value={emitter.trail.colorMode}
                options={trailColorModeOptions}
                onChange={(v) => update({ trail: { ...emitter.trail, colorMode: v as 'particle' | 'fixed' } })}
              />
              {emitter.trail.colorMode === 'fixed' && (
                <ColorPicker
                  label="固定颜色"
                  color={emitter.trail.fixedColor}
                  alpha={1}
                  onChange={(c) => update({ trail: { ...emitter.trail, fixedColor: c } })}
                />
              )}
              <NumberInput
                label="采样间隔(帧)"
                value={emitter.trail.sampleInterval}
                min={1}
                max={10}
                step={1}
                onChange={(v) => update({ trail: { ...emitter.trail, sampleInterval: Math.max(1, Math.round(v)) } })}
              />
            </>
          )}
        </FoldSection>
      </div>
    </div>
  )
}
