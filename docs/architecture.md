# Voxel Mine Architecture

## Tech stack

- Vite + React + TypeScript
- Three.js + React Three Fiber + Drei
- Zustand for game state

## Core goals for phase 1

- Render a real voxel world rather than a flat fake wall
- Start the player in a carved mine tunnel facing a solid stone wall
- Support first-person camera, WASD movement, pointer lock, and mining
- Build around chunk data so the project can grow into streaming terrain, saving, ore generation, and combat

## System design

### App shell

- React owns UI, HUD, loading state, and scene composition
- R3F owns the render loop and 3D scene graph

### World model

- The world is split into fixed-size chunks
- Each chunk stores block ids in a compact typed array
- Chunks are generated procedurally around the player as they move through the mine
- The main tunnel now varies in width and height, and deterministic side branches create deeper cave pockets
- Persistent world edits are stored separately so mined and placed blocks survive chunk unload/reload
- Block edits mutate chunk data and mark only affected chunks dirty

### Rendering

- Each dirty chunk rebuilds one merged `BufferGeometry`
- Only exposed block faces are emitted
- A generated texture atlas provides pixel-art block surfaces through UV-mapped chunk meshes

### Interaction

- Pointer lock provides mouse-look
- The player mines by raycasting from the camera center
- Holding the mouse accumulates block damage based on hardness instead of breaking instantly
- Right click places the selected hotbar block on the adjacent face
- Placement preview shows whether the selected block can be placed without colliding with the player
- Mining removes the targeted voxel and increments inventory
- Neighboring chunks are also marked dirty so exposed faces appear immediately
- A crack overlay, first-person pickaxe mesh, target outline, and impact particles provide immediate feedback
- Collision sampling is shared between movement and placement so build interactions stay consistent

### Expansion path

- Texture atlas and UV-based block materials
- Greedy meshing to reduce geometry cost
- Save/load chunk diffs
- Chunk streaming around the player
- Enemies, tools, upgrades, drops, VFX, and audio

## Recommended next milestones

1. Replace flat colors with a pixel texture atlas
2. Add block placement and a hotbar
3. Add chunk streaming around the player
4. Add stronger collision and gravity
5. Add mining animation, particles, and sounds
