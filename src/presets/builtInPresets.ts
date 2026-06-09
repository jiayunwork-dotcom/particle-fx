import type { ParticleScene, GradientStop } from '@/types/particle'
import { createDefaultEmitter, createDefaultCurve } from '@/types/particle'

function makeFire(): ParticleScene {
  const emitter = {
    ...createDefaultEmitter(),
    name: 'Fire',
    shape: 'cone' as const,
    shapeParams: { radius: 1, angle: 30 },
    emissionRate: 200,
    blendMode: 'additive' as const,
    builtInShape: 'softCircle' as const,
    duration: 3,
    looping: true,
    lifetime: [0.5, 1.5] as [number, number],
    initialSpeed: [2, 5] as [number, number],
    acceleration: [0, 3, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [1, 0.5, 0] as [number, number, number], alpha: 1 },
      { time: 0.5, color: [1, 1, 0] as [number, number, number], alpha: 0.7 },
      { time: 1, color: [1, 0, 0] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.8 },
        { time: 1, value: 0.2 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 1 },
        { time: 1, value: 0 },
      ],
    },
    orientation: 'billboard' as const,
  }
  return { emitters: [emitter], forceFields: [], collisions: [], background: 'black' }
}

function makeSmoke(): ParticleScene {
  const emitter = {
    ...createDefaultEmitter(),
    name: 'Smoke',
    shape: 'circle' as const,
    shapeParams: { radius: 1 },
    emissionRate: 30,
    blendMode: 'alpha' as const,
    builtInShape: 'smoke' as const,
    duration: 2,
    looping: true,
    lifetime: [2, 4] as [number, number],
    initialSpeed: [0.5, 1.5] as [number, number],
    acceleration: [0, 0.5, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [0.7, 0.7, 0.7] as [number, number, number], alpha: 0.6 },
      { time: 1, color: [0.5, 0.5, 0.5] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.5 },
        { time: 1, value: 2.0 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.6 },
        { time: 1, value: 0 },
      ],
    },
    orientation: 'billboard' as const,
  }
  return { emitters: [emitter], forceFields: [], collisions: [], background: 'black' }
}

function makeExplosion(): ParticleScene {
  const sparkEmitter = {
    ...createDefaultEmitter(),
    name: 'Spark',
    shape: 'point' as const,
    shapeParams: {},
    burstMode: true,
    burstCount: 50,
    emissionRate: 0,
    blendMode: 'additive' as const,
    builtInShape: 'softCircle' as const,
    duration: 1,
    looping: false,
    lifetime: [0.2, 0.5] as [number, number],
    initialSpeed: [5, 10] as [number, number],
    acceleration: [0, -9.8, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [1, 1, 0.5] as [number, number, number], alpha: 1 },
      { time: 1, color: [1, 0.3, 0] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: createDefaultCurve(),
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 1 },
        { time: 1, value: 0 },
      ],
    },
    orientation: 'billboard' as const,
  }

  const emitter = {
    ...createDefaultEmitter(),
    name: 'Explosion',
    shape: 'sphere' as const,
    shapeParams: { radius: 1 },
    burstMode: true,
    burstCount: 300,
    emissionRate: 0,
    blendMode: 'additive' as const,
    builtInShape: 'softCircle' as const,
    duration: 2,
    looping: false,
    lifetime: [0.3, 1.0] as [number, number],
    initialSpeed: [5, 15] as [number, number],
    acceleration: [0, -9.8, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [1, 1, 1] as [number, number, number], alpha: 1 },
      { time: 0.3, color: [1, 0.5, 0] as [number, number, number], alpha: 0.8 },
      { time: 1, color: [0.5, 0, 0] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 1 },
        { time: 1, value: 0.3 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 1 },
        { time: 1, value: 0 },
      ],
    },
    orientation: 'billboard' as const,
    subEmitters: [
      { event: 'death' as const, emitter: sparkEmitter },
    ],
  }
  return { emitters: [emitter], forceFields: [], collisions: [], background: 'black' }
}

