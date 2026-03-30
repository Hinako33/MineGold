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

function tunnelCenterX(z: number) {
  return Math.round(Math.sin(z * 0.08) * 3 + Math.sin(z * 0.035 + 2.4) * 2);
}

function tunnelCenterY(z: number) {
  return 3 + Math.round(Math.sin(z * 0.05 + 0.8) * 0.6);
}

function isTunnelAir(x: number, y: number, z: number) {
  const centerX = tunnelCenterX(z);
  const centerY = tunnelCenterY(z);
  const dx = Math.abs(x - centerX);
  const dy = y - centerY;
  const radius = 2.85 + Math.sin(z * 0.06) * 0.35;

  const mainTunnel = dx * dx / 7.2 + dy * dy / 3.8 < radius;
  const sidePocket = hash3(Math.floor(x / 3), y, Math.floor(z / 5)) > 0.965 && dx < 4 && dy > -1;
  return mainTunnel || sidePocket;
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
  ensureWorldAround(world, 0, 2);
  return world;
}
