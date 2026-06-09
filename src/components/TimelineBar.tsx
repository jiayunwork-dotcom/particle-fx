import { useRef, useCallback, useMemo, useState } from 'react'
import { Play, Pause, RotateCcw, Repeat, Circle, Trash2, Download, Upload, Square } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import type { RecordingClip } from '@/types/particle'
import { PlaybackRecorder } from '@/engine/PlaybackRecorder'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import NumberInput from '@/components/ui/NumberInput'

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
    isRecording,
    recordingFrameInterval,
    recordingClips,
    selectedClipId,
    isPlaybackMode,
    isPlaybackPlaying,
    currentPlaybackFrame,
    playbackSpeed,
    setRecording,
    setRecordingFrameInterval,
    addRecordingClip,
    removeRecordingClip,
    selectRecordingClip,
    setPlaybackMode,
    setPlaybackPlaying,
    setCurrentPlaybackFrame,
    setPlaybackSpeed,
    setToast,
  } = useEditorStore()

  const progressRef = useRef<HTMLDivElement>(null)
  const playbackRef = useRef<HTMLDivElement>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clipToDelete, setClipToDelete] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const selectedClip = useMemo(
    () => recordingClips.find((c) => c.id === selectedClipId) ?? null,
    [recordingClips, selectedClipId],
  )

  const maxDuration = scene.emitters.length > 0
    ? Math.max(...scene.emitters.map((e) => e.duration))
    : 5

  const progress = maxDuration > 0 ? Math.min(elapsedTime / maxDuration, 1) : 0

  const handlePlayPause = useCallback(() => {
    if (isPlaybackMode) {
      setPlaybackPlaying(!isPlaybackPlaying)
    } else {
      setPlaying(!isPlaying)
    }
  }, [isPlaying, setPlaying, isPlaybackMode, isPlaybackPlaying, setPlaybackPlaying])

  const handleReset = useCallback(() => {
    resetAll()
    if (isPlaybackMode) {
      setCurrentPlaybackFrame(0)
    }
  }, [resetAll, isPlaybackMode, setCurrentPlaybackFrame])

  const handleLoopToggle = useCallback(() => {
    if (!selectedEmitterId) return
    const emitter = scene.emitters.find((e) => e.id === selectedEmitterId)
    if (!emitter) return
    updateEmitter(selectedEmitterId, { looping: !emitter.looping })
  }, [selectedEmitterId, scene.emitters, updateEmitter])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPlaybackMode) return
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    setElapsedTime(ratio * maxDuration)
  }, [maxDuration, setElapsedTime, isPlaybackMode])

  const handlePlaybackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedClip) return
    const bar = playbackRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    setCurrentPlaybackFrame(ratio * (selectedClip.totalFrames - 1))
  }, [selectedClip, setCurrentPlaybackFrame])

  const handleRecordClick = useCallback(() => {
    if (isRecording) return
    setShowSettings(false)
    if (isPlaybackMode) {
      setPlaybackMode(false)
      setPlaybackPlaying(false)
    }
    if (!isPlaying) {
      setPlaying(true)
    }
    setRecording(true)
    setToast({ message: '开始录制...', type: 'info' })
  }, [isRecording, setRecording, isPlaybackMode, setPlaybackMode, setPlaybackPlaying, isPlaying, setPlaying, setToast])

  const handleStopRecording = useCallback(() => {
    setRecording(false)
    setToast({ message: '录制已停止', type: 'success' })
  }, [setRecording, setToast])

  const onClipImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.name && !/\.json$/i.test(file.name)) {
      setToast({ message: '无效的JSON格式', type: 'error' })
      return
    }

    const reader = new FileReader()
    let handled = false

    const handleError = (msg: string) => {
      if (handled) return
      handled = true
      setToast({ message: msg, type: 'error' })
    }

    reader.onerror = () => handleError('读取文件失败')

    reader.onload = (evt) => {
      if (handled) return
      try {
        const text = (evt.target?.result ?? '') as string
        if (!text) {
          handleError('文件内容为空')
          return
        }
        const data = JSON.parse(text)
        const result = PlaybackRecorder.validateImportedClip(data)
        if (!result.valid || !result.clip) {
          handleError(result.error ?? '导入失败')
          return
        }
        handled = true
        addRecordingClip(result.clip)
        setToast({ message: `导入成功：${result.clip.name}`, type: 'success' })
      } catch {
        handleError('无效的JSON格式')
      }
    }

    try {
      reader.readAsText(file)
    } catch {
      handleError('读取文件失败')
    }
  }, [addRecordingClip, setToast])

  const onClipExport = useCallback(() => {
    if (!selectedClip) return
    const recorder = new PlaybackRecorder()
    recorder.downloadClipAsJSON(selectedClip)
    setToast({ message: `已导出：${selectedClip.name}`, type: 'success' })
  }, [selectedClip, setToast])

  const onClipDeleteRequest = useCallback(() => {
    if (!selectedClipId) return
    setClipToDelete(selectedClipId)
    setDeleteConfirmOpen(true)
  }, [selectedClipId])

  const onClipDeleteConfirm = useCallback(() => {
    if (!clipToDelete) return
    removeRecordingClip(clipToDelete)
    setToast({ message: '片段已删除', type: 'success' })
    setClipToDelete(null)
    setDeleteConfirmOpen(false)
  }, [clipToDelete, removeRecordingClip, setToast])

  const onClipSelect = useCallback((val: string) => {
    if (val === '') {
      selectRecordingClip(null)
      setPlaybackMode(false)
      setPlaybackPlaying(false)
      setCurrentPlaybackFrame(0)
      return
    }
    setCurrentPlaybackFrame(0)
    setPlaybackPlaying(false)
    selectRecordingClip(val)
  }, [selectRecordingClip, setPlaybackMode, setPlaybackPlaying, setCurrentPlaybackFrame])

  const clipOptions = useMemo(() => {
    const options = [{ value: '', label: '-- 选择片段 --' }]
    recordingClips.forEach((c: RecordingClip) => {
      const date = new Date(c.createdAt)
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
      options.push({
        value: c.id,
        label: `${c.name} (${c.totalFrames}帧 ${timeStr})`,
      })
    })
    return options
  }, [recordingClips])

  const playbackProgress = selectedClip && selectedClip.totalFrames > 1
    ? currentPlaybackFrame / (selectedClip.totalFrames - 1)
    : 0

  const selectedEmitter = scene.emitters.find((e) => e.id === selectedEmitterId)
  const isLooping = selectedEmitter?.looping ?? true

  return (
    <>
      <div
        className="flex flex-col border-t border-[#2d2d44] bg-[#1a1a2e]"
        style={{ flexShrink: 0 }}
      >
        <div className="flex h-12 items-center px-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${isPlaybackMode
                ? isPlaybackPlaying
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                  : 'bg-[#2d2d44] text-gray-400 hover:text-gray-200'
                : isPlaying
                  ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                  : 'bg-[#2d2d44] text-gray-400 hover:text-gray-200'
              }`}
            >
              {isPlaybackMode
                ? isPlaybackPlaying ? <Pause size={16} /> : <Play size={16} />
                : isPlaying ? <Pause size={16} /> : <Play size={16} />}
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

          <div className="mx-2 h-6 w-px bg-[#2d2d44]" />

          <div className="relative flex items-center gap-1">
            {!isRecording ? (
              <button
                onClick={handleRecordClick}
                disabled={isPlaybackMode}
                className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${isPlaybackMode
                  ? 'bg-[#2d2d44] text-gray-600 cursor-not-allowed'
                  : 'bg-[#2d2d44] text-gray-400 hover:text-[#ff4444]'
                }`}
                title="开始录制"
              >
                <Circle size={14} className="fill-current" />
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="flex h-8 w-8 items-center justify-center rounded bg-red-600/80 text-white animate-pulse hover:bg-red-600 transition-colors"
                title="停止录制"
              >
                <Square size={12} className="fill-current" />
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex h-8 w-8 items-center justify-center rounded text-xs font-mono transition-colors ${showSettings
                ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                : 'bg-[#2d2d44] text-gray-400 hover:text-gray-200'
              }`}
              title={`每${recordingFrameInterval}帧录制`}
            >
              K{recordingFrameInterval}
            </button>
            {showSettings && !isRecording && (
              <div className="absolute left-0 bottom-full mb-2 p-2 rounded border border-[#3a3a55] bg-[#1a1a2e] shadow-xl z-50 w-48">
                <NumberInput
                  label="帧间隔 K"
                  value={recordingFrameInterval}
                  min={1}
                  max={32}
                  step={1}
                  onChange={(v) => setRecordingFrameInterval(Math.max(1, Math.min(32, Math.round(v))))}
                />
                <p className="mt-1 text-[10px] text-[#888] leading-relaxed">
                  录制期间会根据帧率自动调整。默认为每2帧录制一次。
                </p>
              </div>
            )}
          </div>

          <div className="mx-2 h-6 w-px bg-[#2d2d44]" />

          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="mx-4 flex-1 cursor-pointer"
          >
            <div className="h-1 w-full rounded-full bg-[#2d2d44]">
              <div
                className={`h-full rounded-full transition-[width] duration-75 ${isPlaybackMode ? 'bg-[#666]' : 'bg-[#00f0ff]'}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <div className="min-w-[60px] text-right">
            <span className="text-xs font-mono text-gray-400">
              {isPlaybackMode && selectedClip
                ? `${currentPlaybackFrame.toFixed(1)} / ${selectedClip.totalFrames - 1}`
                : `${elapsedTime.toFixed(2)}s`}
            </span>
          </div>
        </div>

        {recordingClips.length > 0 && (
          <div className="flex h-12 items-center gap-2 border-t border-[#2d2d44]/60 px-3 bg-[#16162a]">
            <div className="flex items-center gap-2 w-72 shrink-0">
              <label className="text-[10px] text-[#888] shrink-0">片段</label>
              <div className="flex-1">
                <Select
                  label=""
                  value={selectedClipId ?? ''}
                  options={clipOptions}
                  onChange={onClipSelect}
                />
              </div>
            </div>

            {selectedClip && (
              <>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePlayPause}
                    className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${isPlaybackPlaying
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                      : 'bg-[#2d2d44] text-gray-400 hover:text-gray-200'
                    }`}
                    title={isPlaybackPlaying ? '暂停回放' : '播放回放'}
                  >
                    {isPlaybackPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => setCurrentPlaybackFrame(0)}
                    className="flex h-7 w-7 items-center justify-center rounded bg-[#2d2d44] text-gray-400 hover:text-gray-200 transition-colors"
                    title="回到开始"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>

                <div
                  ref={playbackRef}
                  onClick={handlePlaybackClick}
                  className="flex-1 cursor-pointer"
                >
                  <div className="h-1.5 w-full rounded-full bg-[#2d2d44]">
                    <div
                      className="h-full rounded-full bg-[#ffaa00] transition-[width] duration-50"
                      style={{ width: `${playbackProgress * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 min-w-[180px] justify-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#888]">速度</span>
                    <div className="flex gap-0.5">
                      {[0.25, 0.5, 1, 2, 4].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${playbackSpeed === s
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                            : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-px h-5 bg-[#2d2d44] mx-1" />

                  <label
                    className="flex h-7 w-7 items-center justify-center rounded bg-[#2d2d44] text-gray-400 hover:text-[#00f0ff] transition-colors cursor-pointer"
                    title="导入JSON"
                  >
                    <Upload size={13} />
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={onClipImport}
                    />
                  </label>
                  <button
                    onClick={onClipExport}
                    className="flex h-7 w-7 items-center justify-center rounded bg-[#2d2d44] text-gray-400 hover:text-emerald-400 transition-colors"
                    title="导出JSON"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={onClipDeleteRequest}
                    className="flex h-7 w-7 items-center justify-center rounded bg-[#2d2d44] text-gray-400 hover:text-[#ff4444] transition-colors"
                    title="删除片段"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setClipToDelete(null)
        }}
        title="删除片段"
      >
        <div className="p-4">
          <p className="text-sm text-gray-300 mb-6">
            确定要删除这个录制片段吗？此操作无法撤销。
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false)
                setClipToDelete(null)
              }}
              className="px-4 py-1.5 text-xs rounded border border-[#3a3a55] text-gray-400 hover:text-gray-200 hover:border-[#00f0ff] transition-colors"
            >
              取消
            </button>
            <button
              onClick={onClipDeleteConfirm}
              className="px-4 py-1.5 text-xs rounded bg-red-600/80 text-white hover:bg-red-600 transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
