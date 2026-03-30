import type { BlockId } from "../core/blocks";

export type ChunkKey = string;

export interface ChunkData {
  key: ChunkKey;
  coords: [number, number, number];
  blocks: Uint8Array;
  dirty: number;
}

export interface WorldData {
  chunks: Record<ChunkKey, ChunkData>;
  edits: Record<string, BlockId>;
}

export type BlockAccessor = (x: number, y: number, z: number) => BlockId;
