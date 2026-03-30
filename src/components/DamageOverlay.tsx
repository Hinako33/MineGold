import { useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "../game/store/useGameStore";
import { createCrackAtlasTexture, getCrackUvTile } from "../game/render/atlas";

export function DamageOverlay() {
  const miningTarget = useGameStore((state) => state.miningTarget);
  const miningProgress = useGameStore((state) => state.miningProgress);
  const texture = useMemo(() => createCrackAtlasTexture(), []);
  const geometry = useMemo(() => {
    const { u0, u1, v0, v1 } = getCrackUvTile(Math.floor(miningProgress * 5.99));
    const box = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const uv = box.getAttribute("uv");

    for (let index = 0; index < uv.count; index += 4) {
      uv.setXY(index, u0, v0);
      uv.setXY(index + 1, u1, v0);
      uv.setXY(index + 2, u0, v1);
      uv.setXY(index + 3, u1, v1);
    }

    uv.needsUpdate = true;
    return box;
  }, [miningProgress]);

  if (!miningTarget || miningProgress <= 0) {
    return null;
  }

  return (
    <mesh position={[miningTarget.x + 0.5, miningTarget.y + 0.5, miningTarget.z + 0.5]} geometry={geometry}>
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.9}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}
