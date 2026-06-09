import { create } from 'zustand'
import type { EmitterConfig, ForceField, CollisionPlane, ParticleScene, Constraint, ConstraintSolverConfig, RecordingClip } from '@/types/particle'
import { createDefaultEmitter } from '@/types/particle'

interface EditorState {
  scene: ParticleScene
  selectedEmitterId: string | null
  isPlaying: boolean
  elapsedTime: number
  resetTrigger: number
  background: 'black' | 'white' | 'checker' | 'custom'
  helpersVisible: boolean
  showPresets: boolean
  showExport: boolean
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  isRecording: boolean
  recordingFrameInterval: number
  recordingClips: RecordingClip[]
  selectedClipId: string | null
  isPlaybackMode: boolean
  isPlaybackPlaying: boolean
  currentPlaybackFrame: number
  playbackSpeed: number
  toast: { message: string; type: 'info' | 'success' | 'error' } | null
}

interface EditorActions {
  addEmitter: () => void
  removeEmitter: (id: string) => void
  duplicateEmitter: (id: string) => void
  selectEmitter: (id: string | null) => void
  updateEmitter: (id: string, updates: Partial<EmitterConfig>) => void
  addForceField: (field: ForceField) => void
  removeForceField: (id: string) => void
  updateForceField: (id: string, updates: Partial<ForceField>) => void
  addCollision: (collision: CollisionPlane) => void
  removeCollision: (index: number) => void
  updateCollision: (index: number, updates: Partial<CollisionPlane>) => void
  addConstraint: (constraint: Constraint) => void
  removeConstraint: (id: string) => void
  updateConstraint: (id: string, updates: Partial<Constraint>) => void
  setConstraints: (constraints: Constraint[]) => void
  addFixedParticle: (index: number) => void
  removeFixedParticle: (index: number) => void
  setFixedParticles: (indices: number[]) => void
  setConstraintSolver: (config: Partial<ConstraintSolverConfig>) => void
  setPlaying: (playing: boolean) => void
  setElapsedTime: (time: number) => void
  resetTime: () => void
  resetAll: () => void
  setBackground: (bg: 'black' | 'white' | 'checker' | 'custom') => void
  toggleHelpers: () => void
  togglePresets: () => void
  toggleExport: () => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  loadPreset: (scene: ParticleScene) => void
  setRecording: (recording: boolean) => void
  setRecordingFrameInterval: (k: number) => void
  addRecordingClip: (clip: RecordingClip) => void
  removeRecordingClip: (id: string) => void
  selectRecordingClip: (id: string | null) => void
  setPlaybackMode: (mode: boolean) => void
  setPlaybackPlaying: (playing: boolean) => void
  setCurrentPlaybackFrame: (frame: number) => void
  setPlaybackSpeed: (speed: number) => void
  setToast: (toast: { message: string; type: 'info' | 'success' | 'error' } | null) => void
  clearToast: () => void
}

type EditorStore = EditorState & EditorActions

const defaultEmitter = createDefaultEmitter()

const initialScene: ParticleScene = {
  emitters: [defaultEmitter],
  forceFields: [],
  collisions: [],
  constraints: [],
  fixedParticles: [],
  constraintSolver: { iterations: 4 },
  background: 'black',
}

