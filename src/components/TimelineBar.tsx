import { useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Repeat } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'

export default function TimelineBar() {
  const {
    isPlaying,
    elapsedTime,
    scene,
    selectedEmitterId,
    setPlaying,
    resetAll,
    setElapsedTime,
    updateEmitter,
  } = useEditorStore()

  const progressRef = useRef<HTMLDivElement>(null)

  const maxDuration = scene.emitters.length > 0
    ? Math.max(...scene.emitters.map((e) => e.duration))
    : 5

  const progress = maxDuration > 0 ? Math.min(elapsedTime / maxDuration, 1) : 0

  const handlePlayPause = useCallback(() => {
    setPlaying(!isPlaying)
  }, [isPlaying, setPlaying])

  const handleReset = useCallback(() => {
    resetAll()
  }, [resetAll])

  const handleLoopToggle = useCallback(() => {
    if (!selectedEmitterId) return
    const emitter = scene.emitters.find((e) => e.id === selectedEmitterId)
    if (!emitter) return
    updateEmitter(selectedEmitterId, { looping: !emitter.looping })
  }, [selectedEmitterId, scene.emitters, updateEmitter])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    setElapsedTime(ratio * maxDuration)
  }, [maxDuration, setElapsedTime])

  const selectedEmitter = scene.emitters.find((e) => e.id === selectedEmitterId)
  const isLooping = selectedEmitter?.looping ?? true

  return (
    <div
      className="flex h-12 items-center border-t border-[#2d2d44] bg-[#1a1a2e] px-3"
      style={{ flexShrink: 0 }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${isPlaying ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'bg-[#2d2d44] text-gray-400 hover:text-gray-200'}`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          onClick={handleReset}
          className="flex h-8 w-8 items-center justify-center rounded bg-[#2d2d44] text-gray-400 transition-colors hover:text-gray-200"
        >
          <RotateCcw size={14} />
        </button>

        <button
          onClick={handleLoopToggle}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${isLooping ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'bg-[#2d2d44] text-gray-400 hover:text-gray-200'}`}
        >
          <Repeat size={14} />
        </button>
      </div>

      <div
        ref={progressRef}
        onClick={handleProgressClick}
        className="mx-4 flex-1 cursor-pointer"
      >
        <div className="h-1 w-full rounded-full bg-[#2d2d44]">
          <div
            className="h-full rounded-full bg-[#00f0ff] transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="min-w-[60px] text-right">
        <span className="text-xs font-mono text-gray-400">
          {elapsedTime.toFixed(2)}s
        </span>
      </div>
    </div>
  )
}