function makeRain(): ParticleScene {
  const emitter = {
    ...createDefaultEmitter(),
    name: 'Rain',
    shape: 'rectangle' as const,
    shapeParams: { width: 20, height: 1 },
    emissionRate: 500,
    blendMode: 'alpha' as const,
    builtInShape: 'square' as const,
    duration: 3,
    looping: true,
    lifetime: [0.5, 1.0] as [number, number],
    initialSpeed: [15, 20] as [number, number],
    direction: 'fixed' as const,
    fixedDirection: [0, -1, 0] as [number, number, number],
    acceleration: [0, -2, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [0.6, 0.7, 1] as [number, number, number], alpha: 0.5 },
      { time: 1, color: [0.4, 0.5, 0.8] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.05 },
        { time: 1, value: 0.05 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.5 },
        { time: 1, value: 0.3 },
      ],
    },
    orientation: 'velocity' as const,
  }
  return { emitters: [emitter], forceFields: [], collisions: [], background: 'black' }
}

function makeSnow(): ParticleScene {
  const emitter = {
    ...createDefaultEmitter(),
    name: 'Snow',
    shape: 'rectangle' as const,
    shapeParams: { width: 20, height: 1 },
    emissionRate: 100,
    blendMode: 'alpha' as const,
    builtInShape: 'softCircle' as const,
    duration: 5,
    looping: true,
    lifetime: [3, 6] as [number, number],
    initialSpeed: [0.5, 1.5] as [number, number],
    direction: 'fixed' as const,
    fixedDirection: [0, -1, 0] as [number, number, number],
    acceleration: [0, -0.3, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [1, 1, 1] as [number, number, number], alpha: 0.9 },
      { time: 1, color: [0.9, 0.9, 1] as [number, number, number], alpha: 0.2 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.2 },
        { time: 1, value: 0.2 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.9 },
        { time: 1, value: 0.2 },
      ],
    },
    orientation: 'billboard' as const,
  }
  return {
    emitters: [emitter],
    forceFields: [
      {
        id: crypto.randomUUID(),
        type: 'turbulence' as const,
        position: [0, 0, 0] as [number, number, number],
        strength: 0.5,
        radius: 15,
        frequency: 0.5,
      },
    ],
    collisions: [],
    background: 'black',
  }
}

function makeMagic(): ParticleScene {
  const emitter = {
    ...createDefaultEmitter(),
    name: 'Magic',
    shape: 'circle' as const,
    shapeParams: { radius: 2 },
    emissionRate: 150,
    blendMode: 'additive' as const,
    builtInShape: 'star' as const,
    duration: 3,
    looping: true,
    lifetime: [1, 2] as [number, number],
    initialSpeed: [1, 3] as [number, number],
    acceleration: [0, 0, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [0, 1, 1] as [number, number, number], alpha: 1 },
      { time: 0.5, color: [1, 0, 1] as [number, number, number], alpha: 0.8 },
      { time: 1, color: [0, 1, 1] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.3 },
        { time: 1, value: 0.1 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 1 },
        { time: 1, value: 0 },
      ],
    },
    orientation: 'billboard' as const,
    trail: {
      enabled: true,
      length: 30,
      width: 0.4,
      colorMode: 'particle' as const,
      fixedColor: [1, 1, 1] as [number, number, number],
      sampleInterval: 1,
    },
  }
  return {
    emitters: [emitter],
    forceFields: [
      {
        id: crypto.randomUUID(),
        type: 'gravity' as const,
        position: [0, 0, 0] as [number, number, number],
        strength: 5,
        radius: 5,
      },
    ],
    collisions: [],
    background: 'black',
  }
}

function makeSparks(): ParticleScene {
  const emitter = {
    ...createDefaultEmitter(),
    name: 'Sparks',
    shape: 'point' as const,
    shapeParams: {},
    emissionRate: 100,
    blendMode: 'additive' as const,
    builtInShape: 'softCircle' as const,
    duration: 2,
    looping: true,
    lifetime: [0.3, 0.8] as [number, number],
    initialSpeed: [3, 8] as [number, number],
    acceleration: [0, -9.8, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [1, 0.9, 0.3] as [number, number, number], alpha: 1 },
      { time: 1, color: [1, 0.2, 0] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.15 },
        { time: 1, value: 0.05 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 1 },
        { time: 1, value: 0 },
      ],
    },
    orientation: 'billboard' as const,
  }
  return {
    emitters: [emitter],
    forceFields: [],
    collisions: [
      {
        position: [0, 0, 0] as [number, number, number],
        normal: [0, 1, 0] as [number, number, number],
        bounce: 0.5,
        friction: 0.3,
        lifeDecay: 0.1,
        killOnCollision: false,
      },
    ],
    background: 'black',
  }
}

