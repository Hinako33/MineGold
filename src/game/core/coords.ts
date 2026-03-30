import * as THREE from "three";
import { CHUNK_SIZE } from "./config";

export function chunkKeyFromCoords(chunkX: number, chunkY: number, chunkZ: number) {
  return `${chunkX},${chunkY},${chunkZ}`;
}

export function worldToChunk(worldX: number, worldY: number, worldZ: number) {
  return {
    chunkX: Math.floor(worldX / CHUNK_SIZE),
    chunkY: Math.floor(worldY / CHUNK_SIZE),
    chunkZ: Math.floor(worldZ / CHUNK_SIZE),
  };
}

export function toLocalCoord(value: number) {
  return ((value % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

export function worldToBlock(vector: THREE.Vector3) {
  return {
    x: Math.floor(vector.x),
    y: Math.floor(vector.y),
    z: Math.floor(vector.z),
  };
}
