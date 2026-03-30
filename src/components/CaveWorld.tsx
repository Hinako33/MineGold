import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import { BLOCK_AIR, BLOCK_LABELS, BLOCK_PALETTE } from "../game/core/blocks";
import { PLAYER_HEIGHT } from "../game/core/config";
import { worldToBlock } from "../game/core/coords";
import { getTorchPositions } from "../game/core/world";
import { ChunkMeshes } from "../game/render/ChunkMeshes";
import { useGameStore } from "../game/store/useGameStore";
import { useFirstPersonMovement } from "../game/systems/useFirstPersonMovement";
import { usePixelAudio } from "../game/systems/usePixelAudio";
import { DamageOverlay } from "./DamageOverlay";
import { HeldPickaxe } from "./HeldPickaxe";
import { TargetOutline } from "./TargetOutline";

interface VoxelHit {
  block: { x: number; y: number; z: number };
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

interface MemoryShard {
  id: string;
  position: [number, number, number];
  whisper: string;
}

const MEMORY_SHARDS: MemoryShard[] = [
  { id: "m1", position: [1.2, 2.4, 20], whisper: "Something followed us below." },
  { id: "m2", position: [-3.2, 3.1, 42], whisper: "Do not trust the breathing behind you." },
  { id: "m3", position: [4.4, 2.8, 69], whisper: "The mine remembers every footstep." },
  { id: "m4", position: [-2.8, 3.2, 96], whisper: "The exit opens only for the last witness." },
];

const EXIT_POSITION: [number, number, number] = [0, 2.8, 124];

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
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const leftMouseDown = useRef(false);
  const lastFearPulse = useRef(0);
  const lastStreamChunk = useRef("");
  const collectedMemoryIds = useRef<Set<string>>(new Set());

  const setPointerLocked = useGameStore((state) => state.setPointerLocked);
  const setSelectedBlock = useGameStore((state) => state.setSelectedBlock);
  const setTargetBlock = useGameStore((state) => state.setTargetBlock);
  const damageBlock = useGameStore((state) => state.damageBlock);
  const resetMining = useGameStore((state) => state.resetMining);
  const getBlock = useGameStore((state) => state.getBlock);
  const ensureStreamedChunks = useGameStore((state) => state.ensureStreamedChunks);
  const collectMemory = useGameStore((state) => state.collectMemory);
  const setFearLevel = useGameStore((state) => state.setFearLevel);
  const setGameState = useGameStore((state) => state.setGameState);
  const setLastActionText = useGameStore((state) => state.setLastActionText);
  const setObjectiveText = useGameStore((state) => state.setObjectiveText);
  const gameState = useGameStore((state) => state.gameState);
  const collectedMemories = useGameStore((state) => state.collectedMemories);
  const totalMemories = useGameStore((state) => state.totalMemories);

  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const [bursts, setBursts] = useState<BurstParticle[]>([]);
  const audio = usePixelAudio();

  useFirstPersonMovement();

