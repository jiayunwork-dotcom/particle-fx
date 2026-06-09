import { useRef, useEffect, useCallback, useState } from 'react'
import * as THREE from 'three'
import { Eye, Sun, Grid3x3 } from 'lucide-react'
import { ParticleRenderer } from '@/renderer/ParticleRenderer'
import { ParticleSystem } from '@/engine/ParticleSystem'
import { useEditorStore } from '@/store/useEditorStore'
import { createEmitterWireframe, createForceFieldHelper, createCollisionPlaneHelper, ConstraintVisualizer } from '@/renderer/SceneHelper'
import type { EmitterConfig } from '@/types/particle'
import { PlaybackRecorder } from '@/engine/PlaybackRecorder'

export default function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<ParticleRenderer | null>(null)
  const systemRef = useRef<ParticleSystem | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const customTextureRef = useRef<THREE.Texture | null>(null)
  const constraintVisRef = useRef<ConstraintVisualizer | null>(null)
  const recorderRef = useRef<PlaybackRecorder | null>(null)
  const wasRecordingRef = useRef(false)
  const prevIsPlaybackModeRef = useRef(false)
  const playbackAccumRef = useRef(0)
  const lastFpsForRecordingRef = useRef(60)
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

  const applyPlaybackFrame = useCallback((system: ParticleSystem) => {
    const store = useEditorStore.getState()
    const selectedClip = store.recordingClips.find((c) => c.id === store.selectedClipId)
    if (!selectedClip || selectedClip.frames.length === 0) return
    const pool = system.getPool()
    const totalFrames = selectedClip.totalFrames
    const tf = Math.max(0, Math.min(totalFrames - 1, store.currentPlaybackFrame))
    const floorFrame = Math.max(0, Math.floor(tf))
    const ceilFrame = Math.min(totalFrames - 1, Math.ceil(tf))
    const f0 = selectedClip.frames[floorFrame]
    const f1 = selectedClip.frames[ceilFrame]
    if (!f0 || !f1) return
    const aliveSet = new Set<number>()
    f0.aliveList.forEach((i) => aliveSet.add(i))
    f1.aliveList.forEach((i) => aliveSet.add(i))
    const aliveArr = Array.from(aliveSet)
    pool.prepareAliveForPlayback(aliveArr)
    const fixedSet = new Set<number>()
    f0.fixedParticles.forEach((i) => fixedSet.add(i))
    f1.fixedParticles.forEach((i) => fixedSet.add(i))
    pool.setFixedListForPlayback(Array.from(fixedSet))
    for (let pi = 0; pi < aliveArr.length; pi++) {
      const idx = aliveArr[pi]
      const pos = PlaybackRecorder.interpolatePosition(selectedClip, tf, idx)
      if (!pos) continue
      pool.setParticlePosition(idx, pos.x, pos.y, pos.z)
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
    const recorder = new PlaybackRecorder()
    rendererRef.current = renderer
    systemRef.current = system
    recorderRef.current = recorder

    const constraintVis = new ConstraintVisualizer()
    constraintVisRef.current = constraintVis
    renderer.addHelper(constraintVis.group)

    const store = useEditorStore.getState()
    store.scene.emitters.forEach((e: EmitterConfig) => {
      system.addEmitter(e)
      renderer.registerEmitterConfig(e)
    })
    system.setForceFields(store.scene.forceFields)
    system.setCollisionPlanes(store.scene.collisions)
    system.setConstraints(store.scene.constraints)
    system.setFixedParticles(store.scene.fixedParticles)
    system.setConstraintSolver(store.scene.constraintSolver)
    renderer.setBackground(store.background)

    const selectedEmitter = store.scene.emitters.find((e: EmitterConfig) => e.id === store.selectedEmitterId)
    updateRendererFromEmitter(selectedEmitter)

    lastTimeRef.current = performance.now()
    fpsTime.current = performance.now()
    fpsFrames.current = 0
    wasRecordingRef.current = false
    prevIsPlaybackModeRef.current = false

    const animate = (time: number) => {
      const rawDt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time
      const dt = Math.min(rawDt, 0.05)

      const currentStore = useEditorStore.getState()
      const {
        isPlaying,
        isRecording,
        recordingFrameInterval,
        isPlaybackMode,
        isPlaybackPlaying,
        playbackSpeed,
        currentPlaybackFrame,
        setRecording,
        addRecordingClip,
        setToast,
        setCurrentPlaybackFrame,
        setPlaybackPlaying,
        setElapsedTime,
        setConstraints,
        selectedClipId,
        recordingClips,
        scene,
      } = currentStore

      if (isPlaybackMode && !prevIsPlaybackModeRef.current) {
        prevIsPlaybackModeRef.current = true
        playbackAccumRef.current = 0
      } else if (!isPlaybackMode && prevIsPlaybackModeRef.current) {
        prevIsPlaybackModeRef.current = false
      }

      if (!isPlaybackMode) {
        if (wasRecordingRef.current && !isRecording) {
          wasRecordingRef.current = false
          const clip = recorder.stop()
          setRecording(false)
          if (clip) {
            addRecordingClip(clip)
            setToast({ message: `录制完成：${clip.name} (${clip.totalFrames}帧)`, type: 'success' })
          }
        }
        if (!wasRecordingRef.current && isRecording) {
          wasRecordingRef.current = true
          recorder.start(lastFpsForRecordingRef.current, recordingFrameInterval)
        }
      }

      let appliedPlayback = false
      const activeClip = recordingClips.find((c) => c.id === selectedClipId)
      if (isPlaybackMode && activeClip) {
        if (isPlaybackPlaying) {
          playbackAccumRef.current += dt * playbackSpeed * (60 / Math.max(1, activeClip.frameInterval))
          let newFrame = currentPlaybackFrame + playbackAccumRef.current
          playbackAccumRef.current = 0
          if (newFrame >= activeClip.totalFrames - 1) {
            newFrame = activeClip.totalFrames - 1
            setPlaybackPlaying(false)
          }
          if (newFrame !== currentPlaybackFrame) {
            setCurrentPlaybackFrame(newFrame)
          }
        }
        applyPlaybackFrame(system)
        appliedPlayback = true
      } else {
        if (isPlaying) {
          system.update(dt)
          setElapsedTime(currentStore.elapsedTime + dt)
          if (system.didConstraintsChange()) {
            const cur = system.getConstraints()
            const sceneC = scene.constraints
            if (cur.length !== sceneC.length) {
              setConstraints([...cur])
            }
          }
        }
        if (isRecording && recorder && wasRecordingRef.current) {
          recorder.capture(
            system.getPool(),
            scene.constraints,
            scene.fixedParticles,
          )
        }
      }

      const pool = system.getPool()
      renderer.updateFromPool(pool)
      renderer.updateTrailsFromPool(pool)

      if (constraintVisRef.current && helpersVisible) {
        constraintVisRef.current.update(
          appliedPlayback ? scene.constraints : scene.constraints,
          pool,
        )
      }

      renderer.render()

      fpsFrames.current++
      const fpsElapsed = time - fpsTime.current
      if (fpsElapsed >= 500) {
        const computedFps = Math.round((fpsFrames.current / fpsElapsed) * 1000)
        setFps(computedFps)
        setParticleCount(pool.getCount())
        lastFpsForRecordingRef.current = Math.max(10, computedFps)
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
      if (constraintVisRef.current) {
        constraintVisRef.current.clear()
        constraintVisRef.current = null
      }
      renderer.dispose()
      rendererRef.current = null
      systemRef.current = null
      recorderRef.current = null
    }
  }, [updateRendererFromEmitter, applyPlaybackFrame, helpersVisible])

  useEffect(() => {
    const system = systemRef.current
    const renderer = rendererRef.current
    if (!system) return
    const validIds = new Set<string>()
    scene.emitters.forEach((e) => {
      validIds.add(e.id)
      system.updateEmitter(e)
      if (renderer) {
        renderer.registerEmitterConfig(e)
      }
    })
    system.getEmitterIds().forEach((existingId) => {
      if (!validIds.has(existingId)) {
        system.removeEmitter(existingId)
      }
    })
    system.setForceFields(scene.forceFields)
    system.setCollisionPlanes(scene.collisions)
    system.setConstraints(scene.constraints)
    system.setFixedParticles(scene.fixedParticles)
    system.setConstraintSolver(scene.constraintSolver)
  }, [scene.emitters, scene.forceFields, scene.collisions, scene.constraints, scene.fixedParticles, scene.constraintSolver])

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
    if (constraintVisRef.current) {
      renderer.addHelper(constraintVisRef.current.group)
    }
  }, [scene.emitters, scene.forceFields, scene.collisions])

  useEffect(() => {
    const system = systemRef.current
    const renderer = rendererRef.current
    if (!system) return
    system.reset()
    if (renderer) {
      const pool = system.getPool()
      renderer.updateFromPool(pool)
      renderer.updateTrailsFromPool(pool)
    }
  }, [resetTrigger])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setHelpersVisible(helpersVisible)
    if (!helpersVisible && constraintVisRef.current) {
      constraintVisRef.current.clear()
    }
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
