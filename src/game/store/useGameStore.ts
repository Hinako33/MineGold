import { create } from "zustand";
import type { BlockId, PlaceableBlockId } from "../core/blocks";
import { BLOCK_AIR, BLOCK_HARDNESS, BLOCK_LABELS, BLOCK_STONE, PLACEABLE_BLOCKS } from "../core/blocks";
import {
  createInitialWorld,
  ensureWorldAround,
  getBlock as readBlock,
  getLoadedChunkCount,
  markNeighborChunksDirty,
  setBlock,
} from "../core/world";
import type { WorldData } from "../types/world";

type PlaceableInventory = Record<PlaceableBlockId, number>;

interface TargetBlock {
  x: number;
  y: number;
  z: number;
}

interface MiningTarget extends TargetBlock {
  blockId: Exclude<BlockId, 0>;
}

interface GameState {
  world: WorldData;
  chunks: WorldData["chunks"];
  loadedChunks: number;
  minedBlocks: number;
  inventory: PlaceableInventory;
  pointerLocked: boolean;
  selectedHotbarBlock: PlaceableBlockId;
  selectedBlockName: string | null;
  targetBlock: TargetBlock | null;
  miningTarget: MiningTarget | null;
  miningProgress: number;
  lastActionText: string;
  lastActionAt: number;
  setPointerLocked: (locked: boolean) => void;
  setSelectedBlock: (name: string | null) => void;
  setTargetBlock: (target: TargetBlock | null) => void;
  selectHotbarBlock: (block: PlaceableBlockId) => void;
  ensureStreamedChunks: (x: number, z: number) => void;
  getBlock: (x: number, y: number, z: number) => BlockId;
  damageBlock: (x: number, y: number, z: number, delta: number) => BlockId | null;
  resetMining: () => void;
  placeBlock: (x: number, y: number, z: number, block: PlaceableBlockId) => boolean;
}

const initialWorld = createInitialWorld();

function sameTarget(target: MiningTarget | null, x: number, y: number, z: number) {
  return target?.x === x && target?.y === y && target?.z === z;
}

export const useGameStore = create<GameState>((set, get) => ({
  world: initialWorld,
  chunks: initialWorld.chunks,
  loadedChunks: getLoadedChunkCount(initialWorld),
  minedBlocks: 0,
  inventory: {
    1: 16,
    2: 0,
    3: 0,
  },
  pointerLocked: false,
  selectedHotbarBlock: BLOCK_STONE,
  selectedBlockName: null,
  targetBlock: null,
  miningTarget: null,
  miningProgress: 0,
  lastActionText: "Pickaxe ready",
  lastActionAt: 0,
  setPointerLocked: (locked) => set({ pointerLocked: locked }),
  setSelectedBlock: (name) => set({ selectedBlockName: name }),
  setTargetBlock: (target) => set({ targetBlock: target }),
  selectHotbarBlock: (block) => set({ selectedHotbarBlock: block }),
  ensureStreamedChunks: (x, z) => {
    const world = get().world;
    ensureWorldAround(world, x, z);
    set({
      world,
      chunks: { ...world.chunks },
      loadedChunks: getLoadedChunkCount(world),
    });
  },
  getBlock: (x, y, z) => readBlock(get().world, x, y, z),
  damageBlock: (x, y, z, delta) => {
    const world = get().world;
    const block = readBlock(world, x, y, z);
    if (block === BLOCK_AIR) {
      set({ miningTarget: null, miningProgress: 0 });
      return null;
    }

    const current = get();
    const hardness = BLOCK_HARDNESS[block];
    const nextProgress =
      sameTarget(current.miningTarget, x, y, z) ? current.miningProgress + delta / hardness : delta / hardness;

    if (nextProgress < 1) {
      set({
        miningTarget: { x, y, z, blockId: block },
        miningProgress: nextProgress,
        lastActionAt: performance.now(),
      });
      return null;
    }

    setBlock(world, x, y, z, BLOCK_AIR);
    markNeighborChunksDirty(world, x, y, z);

    set((state) => ({
      world,
      chunks: { ...world.chunks },
      loadedChunks: getLoadedChunkCount(world),
      minedBlocks: state.minedBlocks + 1,
      inventory: PLACEABLE_BLOCKS.includes(block as PlaceableBlockId)
        ? {
            ...state.inventory,
            [block]: state.inventory[block as PlaceableBlockId] + 1,
          }
        : state.inventory,
      miningTarget: null,
      miningProgress: 0,
      lastActionText: `Mined ${BLOCK_LABELS[block] ?? "block"}`,
      lastActionAt: performance.now(),
    }));
    return block;
  },
  resetMining: () => {
    const current = get();
    if (current.miningTarget === null && current.miningProgress === 0) {
      return;
    }
    set({ miningTarget: null, miningProgress: 0 });
  },
  placeBlock: (x, y, z, block) => {
    const world = get().world;
    const state = get();
    if (readBlock(world, x, y, z) !== BLOCK_AIR || state.inventory[block] <= 0) {
      return false;
    }

    setBlock(world, x, y, z, block);
    markNeighborChunksDirty(world, x, y, z);

    set({
      world,
      chunks: { ...world.chunks },
      loadedChunks: getLoadedChunkCount(world),
      inventory: {
        ...state.inventory,
        [block]: state.inventory[block] - 1,
      },
      miningTarget: null,
      miningProgress: 0,
      lastActionText: `Placed ${BLOCK_LABELS[block] ?? "block"}`,
      lastActionAt: performance.now(),
      selectedBlockName: BLOCK_LABELS[block],
    });
    return true;
  },
}));
