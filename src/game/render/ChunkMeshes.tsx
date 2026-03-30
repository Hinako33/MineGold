import { useMemo } from "react";
import type * as THREE from "three";
import { buildChunkGeometry } from "./buildChunkGeometry";
import { useGameStore } from "../store/useGameStore";
import { createVoxelAtlasTexture } from "./atlas";

function ChunkMesh({ chunkKey, atlas }: { chunkKey: string; atlas: THREE.Texture }) {
  const world = useGameStore((state) => state.world);
  const chunk = useGameStore((state) => state.chunks[chunkKey]);
  const geometry = useMemo<THREE.BufferGeometry | null>(() => {
    if (!chunk) {
      return null;
    }
    return buildChunkGeometry(world, chunk);
  }, [chunk, chunk?.dirty, world]);

  if (!chunk || geometry === null) {
    return null;
  }

  return (
    <mesh geometry={geometry} castShadow={false} receiveShadow userData={{ voxelSolid: true }}>
      <meshStandardMaterial map={atlas} roughness={1} metalness={0.02} />
    </mesh>
  );
}

export function ChunkMeshes() {
  const chunks = useGameStore((state) => state.chunks);
  const chunkKeys = useMemo(() => Object.keys(chunks), [chunks]);
  const atlas = useMemo(() => createVoxelAtlasTexture(), []);

  return (
    <group>
      {chunkKeys.map((chunkKey) => (
        <ChunkMesh key={chunkKey} chunkKey={chunkKey} atlas={atlas} />
      ))}
    </group>
  );
}