function makeWaterfall(): ParticleScene {
  const splashEmitter = {
    ...createDefaultEmitter(),
    name: 'Splash',
    shape: 'point' as const,
    shapeParams: {},
    burstMode: true,
    burstCount: 20,
    emissionRate: 0,
    blendMode: 'alpha' as const,
    builtInShape: 'softCircle' as const,
    duration: 1,
    looping: false,
    lifetime: [0.3, 0.6] as [number, number],
    initialSpeed: [1, 3] as [number, number],
    acceleration: [0, -5, 0] as [number, number, number],
    direction: 'fixed' as const,
    fixedDirection: [0, 1, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [0.6, 0.8, 1] as [number, number, number], alpha: 0.6 },
      { time: 1, color: [0.4, 0.6, 0.9] as [number, number, number], alpha: 0 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.15 },
        { time: 1, value: 0.05 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.6 },
        { time: 1, value: 0 },
      ],
    },
    orientation: 'billboard' as const,
  }

  const emitter = {
    ...createDefaultEmitter(),
    name: 'Waterfall',
    shape: 'rectangle' as const,
    shapeParams: { width: 3, height: 0.5 },
    emissionRate: 400,
    blendMode: 'alpha' as const,
    builtInShape: 'softCircle' as const,
    duration: 3,
    looping: true,
    lifetime: [1, 2] as [number, number],
    initialSpeed: [2, 4] as [number, number],
    direction: 'fixed' as const,
    fixedDirection: [0, -1, 0] as [number, number, number],
    acceleration: [0, -9.8, 0] as [number, number, number],
    colorGradient: [
      { time: 0, color: [0.5, 0.7, 1] as [number, number, number], alpha: 0.7 },
      { time: 1, color: [0.3, 0.5, 0.9] as [number, number, number], alpha: 0.3 },
    ] satisfies GradientStop[],
    sizeCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.2 },
        { time: 1, value: 0.15 },
      ],
    },
    opacityCurve: {
      type: 'smooth' as const,
      points: [
        { time: 0, value: 0.8 },
        { time: 1, value: 0.3 },
      ],
    },
    orientation: 'billboard' as const,
    subEmitters: [
      { event: 'death' as const, emitter: splashEmitter },
    ],
  }
  return {
    emitters: [emitter],
    forceFields: [],
    collisions: [
      {
        position: [0, -3, 0] as [number, number, number],
        normal: [0, 1, 0] as [number, number, number],
        bounce: 0.1,
        friction: 0.5,
        lifeDecay: 0.2,
        killOnCollision: false,
      },
    ],
    background: 'black',
  }
}

export const builtInPresets: { name: string; description: string; scene: ParticleScene }[] = [
  {
    name: '火焰',
    description: '向上喷射的火焰效果，具有橙黄红色渐变和锥形发射器',
    scene: makeFire(),
  },
  {
    name: '烟雾',
    description: '缓慢上升并扩散的灰色烟雾效果',
    scene: makeSmoke(),
  },
  {
    name: '爆炸',
    description: '球形爆发效果，带有死亡时触发的火花子发射器',
    scene: makeExplosion(),
  },
  {
    name: '雨',
    description: '大面积矩形区域下落的雨滴效果，沿速度方向对齐',
    scene: makeRain(),
  },
  {
    name: '雪',
    description: '飘落的雪花效果，带有湍流力场使其左右摇摆',
    scene: makeSnow(),
  },
  {
    name: '魔法光效',
    description: '向中心聚拢的青紫渐变魔法粒子，带有重力力场',
    scene: makeMagic(),
  },
  {
    name: '火花',
    description: '受重力影响的火花飞溅效果，带有地面碰撞反弹',
    scene: makeSparks(),
  },
  {
    name: '瀑布水流',
    description: '垂直下落的水流效果，带有碰撞平面和溅射子发射器',
    scene: makeWaterfall(),
  },
]
