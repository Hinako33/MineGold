import * as THREE from "three";
import { BLOCK_AIR, type BlockId } from "../core/blocks";
import { CHUNK_SIZE } from "../core/config";
import { getBlock } from "../core/world";
import type { ChunkData, WorldData } from "../types/world";
import { getBlockUvTile } from "./atlas";

const FACE_DEFINITIONS = [
  {
    normal: [0, 0, 1],
    vertices: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    vertices: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  {
    normal: [1, 0, 0],
    vertices: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    vertices: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, 1, 0],
    vertices: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
] as const;

function chunkBlock(chunk: ChunkData, x: number, y: number, z: number): BlockId {
  return chunk.blocks[x + CHUNK_SIZE * (y + CHUNK_SIZE * z)] as BlockId;
}

export function buildChunkGeometry(world: WorldData, chunk: ChunkData) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const [chunkX, chunkY, chunkZ] = chunk.coords;
  const baseX = chunkX * CHUNK_SIZE;
  const baseY = chunkY * CHUNK_SIZE;
  const baseZ = chunkZ * CHUNK_SIZE;

  for (let x = 0; x < CHUNK_SIZE; x += 1) {
    for (let y = 0; y < CHUNK_SIZE; y += 1) {
      for (let z = 0; z < CHUNK_SIZE; z += 1) {
        const block = chunkBlock(chunk, x, y, z);
        if (block === BLOCK_AIR) {
          continue;
        }

        const worldX = baseX + x;
        const worldY = baseY + y;
        const worldZ = baseZ + z;
        const tile = getBlockUvTile(block);

        for (const face of FACE_DEFINITIONS) {
          const [nx, ny, nz] = face.normal;
          const neighbor = getBlock(world, worldX + nx, worldY + ny, worldZ + nz);
          if (neighbor !== BLOCK_AIR) {
            continue;
          }

          for (const [vx, vy, vz] of face.vertices) {
            positions.push(worldX + vx, worldY + vy, worldZ + vz);
            normals.push(nx, ny, nz);
          }

          uvs.push(tile.u0, tile.v0, tile.u1, tile.v0, tile.u1, tile.v1, tile.u0, tile.v1);

          indices.push(
            vertexOffset,
            vertexOffset + 1,
            vertexOffset + 2,
            vertexOffset,
            vertexOffset + 2,
            vertexOffset + 3,
          );
          vertexOffset += 4;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
