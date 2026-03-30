import { BLOCK_AIR, BLOCK_GOLD, BLOCK_IRON, BLOCK_STONE, type BlockId } from "./blocks";
import { CHUNK_PRUNE_RADIUS, CHUNK_SIZE, CHUNK_STREAM_RADIUS, WORLD_HEIGHT } from "./config";
import { chunkKeyFromCoords, toLocalCoord, worldToChunk } from "./coords";
import type { ChunkData, ChunkKey, WorldData } from "../types/world";
import { hash3 } from "../utils/noise";

function createChunk(chunkX: number, chunkY: number, chunkZ: number): ChunkData {
  return {
    key: chunkKeyFromCoords(chunkX, chunkY, chunkZ),
    coords: [chunkX, chunkY, chunkZ],
    blocks: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE),
    dirty: 0,
  };
}

function indexFromLocal(x: number, y: number, z: number) {
  return x + CHUNK_SIZE * (y + CHUNK_SIZE * z);
}

function editKey(x: number, y: number, z: number) {
  return `${x},${y},${z}`;
}

function carveSpawnSafeZone(world: WorldData) {
  for (let x = -3; x <= 3; x += 1) {
    for (let z = -2; z <= 6; z += 1) {
      world.edits[editKey(x, 0, z)] = BLOCK_STONE;
      for (let y = 1; y <= 5; y += 1) {
        world.edits[editKey(x, y, z)] = BLOCK_AIR;
      }
    }
  }
}

function tunnelCenterX(z: number) {
  return Math.sin(z * 0.055) * 2.8 + Math.sin(z * 0.021 + 2.1) * 1.6;
}

function tunnelCenterY(z: number) {
  return 3.1 + Math.sin(z * 0.038 + 0.8) * 0.55 + Math.sin(z * 0.015) * 0.35;
}

function branchDescriptor(segment: number, direction: -1 | 1) {
  const activation = hash3(segment * direction, direction, 9);
  if (activation < 0.48) {
    return null;
  }

  const startZ = segment * 18 + 10;
  const startX = tunnelCenterX(startZ);
  const startY = tunnelCenterY(startZ);
  const length = 7 + Math.floor(hash3(segment, direction, 4) * 8);
  const tilt = (hash3(segment, direction, 7) - 0.5) * 1.8;

  return {
    startX,
    startY,
    startZ,
    length,
    direction,
    tilt,
  };
}

function isBranchAir(x: number, y: number, z: number) {
  const segment = Math.floor(z / 18);

  for (let offset = -1; offset <= 1; offset += 1) {
    for (const direction of [-1, 1] as const) {
      const branch = branchDescriptor(segment + offset, direction);
      if (!branch) {
        continue;
      }

      const relativeX = (x - branch.startX) * direction;
      if (relativeX < 2 || relativeX > branch.length + 2) {
        continue;
      }

      const depthCurve = branch.startY + Math.sin(relativeX * 0.28 + branch.tilt) * 0.9;
      const localZ = Math.abs(z - (branch.startZ + relativeX * branch.tilt));
      const localY = y - depthCurve;
      if (localZ * localZ / 5.4 + localY * localY / 3.6 < 1.15) {
        return true;
      }

      if (relativeX > branch.length * 0.75) {
        const pocketX = relativeX - branch.length * 0.85;
        if (pocketX * pocketX / 8 + localZ * localZ / 4 + localY * localY / 5 < 1) {
          return true;
        }
      }
    }
  }

  return false;
}

function isTunnelAir(x: number, y: number, z: number) {
  const centerX = tunnelCenterX(z);
  const centerY = tunnelCenterY(z);
  const dx = x - centerX;
  const dy = y - centerY;
  const radius = 3.2 + Math.sin(z * 0.045) * 0.3;

  const mainTunnel = dx * dx / 8.6 + dy * dy / 4.4 < radius;
  const sidePocket = hash3(Math.floor(x / 3), y, Math.floor(z / 5)) > 0.972 && Math.abs(dx) < 4.5 && dy > -1.2;
  const branchTunnel = isBranchAir(x, y, z);
  return mainTunnel || sidePocket || branchTunnel;
}

function chooseOre(x: number, y: number, z: number): BlockId {
  const ironRoll = hash3(x, y, z);
  if (ironRoll > 0.83) {
    return BLOCK_IRON;
  }

  const goldRoll = hash3(x + 31, y + 17, z + 11);
  if (goldRoll > 0.94 && y < 5) {
    return BLOCK_GOLD;
  }

  return BLOCK_STONE;
}

function generateBaseBlock(x: number, y: number, z: number): BlockId {
  if (y < 0 || y >= WORLD_HEIGHT) {
    return BLOCK_AIR;
  }

  if (y === 0) {
    return BLOCK_STONE;
  }

  if (isTunnelAir(x, y, z)) {
    return BLOCK_AIR;
  }

  return chooseOre(x, y, z);
}