export const useEditorStore = create<EditorStore>()((set) => ({
  scene: initialScene,
  selectedEmitterId: defaultEmitter.id,
  isPlaying: false,
  elapsedTime: 0,
  resetTrigger: 0,
  background: 'black',
  helpersVisible: true,
  showPresets: false,
  showExport: false,
  leftPanelOpen: true,
  rightPanelOpen: true,
  isRecording: false,
  recordingFrameInterval: 2,
  recordingClips: [],
  selectedClipId: null,
  isPlaybackMode: false,
  isPlaybackPlaying: false,
  currentPlaybackFrame: 0,
  playbackSpeed: 1,
  toast: null,

  addEmitter: () =>
    set((state) => {
      const emitter = createDefaultEmitter()
      return {
        scene: { ...state.scene, emitters: [...state.scene.emitters, emitter] },
        selectedEmitterId: emitter.id,
      }
    }),

  removeEmitter: (id) =>
    set((state) => {
      const emitters = state.scene.emitters.filter((e) => e.id !== id)
      return {
        scene: { ...state.scene, emitters },
        selectedEmitterId: state.selectedEmitterId === id ? (emitters.length > 0 ? emitters[0].id : null) : state.selectedEmitterId,
      }
    }),

  duplicateEmitter: (id) =>
    set((state) => {
      const source = state.scene.emitters.find((e) => e.id === id)
      if (!source) return state
      const copy: EmitterConfig = { ...source, id: crypto.randomUUID(), name: source.name + ' Copy' }
      return {
        scene: { ...state.scene, emitters: [...state.scene.emitters, copy] },
        selectedEmitterId: copy.id,
      }
    }),

  selectEmitter: (id) => set({ selectedEmitterId: id }),

  updateEmitter: (id, updates) =>
    set((state) => ({
      scene: {
        ...state.scene,
        emitters: state.scene.emitters.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      },
    })),

  addForceField: (field) =>
    set((state) => ({
      scene: { ...state.scene, forceFields: [...state.scene.forceFields, field] },
    })),

  removeForceField: (id) =>
    set((state) => ({
      scene: { ...state.scene, forceFields: state.scene.forceFields.filter((f) => f.id !== id) },
    })),

  updateForceField: (id, updates) =>
    set((state) => ({
      scene: {
        ...state.scene,
        forceFields: state.scene.forceFields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      },
    })),

  addCollision: (collision) =>
    set((state) => ({
      scene: { ...state.scene, collisions: [...state.scene.collisions, collision] },
    })),

  removeCollision: (index) =>
    set((state) => ({
      scene: { ...state.scene, collisions: state.scene.collisions.filter((_, i) => i !== index) },
    })),

  updateCollision: (index, updates) =>
    set((state) => ({
      scene: {
        ...state.scene,
        collisions: state.scene.collisions.map((c, i) => (i === index ? { ...c, ...updates } : c)),
      },
    })),

  addConstraint: (constraint) =>
    set((state) => ({
      scene: { ...state.scene, constraints: [...state.scene.constraints, constraint] },
    })),

  removeConstraint: (id) =>
    set((state) => ({
      scene: { ...state.scene, constraints: state.scene.constraints.filter((c) => c.id !== id) },
    })),

  updateConstraint: (id, updates) =>
    set((state) => ({
      scene: {
        ...state.scene,
        constraints: state.scene.constraints.map((c) =>
          c.id === id ? ({ ...c, ...updates } as Constraint) : c,
        ),
      },
    })),

  setConstraints: (constraints) =>
    set((state) => ({
      scene: { ...state.scene, constraints },
    })),

  addFixedParticle: (index) =>
    set((state) => {
      if (state.scene.fixedParticles.includes(index)) return state
      return {
        scene: { ...state.scene, fixedParticles: [...state.scene.fixedParticles, index] },
      }
    }),

  removeFixedParticle: (index) =>
    set((state) => ({
      scene: {
        ...state.scene,
        fixedParticles: state.scene.fixedParticles.filter((i) => i !== index),
      },
    })),

  setFixedParticles: (indices) =>
    set((state) => ({
      scene: { ...state.scene, fixedParticles: indices },
    })),

  setConstraintSolver: (config) =>
    set((state) => ({
      scene: {
        ...state.scene,
        constraintSolver: { ...state.scene.constraintSolver, ...config },
      },
    })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setElapsedTime: (time) => set({ elapsedTime: time }),

  resetTime: () => set({ elapsedTime: 0 }),

  resetAll: () => set((state) => ({ elapsedTime: 0, resetTrigger: state.resetTrigger + 1 })),

  setBackground: (bg) =>
    set((state) => ({
      background: bg,
      scene: { ...state.scene, background: bg },
    })),

  toggleHelpers: () => set((state) => ({ helpersVisible: !state.helpersVisible })),

  togglePresets: () => set((state) => ({ showPresets: !state.showPresets })),

  toggleExport: () => set((state) => ({ showExport: !state.showExport })),

  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  loadPreset: (scene) =>
    set((state) => ({
      scene,
      selectedEmitterId: scene.emitters.length > 0 ? scene.emitters[0].id : null,
      elapsedTime: 0,
      resetTrigger: state.resetTrigger + 1,
    })),

  setRecording: (recording) => set({ isRecording: recording }),

  setRecordingFrameInterval: (k) => set({ recordingFrameInterval: k }),

  addRecordingClip: (clip) =>
    set((state) => {
      const isFirstClip = state.recordingClips.length === 0
      return {
        recordingClips: [...state.recordingClips, clip],
        selectedClipId: state.selectedClipId ?? clip.id,
        isPlaybackMode: isFirstClip || state.selectedClipId === null ? true : state.isPlaybackMode,
        currentPlaybackFrame: isFirstClip || state.selectedClipId === null ? 0 : state.currentPlaybackFrame,
        isPlaybackPlaying: false,
      }
    }),

  removeRecordingClip: (id) =>
    set((state) => {
      const newClips = state.recordingClips.filter((c) => c.id !== id)
      const nextSelected = state.selectedClipId === id
        ? (newClips.length > 0 ? newClips[0].id : null)
        : state.selectedClipId
      return {
        recordingClips: newClips,
        selectedClipId: nextSelected,
        isPlaybackMode: nextSelected !== null ? state.isPlaybackMode : false,
        isPlaybackPlaying: state.selectedClipId === id ? false : state.isPlaybackPlaying,
        currentPlaybackFrame: state.selectedClipId === id ? 0 : state.currentPlaybackFrame,
      }
    }),

  selectRecordingClip: (id) =>
    set(() => ({
      selectedClipId: id,
      currentPlaybackFrame: 0,
      isPlaybackPlaying: false,
      isPlaybackMode: id !== null,
    })),

  setPlaybackMode: (mode) =>
    set((state) => ({
      isPlaybackMode: mode,
      isPlaybackPlaying: mode ? state.isPlaybackPlaying : false,
    })),

  setPlaybackPlaying: (playing) => set({ isPlaybackPlaying: playing }),

  setCurrentPlaybackFrame: (frame) => set({ currentPlaybackFrame: frame }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setToast: (toast) => set({ toast }),

  clearToast: () => set({ toast: null }),
}))
