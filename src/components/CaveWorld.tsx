import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import { BLOCK_AIR, BLOCK_LABELS, BLOCK_PALETTE, PLACEABLE_BLOCKS } from "../game/core/blocks";
import { PLAYER_HEIGHT } from "../game/core/config";
import { worldToBlock } from "../game/core/coords";
import { ChunkMeshes } from "../game/render/ChunkMeshes";
import { useGameStore } from "../game/store/useGameStore";
import { useFirstPersonMovement } from "../game/systems/useFirstPersonMovement";
import { DamageOverlay } from "./DamageOverlay";
import { HeldPickaxe } from "./HeldPickaxe";
import { TargetOutline } from "./TargetOutline";

interface VoxelHit {
  block: { x: number; y: number; z: number };
  place: { x: number; y: number; z: number };
  blockId: number;
  point: THREE.Vector3;
}

interface BurstParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  createdAt: number;
}

function createBurst(origin: THREE.Vector3, color: string) {
  return Array.from({ length: 8 }, (_, index): BurstParticle => {
    const angle = (Math.PI * 2 * index) / 8;
    return {
      id: performance.now() + index,
      position: origin.clone(),
      velocity: new THREE.Vector3(Math.cos(angle) * 1.6, 1.2 + (index % 3) * 0.2, Math.sin(angle) * 1.6),
      color,
      createdAt: performance.now(),
    };
  });
}

export function CaveWorld() {
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const fallbackNormal = useMemo(() => new THREE.Vector3(), []);
  const leftMouseDown = useRef(false);
  const setPointerLocked = useGameStore((state) => state.setPointerLocked);
  const setSelectedBlock = useGameStore((state) => state.setSelectedBlock);
  const setTargetBlock = useGameStore((state) => state.setTargetBlock);
  const selectHotbarBlock = useGameStore((state) => state.selectHotbarBlock);
  const selectedHotbarBlock = useGameStore((state) => state.selectedHotbarBlock);
  const damageBlock = useGameStore((state) => state.damageBlock);
  const resetMining = useGameStore((state) => state.resetMining);
  const placeBlock = useGameStore((state) => state.placeBlock);
  const getBlock = useGameStore((state) => state.getBlock);
  const ensureStreamedChunks = useGameStore((state) => state.ensureStreamedChunks);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const [bursts, setBursts] = useState<BurstParticle[]>([]);
  const lastStreamChunk = useRef<string>("");

  useFirstPersonMovement();

  const pickVoxel = () => {
    camera.getWorldDirection(direction);
    raycaster.set(camera.position, direction.normalize());
    raycaster.far = 6;

    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      if (!hit.object.userData.voxelSolid) {
        continue;
      }

      const faceNormal = hit.face?.normal ?? fallbackNormal.set(0, 0, 0);
      const block = worldToBlock(hit.point.clone().addScaledVector(faceNormal, -0.01));
      const blockId = getBlock(block.x, block.y, block.z);
      if (blockId === BLOCK_AIR) {
        continue;
      }

      const place = worldToBlock(hit.point.clone().addScaledVector(faceNormal, 0.01));
      return {
        block,
        place,
        blockId,
        point: hit.point.clone(),
      } satisfies VoxelHit;
    }

    return null;
  };

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement !== null;
      setPointerLocked(locked);
      if (!locked) {
        leftMouseDown.current = false;
        resetMining();
      }
    };

    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    };
  }, [resetMining, setPointerLocked]);

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Digit1") {
        selectHotbarBlock(PLACEABLE_BLOCKS[0]);
      } else if (event.code === "Digit2") {
        selectHotbarBlock(PLACEABLE_BLOCKS[1]);
      } else if (event.code === "Digit3") {
        selectHotbarBlock(PLACEABLE_BLOCKS[2]);
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement === null) {
        controlsRef.current?.lock();
        return;
      }

      if (event.button === 0) {
        leftMouseDown.current = true;
        return;
      }

      if (event.button !== 2) {
        return;
      }

      const hit = pickVoxel();
      if (!hit) {
        return;
      }

      const distanceToPlayer =
        Math.abs(hit.place.x + 0.5 - camera.position.x) < 0.7 &&
        Math.abs(hit.place.y + 0.5 - camera.position.y) < 1.6 &&
        Math.abs(hit.place.z + 0.5 - camera.position.z) < 0.7;

      if (distanceToPlayer) {
        return;
      }

      const placed = placeBlock(hit.place.x, hit.place.y, hit.place.z, selectedHotbarBlock);
      if (placed) {
        setBursts((current) => [...current, ...createBurst(hit.point, BLOCK_PALETTE[selectedHotbarBlock])]);
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        leftMouseDown.current = false;
        resetMining();
      }
    };

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [camera.position, placeBlock, resetMining, selectHotbarBlock, selectedHotbarBlock]);

  useFrame((_, delta) => {
    const hit = pickVoxel();
    if (!hit) {
      setSelectedBlock(null);
      setTargetBlock(null);
      if (leftMouseDown.current) {
        resetMining();
      }
    } else {
      setSelectedBlock(BLOCK_LABELS[hit.blockId] ?? null);
      setTargetBlock(hit.block);

      if (leftMouseDown.current) {
        const mined = damageBlock(hit.block.x, hit.block.y, hit.block.z, delta);
        if (mined !== null) {
          setBursts((current) => [...current, ...createBurst(hit.point, BLOCK_PALETTE[mined])]);
        }
      }
    }

    const chunkX = Math.floor(camera.position.x / 16);
    const chunkZ = Math.floor(camera.position.z / 16);
    const streamKey = `${chunkX},${chunkZ}`;
    if (lastStreamChunk.current !== streamKey) {
      lastStreamChunk.current = streamKey;
      ensureStreamedChunks(camera.position.x, camera.position.z);
    }

    setBursts((current) =>
      current
        .map((particle) => {
          const age = (performance.now() - particle.createdAt) / 1000;
          if (age > 0.35) {
            return null;
          }

          particle.position.addScaledVector(particle.velocity, delta);
          particle.velocity.y -= 2.8 * delta;
          return particle;
        })
        .filter((particle): particle is BurstParticle => particle !== null),
    );
  });

  return (
    <>
      <ambientLight intensity={0.25} color="#d6b48f" />
      <hemisphereLight intensity={0.45} color="#f7d8b3" groundColor="#18110f" />
      <pointLight position={[camera.position.x, PLAYER_HEIGHT + 0.6, camera.position.z + 0.2]} intensity={4} distance={8} color="#ffd2a1" />

      <ChunkMeshes />
      <TargetOutline />
      <DamageOverlay />
      <HeldPickaxe />

      {bursts.map((particle) => (
        <mesh key={particle.id} position={particle.position}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial color={particle.color} emissive={particle.color} emissiveIntensity={0.35} />
        </mesh>
      ))}

      <PointerLockControls ref={controlsRef} />
    </>
  );
}
