import { PLAYER_HEIGHT, PLAYER_RADIUS } from "../core/config";

type BlockReader = (x: number, y: number, z: number) => number;

const SAMPLE_HEIGHTS = [1.05, 1.95, 2.75] as const;

export function isBodyBlocked(x: number, z: number, getBlock: BlockReader) {
  const corners = [
    [x + PLAYER_RADIUS, z + PLAYER_RADIUS],
    [x - PLAYER_RADIUS, z + PLAYER_RADIUS],
    [x + PLAYER_RADIUS, z - PLAYER_RADIUS],
    [x - PLAYER_RADIUS, z - PLAYER_RADIUS],
  ] as const;

  return corners.some(([sampleX, sampleZ]) =>
    SAMPLE_HEIGHTS.some((sampleY) => getBlock(Math.floor(sampleX), Math.floor(sampleY), Math.floor(sampleZ)) !== 0),
  );
}

export function intersectsPlayerSpace(
  placeX: number,
  placeY: number,
  placeZ: number,
  playerX: number,
  playerY: number,
  playerZ: number,
) {
  return (
    Math.abs(placeX + 0.5 - playerX) < PLAYER_RADIUS + 0.42 &&
    Math.abs(placeY + 0.5 - playerY) < PLAYER_HEIGHT * 0.55 &&
    Math.abs(placeZ + 0.5 - playerZ) < PLAYER_RADIUS + 0.42
  );
}
