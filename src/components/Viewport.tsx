import { useRef, useEffect, useCallback, useState } from 'react'
import * as THREE from 'three'
import { Eye, Sun, Grid3x3 } from 'lucide-react'
import { ParticleRenderer } from '@/renderer/ParticleRenderer'
import { ParticleSystem } from '@/engine/ParticleSystem'
import { useEditorStore } from '@/store/useEditorStore'
import { createEmitterWireframe, createForceFieldHelper, createCollisionPlaneHelper } from '@/renderer/SceneHelper'
import type { EmitterConfig } from '@/types/particle'

export default function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ParticleRenderer | null>(null)
  const systemRef = useRef<ParticleSystem | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const customTextureRef = useRef<THREE.Texture | null>(null)
  const [fps, setFps] = useState(0)
  const [particleCount, setParticleCount] = useState(0)
  const fpsFrames = useRef(0)
  const fpsTime = useRef(0)

  const {
    scene,
    selectedEmitterId,
    background,
    helpersVisible,
    resetTrigger,
  } = useEditorStore()

  const updateRendererFromEmitter = useCallback((emitter: EmitterConfig | undefined) => {
    const renderer = rendererRef.current
    if (!renderer || !emitter) return
    renderer.setBlendMode(emitter.blendMode)
    renderer.setTrailBlendMode(emitter.blendMode)
    renderer.setOrientation(emitter.orientation)

    if (emitter.customTextureData) {
      if (customTextureRef.current) {
        customTextureRef.current.dispose()
        customTextureRef.current = null
      }
      const loader = new THREE.TextureLoader()
      const texture = loader.load(emitter.customTextureData)
      texture.colorSpace = THREE.SRGBColorSpace
      customTextureRef.current = texture
      renderer.setCustomTexture(texture)
    } else {
      if (customTextureRef.current) {
        customTextureRef.current.dispose()
        customTextureRef.current = null
      }
      renderer.setCustomTexture(null)
      renderer.setBuiltInShape(emitter.builtInShape)
    }

    if (emitter.spriteSheet) {
      const frameCount = emitter.spriteSheet.rows * emitter.spriteSheet.cols
      renderer.setSpriteSheetEnabled(true, emitter.spriteSheet.rows, emitter.spriteSheet.cols, frameCount)
    } else {
      renderer.setSpriteSheetEnabled(false, 1, 1, 1)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement!
    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight

    const renderer = new ParticleRenderer(canvas)
    const system = new ParticleSystem()
    rendererRef.current = renderer
    systemRef.current = system

    const store = useEditorStore.getState()
    store.scene.emitters.forEach((e: EmitterConfig) => {
      system.addEmitter(e)
      renderer.registerEmitterConfig(e)
    })
    system.setForceFields(store.scene.forceFields)
    system.setCollisionPlanes(store.scene.collisions)
    renderer.setBackground(store.background)

    const selectedEmitter = store.scene.emitters.find((e: EmitterConfig) => e.id === store.selectedEmitterId)
    updateRendererFromEmitter(selectedEmitter)

    lastTimeRef.current = performance.now()
    fpsTime.current = performance.now()
    fpsFrames.current = 0

    const animate = (time: number) => {
      const rawDt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time
      const dt = Math.min(rawDt, 0.05)

      const currentStore = useEditorStore.getState()
      if (currentStore.isPlaying) {
        system.update(dt)
        currentStore.setElapsedTime(currentStore.elapsedTime + dt)
      }

      const pool = system.getPool()
      renderer.updateFromPool(pool)
      renderer.updateTrailsFromPool(pool)
      renderer.render()

      fpsFrames.current++
      const fpsElapsed = time - fpsTime.current
      if (fpsElapsed >= 500) {
        setFps(Math.round((fpsFrames.current / fpsElapsed) * 1000))
        setParticleCount(pool.getCount())
        fpsFrames.current = 0
        fpsTime.current = time
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (customTextureRef.current) {
        customTextureRef.current.dispose()
        customTextureRef.current = null
      }
      renderer.dispose()
      rendererRef.current = null
      systemRef.current = null
    }
  }, [updateRendererFromEmitter])

  useEffect(() => {
    const system = systemRef.current
    const renderer = rendererRef.current
    if (!system) return
    scene.emitters.forEach((e) => {
      system.updateEmitter(e)
      if (renderer) {
        renderer.registerEmitterConfig(e)
      }
    })
    system.setForceFields(scene.forceFields)
    system.setCollisionPlanes(scene.collisions)
  }, [scene.emitters, scene.forceFields, scene.collisions])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.clearHelpers()
    scene.emitters.forEach((emitter) => {
      const wireframe = createEmitterWireframe(emitter)
      renderer.addHelper(wireframe)
    })
    scene.forceFields.forEach((field) => {
      const helper = createForceFieldHelper(field)
      renderer.addHelper(helper)
    })
    scene.collisions.forEach((collision) => {
      const helper = createCollisionPlaneHelper(collision)
      renderer.addHelper(helper)
    })
  }, [scene.emitters, scene.forceFields, scene.collisions])

  useEffect(() => {
    const system = systemRef.current
    if (!system) return
    system.reset()
  }, [resetTrigger])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setHelpersVisible(helpersVisible)
  }, [helpersVisible])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setBackground(background)
  }, [background])

  useEffect(() => {
    const selectedEmitter = scene.emitters.find((e) => e.id === selectedEmitterId)
    updateRendererFromEmitter(selectedEmitter)
  }, [selectedEmitterId, scene.emitters, updateRendererFromEmitter])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      const renderer = rendererRef.current
      if (!canvas || !renderer) return
      const parent = canvas.parentElement
      if (!parent) return
      renderer.resize(parent.clientWidth, parent.clientHeight)
    }

    const parent = canvasRef.current?.parentElement
    if (!parent) return
    const observer = new ResizeObserver(handleResize)
    observer.observe(parent)

    return () => observer.disconnect()
  }, [])

  const handleBgSwitch = (bg: 'black' | 'white' | 'checker') => {
    useEditorStore.getState().setBackground(bg)
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full block" />

      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1">
        <span className="text-xs font-mono text-gray-400">{fps} FPS</span>
        <span className="text-xs font-mono text-gray-400">{particleCount} particles</span>
      </div>

      <div className="absolute top-3 right-3 flex gap-1">
        <button
          onClick={() => handleBgSwitch('black')}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${background === 'black' ? 'bg-[#2d2d44] text-[#00f0ff]' : 'bg-[#1a1a2e]/60 text-gray-500 hover:text-gray-300'}`}
        >
          <Eye size={14} />
        </button>
        <button
          onClick={() => handleBgSwitch('white')}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${background === 'white' ? 'bg-[#2d2d44] text-[#00f0ff]' : 'bg-[#1a1a2e]/60 text-gray-500 hover:text-gray-300'}`}
        >
          <Sun size={14} />
        </button>
        <button
          onClick={() => handleBgSwitch('checker')}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${background === 'checker' ? 'bg-[#2d2d44] text-[#00f0ff]' : 'bg-[#1a1a2e]/60 text-gray-500 hover:text-gray-300'}`}
        >
          <Grid3x3 size={14} />
        </button>
      </div>
    </div>
  )
}
