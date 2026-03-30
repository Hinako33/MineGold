import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../game/store/useGameStore";

export function HeldPickaxe() {
  const camera = useThree((state) => state.camera);
  const root = useMemo(() => new THREE.Group(), []);
  const groupRef = useRef<THREE.Group>(null);
  const lastActionAt = useGameStore((state) => state.lastActionAt);

  useEffect(() => {
    root.position.set(0, 0, 0);
    return () => {
      root.clear();
    };
  }, [root]);

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    const elapsed = Math.max(0, performance.now() - lastActionAt);
    const normalized = elapsed < 240 ? elapsed / 240 : 1;
    const swing = Math.sin((1 - normalized) * Math.PI);

    groupRef.current.position.set(0.68, -0.72 + swing * 0.06, -1.12);
    groupRef.current.rotation.set(-0.5 + swing * 0.1, -0.38 - swing * 0.3, -0.18 - swing * 0.9);
  });

  return createPortal(
    <group ref={groupRef}>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.12, 0.82, 0.12]} />
        <meshStandardMaterial color="#7c4f2a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.16, 0.28, 0]}>
        <boxGeometry args={[0.42, 0.18, 0.14]} />
        <meshStandardMaterial color="#8f939c" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0.04, 0.18, 0]}>
        <boxGeometry args={[0.1, 0.38, 0.14]} />
        <meshStandardMaterial color="#a3a8b0" roughness={0.5} metalness={0.32} />
      </mesh>
    </group>,
    camera,
  );
}