function fillChunk(world: WorldData, chunk: ChunkData) {
  const [chunkX, chunkY, chunkZ] = chunk.coords;
  const baseX = chunkX * CHUNK_SIZE;
  const baseY = chunkY * CHUNK_SIZE;
  const baseZ = chunkZ * CHUNK_SIZE;

  for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
    for (let ly = 0; ly < CHUNK_SIZE; ly += 1) {
      for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
        const x = baseX + lx;
        const y = baseY + ly;
        const z = baseZ + lz;
        const key = editKey(x, y, z);
        const edited = world.edits[key];
        chunk.blocks[indexFromLocal(lx, ly, lz)] =
          edited !== undefined ? edited : generateBaseBlock(x, y, z);
      }
    }
  }
}

function ensureChunk(world: WorldData, chunkX: number, chunkY: number, chunkZ: number) {
  const key = chunkKeyFromCoords(chunkX, chunkY, chunkZ);
  if (world.chunks[key]) {
    return world.chunks[key];
  }

  const chunk = createChunk(chunkX, chunkY, chunkZ);
  fillChunk(world, chunk);
  world.chunks[key] = chunk;
  return chunk;
}

export function getChunk(world: WorldData, chunkKey: ChunkKey) {
  return world.chunks[chunkKey];
}

export function getLoadedChunkCount(world: WorldData) {
  return Object.keys(world.chunks).length;
}

export function getBlock(world: WorldData, x: number, y: number, z: number): BlockId {
  if (y < 0 || y >= WORLD_HEIGHT) {
    return BLOCK_AIR;
  }

  const { chunkX, chunkY, chunkZ } = worldToChunk(x, y, z);
  const key = chunkKeyFromCoords(chunkX, chunkY, chunkZ);
  const chunk = world.chunks[key];
  if (!chunk) {
    return generateBaseBlock(x, y, z);
  }

  return chunk.blocks[indexFromLocal(toLocalCoord(x), toLocalCoord(y), toLocalCoord(z))] as BlockId;
}

export function setBlock(world: WorldData, x: number, y: number, z: number, block: BlockId) {
  if (y < 0 || y >= WORLD_HEIGHT) {
    return;
  }

  const { chunkX, chunkY, chunkZ } = worldToChunk(x, y, z);
  const chunk = ensureChunk(world, chunkX, chunkY, chunkZ);
  chunk.blocks[indexFromLocal(toLocalCoord(x), toLocalCoord(y), toLocalCoord(z))] = block;
  chunk.dirty += 1;
  world.edits[editKey(x, y, z)] = block;
}

export function markNeighborChunksDirty(world: WorldData, x: number, y: number, z: number) {
  const candidates = [
    worldToChunk(x - 1, y, z),
    worldToChunk(x + 1, y, z),
    worldToChunk(x, y - 1, z),
    worldToChunk(x, y + 1, z),
    worldToChunk(x, y, z - 1),
    worldToChunk(x, y, z + 1),
  ];

  for (const candidate of candidates) {
    const key = chunkKeyFromCoords(candidate.chunkX, candidate.chunkY, candidate.chunkZ);
    const chunk = world.chunks[key];
    if (chunk) {
      chunk.dirty += 1;
    }
  }
}

export function ensureWorldAround(world: WorldData, x: number, z: number) {
  const { chunkX, chunkZ } = worldToChunk(x, 0, z);

  for (let offsetX = -CHUNK_STREAM_RADIUS; offsetX <= CHUNK_STREAM_RADIUS; offsetX += 1) {
    for (let offsetZ = -CHUNK_STREAM_RADIUS; offsetZ <= CHUNK_STREAM_RADIUS; offsetZ += 1) {
      ensureChunk(world, chunkX + offsetX, 0, chunkZ + offsetZ);
    }
  }

  for (const [key, chunk] of Object.entries(world.chunks)) {
    const [loadedX, , loadedZ] = chunk.coords;
    if (
      Math.abs(loadedX - chunkX) > CHUNK_PRUNE_RADIUS ||
      Math.abs(loadedZ - chunkZ) > CHUNK_PRUNE_RADIUS
    ) {
      delete world.chunks[key];
    }
  }
}

export function createInitialWorld(): WorldData {
  const world: WorldData = { chunks: {}, edits: {} };
  carveSpawnSafeZone(world);
  ensureWorldAround(world, 0, 2);
  return world;
}

export function getTorchPositions(playerZ: number) {
  const torches: Array<{ x: number; y: number; z: number }> = [];
  const startZ = Math.floor((playerZ - 28) / 8) * 8;
  const endZ = Math.floor((playerZ + 28) / 8) * 8;

  for (let z = startZ; z <= endZ; z += 8) {
    const centerX = tunnelCenterX(z);
    const centerY = tunnelCenterY(z);
    const side = hash3(z, 0, 4) > 0.5 ? -1 : 1;
    torches.push({
      x: centerX + side * 2.3,
      y: centerY + 0.2,
      z,
    });
  }

  return torches;
}
