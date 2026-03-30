import { useGameStore } from "../game/store/useGameStore";

export function TargetOutline() {
  const target = useGameStore((state) => state.targetBlock);

  if (!target) {
    return null;
  }

  return (
    <mesh position={[target.x + 0.5, target.y + 0.5, target.z + 0.5]}>
      <boxGeometry args={[1.03, 1.03, 1.03]} />
      <meshBasicMaterial color="#fff1c7" wireframe transparent opacity={0.95} />
    </mesh>
  );
}
