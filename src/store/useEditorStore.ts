import { create } from 'zustand'
import type { EmitterConfig, ForceField, CollisionPlane, ParticleScene } from '@/types/particle'
import { createDefaultEmitter } from '@/types/particle'

interface EditorState {
  scene: ParticleScene
  selectedEmitterId: string | null
  isPlaying: boolean
  elapsedTime: number
  background: 'black' | 'white' | 'checker' | 'custom'
  showPresets: boolean
  showExport: boolean
  leftPanelOpen: boolean
  rightPanelOpen: boolean
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
  setPlaying: (playing: boolean) => void
  setElapsedTime: (time: number) => void
  resetTime: () => void
  setBackground: (bg: 'black' | 'white' | 'checker' | 'custom') => void
  togglePresets: () => void
  toggleExport: () => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  loadPreset: (scene: ParticleScene) => void
}

type EditorStore = EditorState & EditorActions

const defaultEmitter = createDefaultEmitter()

const initialState: ParticleScene = {
  emitters: [defaultEmitter],
  forceFields: [],
  collisions: [],
  background: 'black',
}

export const useEditorStore = create<EditorStore>()((set) => ({
  scene: initialState,
  selectedEmitterId: defaultEmitter.id,
  isPlaying: false,
  elapsedTime: 0,
  background: 'black',
  showPresets: false,
  showExport: false,
  leftPanelOpen: true,
  rightPanelOpen: true,

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

  setPlaying: (playing) => set({ isPlaying: playing }),

  setElapsedTime: (time) => set({ elapsedTime: time }),

  resetTime: () => set({ elapsedTime: 0 }),

  setBackground: (bg) =>
    set((state) => ({
      background: bg,
      scene: { ...state.scene, background: bg },
    })),

  togglePresets: () => set((state) => ({ showPresets: !state.showPresets })),

  toggleExport: () => set((state) => ({ showExport: !state.showExport })),

  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  loadPreset: (scene) => set({ scene, selectedEmitterId: scene.emitters.length > 0 ? scene.emitters[0].id : null, elapsedTime: 0 }),
}))
