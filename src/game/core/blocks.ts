export const BLOCK_AIR = 0;
export const BLOCK_STONE = 1;
export const BLOCK_IRON = 2;
export const BLOCK_GOLD = 3;

export type BlockId = 0 | 1 | 2 | 3;

export const PLACEABLE_BLOCKS = [BLOCK_STONE, BLOCK_IRON, BLOCK_GOLD] as const;
export type PlaceableBlockId = (typeof PLACEABLE_BLOCKS)[number];

export const BLOCK_PALETTE: Record<BlockId, string> = {
  0: "#000000",
  1: "#5e5c61",
  2: "#8c6e4d",
  3: "#c6a642",
};

export const BLOCK_LABELS: Record<BlockId, string | null> = {
  0: null,
  1: "Stone",
  2: "Iron ore",
  3: "Gold ore",
};

export const BLOCK_HARDNESS: Record<Exclude<BlockId, 0>, number> = {
  1: 0.65,
  2: 0.95,
  3: 1.25,
};
