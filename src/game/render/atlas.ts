import * as THREE from "three";
import { BLOCK_GOLD, BLOCK_IRON, BLOCK_STONE, type BlockId } from "../core/blocks";

const TILE_SIZE = 16;
const ATLAS_TILES = 4;
const ATLAS_SIZE = TILE_SIZE * ATLAS_TILES;
const INSET = 0.35;

type Tile = [number, number];

const TILE_BY_BLOCK: Record<Exclude<BlockId, 0>, Tile> = {
  [BLOCK_STONE]: [0, 0],
  [BLOCK_IRON]: [1, 0],
  [BLOCK_GOLD]: [2, 0],
};

function fillTile(
  context: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  palette: readonly string[],
  seed: number,
) {
  const baseX = tileX * TILE_SIZE;
  const baseY = tileY * TILE_SIZE;

  context.fillStyle = palette[0];
  context.fillRect(baseX, baseY, TILE_SIZE, TILE_SIZE);

  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const noise = Math.sin((x + seed) * 17.13 + (y + seed) * 11.71);
      const value = Math.abs(noise * 1_000) % 1;

      if (value > 0.78) {
        context.fillStyle = palette[2];
      } else if (value > 0.42) {
        context.fillStyle = palette[1];
      } else {
        continue;
      }

      context.fillRect(baseX + x, baseY + y, 1, 1);
    }
  }

  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(baseX, baseY, TILE_SIZE, 1);
  context.fillRect(baseX, baseY, 1, TILE_SIZE);
  context.fillStyle = "rgba(0,0,0,0.18)";
  context.fillRect(baseX, baseY + TILE_SIZE - 1, TILE_SIZE, 1);
  context.fillRect(baseX + TILE_SIZE - 1, baseY, 1, TILE_SIZE);
}

export function createVoxelAtlasTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create atlas canvas");
  }

  context.imageSmoothingEnabled = false;

  fillTile(context, 0, 0, ["#56565b", "#73727b", "#90909a"], 11);
  fillTile(context, 1, 0, ["#5c5b5f", "#7b766f", "#b77c48"], 23);
  fillTile(context, 2, 0, ["#5d584d", "#8b7b3d", "#d9bc45"], 37);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  return texture;
}

export function createCrackAtlasTexture() {
  const stages = 6;
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE * stages;
  canvas.height = TILE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create crack atlas canvas");
  }

  context.imageSmoothingEnabled = false;

  for (let stage = 0; stage < stages; stage += 1) {
    const offsetX = stage * TILE_SIZE;
    const alpha = 0.15 + stage * 0.12;
    context.clearRect(offsetX, 0, TILE_SIZE, TILE_SIZE);
    context.strokeStyle = `rgba(255,255,255,${alpha})`;
    context.lineWidth = 1;

    for (let i = 0; i < stage + 2; i += 1) {
      const startX = offsetX + ((i * 5 + stage * 3) % TILE_SIZE);
      const endX = offsetX + ((startX + 5 + i * 2) % TILE_SIZE);
      const startY = (i * 3 + 2) % TILE_SIZE;
      const endY = (startY + 5 + stage) % TILE_SIZE;
      context.beginPath();
      context.moveTo(startX + 0.5, startY + 0.5);
      context.lineTo(endX + 0.5, endY + 0.5);
      context.stroke();

      if (stage > 1) {
        context.beginPath();
        context.moveTo((startX + endX) / 2 + 0.5, (startY + endY) / 2 + 0.5);
        context.lineTo(
          offsetX + (((startX + stage * 2) % TILE_SIZE) + 0.5),
          ((endY + 4) % TILE_SIZE) + 0.5,
        );
        context.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function getBlockUvTile(block: Exclude<BlockId, 0>) {
  const [tileX, tileY] = TILE_BY_BLOCK[block];
  const u0 = (tileX * TILE_SIZE + INSET) / ATLAS_SIZE;
  const u1 = ((tileX + 1) * TILE_SIZE - INSET) / ATLAS_SIZE;
  const v0 = 1 - ((tileY + 1) * TILE_SIZE - INSET) / ATLAS_SIZE;
  const v1 = 1 - (tileY * TILE_SIZE + INSET) / ATLAS_SIZE;
  return { u0, u1, v0, v1 };
}

export function getCrackUvTile(stage: number) {
  const stages = 6;
  const clamped = Math.max(0, Math.min(stages - 1, stage));
  const width = TILE_SIZE * stages;
  const u0 = (clamped * TILE_SIZE + INSET) / width;
  const u1 = ((clamped + 1) * TILE_SIZE - INSET) / width;
  const v0 = INSET / TILE_SIZE;
  const v1 = (TILE_SIZE - INSET) / TILE_SIZE;
  return { u0, u1, v0, v1 };
}
