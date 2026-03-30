import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PLAYER_HEIGHT, MOVE_SPEED } from "../core/config";
import { useGameStore } from "../store/useGameStore";
import { isBodyBlockedAt, isStandingOnGround } from "./collision";

type KeyState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
};

const GRAVITY = 24;
const JUMP_HEIGHT = 1;
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
const START_POSITION = new THREE.Vector3(0, PLAYER_HEIGHT, 2);
const MAX_GROUND_SNAP = 0.18;
const FALL_RESET_Y = -2;

const keyMap: Record<string, keyof KeyState> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
};

export function useFirstPersonMovement() {
  const getBlock = useGameStore((state) => state.getBlock);
  const camera = useThree((state) => state.camera);
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const moveDelta = useMemo(() => new THREE.Vector3(), []);
  const candidate = useMemo(() => new THREE.Vector3(), []);
  const velocityY = useRef(0);
  const jumpQueued = useRef(false);

  useEffect(() => {
    const onKey = (pressed: boolean) => (event: KeyboardEvent) => {
      const mapped = keyMap[event.code];
      if (!mapped) {
        return;
      }
      keys.current[mapped] = pressed;
      if (mapped === "jump" && pressed) {
        jumpQueued.current = true;
      }
    };

    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    camera.position.copy(START_POSITION);
  }, [camera]);

  useFrame((_, delta) => {
    const grounded = isStandingOnGround(camera.position.x, camera.position.y, camera.position.z, getBlock);
    if (grounded && velocityY.current < 0) {
      velocityY.current = 0;
    }

    if (jumpQueued.current && grounded) {
      velocityY.current = JUMP_SPEED;
    }
    jumpQueued.current = false;

    forward.set(0, 0, Number(keys.current.backward) - Number(keys.current.forward));
    right.set(Number(keys.current.right) - Number(keys.current.left), 0, 0);

    moveDelta.set(0, 0, 0);
    if (forward.lengthSq() > 0 || right.lengthSq() > 0) {
      forward.applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();

      right.applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();

      moveDelta.addScaledVector(forward, MOVE_SPEED * delta);
      moveDelta.addScaledVector(right, MOVE_SPEED * delta);
    }

    if (moveDelta.lengthSq() > 0) {
      candidate.set(
        camera.position.x + moveDelta.x,
        camera.position.y,
        camera.position.z + moveDelta.z,
      );
      if (!isBodyBlockedAt(candidate.x, candidate.y, candidate.z, getBlock)) {
        camera.position.x = candidate.x;
        camera.position.z = candidate.z;
      } else {
        candidate.set(camera.position.x + moveDelta.x, camera.position.y, camera.position.z);
        if (!isBodyBlockedAt(candidate.x, candidate.y, candidate.z, getBlock)) {
          camera.position.x = candidate.x;
        }

        candidate.set(camera.position.x, camera.position.y, camera.position.z + moveDelta.z);
        if (!isBodyBlockedAt(candidate.x, candidate.y, candidate.z, getBlock)) {
          camera.position.z = candidate.z;
        }
      }
    }

    velocityY.current -= GRAVITY * delta;
    const nextY = camera.position.y + velocityY.current * delta;
    candidate.set(camera.position.x, nextY, camera.position.z);

    if (!isBodyBlockedAt(candidate.x, candidate.y, candidate.z, getBlock)) {
      camera.position.y = nextY;
    } else if (velocityY.current > 0) {
      velocityY.current = 0;
    } else {
      const snappedY = Math.floor(camera.position.y - PLAYER_HEIGHT + 0.5) + PLAYER_HEIGHT;
      const snapDistance = snappedY - camera.position.y;
      if (
        snapDistance >= 0 &&
        snapDistance <= MAX_GROUND_SNAP &&
        !isBodyBlockedAt(camera.position.x, snappedY, camera.position.z, getBlock)
      ) {
        camera.position.y = snappedY;
      }
      velocityY.current = 0;
    }

    const afterMoveGrounded = isStandingOnGround(camera.position.x, camera.position.y, camera.position.z, getBlock);
    if (afterMoveGrounded && velocityY.current < 0) {
      const snappedY = Math.floor(camera.position.y - PLAYER_HEIGHT + 0.5) + PLAYER_HEIGHT;
      const snapDistance = snappedY - camera.position.y;
      if (
        snapDistance >= 0 &&
        snapDistance <= MAX_GROUND_SNAP &&
        !isBodyBlockedAt(camera.position.x, snappedY, camera.position.z, getBlock)
      ) {
        camera.position.y = snappedY;
      }
      velocityY.current = 0;
    }

    if (camera.position.y < FALL_RESET_Y) {
      camera.position.copy(START_POSITION);
      velocityY.current = 0;
    }
  });
}