  const pickVoxel = () => {
    camera.getWorldDirection(direction);
    raycaster.set(camera.position, direction.normalize());
    raycaster.far = 5;

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

      return {
        block,
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

    const onMouseDown = (event: MouseEvent) => {
      if (document.pointerLockElement === null) {
        controlsRef.current?.lock();
        return;
      }

      if (gameState !== "stalking") {
        return;
      }

      if (event.button === 0) {
        leftMouseDown.current = true;
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        leftMouseDown.current = false;
        resetMining();
      }
    };

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [gameState, resetMining]);

  useEffect(() => {
    setObjectiveText("Follow the tunnel and recover the lost memories.");
  }, [setObjectiveText]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    if (gameState !== "stalking") {
      leftMouseDown.current = false;
      resetMining();
    }

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

      if (leftMouseDown.current && gameState === "stalking") {
        audio.playMineTick();
        const mined = damageBlock(hit.block.x, hit.block.y, hit.block.z, delta * 0.8);
        if (mined !== null) {
          audio.playBreak();
          setLastActionText("The wall gives way with a dry scream.");
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

    for (const shard of MEMORY_SHARDS) {
      if (collectedMemoryIds.current.has(shard.id)) {
        continue;
      }

      tempVec.set(...shard.position);
      if (tempVec.distanceTo(camera.position) < 1.45) {
        collectedMemoryIds.current.add(shard.id);
        collectMemory();
        setLastActionText(shard.whisper);
        audio.playPlace();
      }
    }

    const progress = THREE.MathUtils.clamp(camera.position.z / EXIT_POSITION[2], 0, 1);
    const shadowZ = camera.position.z - (18 - progress * 8) + Math.sin(time * 0.8) * 1.5;
    const shadowDistance = camera.position.z - shadowZ;
    const dreadFromShadow = THREE.MathUtils.clamp(100 - shadowDistance * 6, 0, 100);
    const dreadFromTime = Math.min(22, time * 0.9);
    const finalFear = THREE.MathUtils.clamp(dreadFromShadow + dreadFromTime, 0, 100);
    setFearLevel(finalFear);

    if (gameState === "stalking" && finalFear > 82 && time - lastFearPulse.current > 3.2) {
      lastFearPulse.current = time;
      setLastActionText("It is close enough to hear you breathe.");
    }

    if (gameState === "stalking" && shadowDistance < 3.2) {
      setGameState("caught");
      setObjectiveText("The tunnel sealed behind your last step.");
      setLastActionText("The dark reached you.");
    }

    if (
      gameState === "stalking" &&
      collectedMemories >= totalMemories &&
      camera.position.distanceTo(tempVec.set(...EXIT_POSITION)) < 2.6
    ) {
      setGameState("escaped");
      setFearLevel(0);
      setObjectiveText("You escaped with the mine's memories.");
      setLastActionText("Cold air finally answers back.");
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

  const torchPositions = getTorchPositions(camera.position.z)
    .filter((_, index) => index % 2 === 0)
    .map((torch, index) => ({
      ...torch,
      dead: index % 3 === 0,
    }));

  const shadowZ = camera.position.z - (18 - Math.min(camera.position.z / EXIT_POSITION[2], 1) * 8);
  const lampFlicker = 1.4 + Math.sin(performance.now() * 0.007) * 0.2;
  const exitReady = collectedMemories >= totalMemories;

  return (
    <>
      <ambientLight intensity={0.04} color="#70544c" />
      <hemisphereLight intensity={0.08} color="#634b43" groundColor="#040404" />
      <pointLight
        position={[camera.position.x, PLAYER_HEIGHT + 0.35, camera.position.z + 0.15]}
        intensity={lampFlicker}
        distance={5.5}
        color="#f7d2b2"
      />

      <ChunkMeshes />
      <TargetOutline />
      <DamageOverlay />
      <HeldPickaxe />

      {torchPositions.map((torch, index) => (
        <group key={`${torch.x}:${torch.y}:${torch.z}:${index}`} position={[torch.x, torch.y, torch.z]}>
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.12, 0.72, 0.12]} />
            <meshStandardMaterial color="#3d2b21" />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.16, 0.14, 0.16]} />
            <meshStandardMaterial
              color={torch.dead ? "#4e392f" : "#ffb17a"}
              emissive={torch.dead ? "#000000" : "#ff7f50"}
              emissiveIntensity={torch.dead ? 0 : 1.1}
            />
          </mesh>
          {!torch.dead && (
            <pointLight position={[0, 0.34, 0]} intensity={2.8} distance={5.5} color="#ff8d57" />
          )}
        </group>
      ))}

      {MEMORY_SHARDS.filter((shard) => !collectedMemoryIds.current.has(shard.id)).map((shard) => (
        <group key={shard.id} position={shard.position}>
          <mesh>
            <octahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color="#d4f3ff" emissive="#8ddfff" emissiveIntensity={1.5} />
          </mesh>
          <pointLight intensity={2.4} distance={3.4} color="#89dfff" />
        </group>
      ))}

      <group position={[0, 2.2, shadowZ]}>
        <mesh scale={[1.4, 2.8, 1]}>
          <sphereGeometry args={[0.8, 18, 18]} />
          <meshStandardMaterial color="#100607" emissive="#2f0810" emissiveIntensity={0.5} transparent opacity={0.72} />
        </mesh>
        <pointLight position={[0, 0.3, 0.3]} intensity={1.2} distance={4.2} color="#7a0e16" />
      </group>

      <group position={EXIT_POSITION}>
        <mesh>
          <torusGeometry args={[exitReady ? 1.35 : 1.05, 0.12, 16, 60]} />
          <meshStandardMaterial
            color={exitReady ? "#bbf6ff" : "#422e35"}
            emissive={exitReady ? "#8cdcff" : "#13080c"}
            emissiveIntensity={exitReady ? 1.9 : 0.2}
          />
        </mesh>
        {exitReady && <pointLight intensity={3.6} distance={6} color="#9ce7ff" />}
      </group>

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
