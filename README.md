# Voxel Mine

第一版是一个真实 voxel world 的网页原型：玩家以第一人称进入矿洞，面前是一段已开凿的通道与石墙，可以通过鼠标点击持续挖掉前方方块。

## Stack

- Vite
- React
- TypeScript
- Three.js
- React Three Fiber
- Drei
- Zustand

## Current features

- Chunk-based voxel world data
- Streamed chunk loading around the player with far-chunk pruning
- Layered main tunnels with deterministic side-branch caves
- Exposed-face mesh generation with atlas UVs
- Procedural pixel-art texture atlas
- First-person mouse look with pointer lock
- WASD movement with collision checks and slide correction
- Hold-to-mine block damage with crack overlay stages
- Center raycast mining and right-click block placement
- Placement preview with valid/invalid feedback
- Hotbar block selection with inventory counts
- First-person pickaxe model with swing feedback
- Procedural chip-tune style mining and placement sounds
- Torch lights and denser cave fog for atmosphere
- Target outline and impact burst particles

## Project structure

```text
.
├── docs/
│   └── architecture.md
├── src/
│   ├── components/
│   │   ├── CaveWorld.tsx
│   │   ├── GameHud.tsx
│   │   └── GameScene.tsx
│   ├── game/
│   │   ├── core/
│   │   │   ├── blocks.ts
│   │   │   ├── config.ts
│   │   │   ├── coords.ts
│   │   │   └── world.ts
│   │   ├── render/
│   │   │   ├── buildChunkGeometry.ts
│   │   │   └── ChunkMeshes.tsx
│   │   ├── store/
│   │   │   └── useGameStore.ts
│   │   ├── systems/
│   │   │   └── useFirstPersonMovement.ts
│   │   ├── types/
│   │   │   └── world.ts
│   │   └── utils/
│   │       └── noise.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
└── vite.config.ts
```

## Run

```bash
npm install --cache /tmp/npm-cache
npm run dev
```

## Next milestones

1. Add texture atlas UVs and pixel-art block textures
2. Replace naive meshing with greedy meshing
3. Add block placement and a hotbar
4. Stream chunks around the player
5. Add pickaxe animation, particles, sound, and save data
