import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PLAYER_HEIGHT, MOVE_SPEED } from "../core/config";
import { useGameStore } from "../store/useGameStore";
import { isBodyBlocked } from "./collision";

type KeyState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
};

const keyMap: Record<string, keyof KeyState> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

export function useFirstPersonMovement() {
  const getBlock = useGameStore((state) => state.getBlock);
  const camera = useThree((state) => state.camera);
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const next = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onKey = (pressed: boolean) => (event: KeyboardEvent) => {
      const mapped = keyMap[event.code];
      if (!mapped) {
        return;
      }
      keys.current[mapped] = pressed;
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
    camera.position.set(0, PLAYER_HEIGHT, 2);
  }, [camera]);

  useFrame((_, delta) => {
    forward.set(0, 0, Number(keys.current.backward) - Number(keys.current.forward));
    right.set(Number(keys.current.right) - Number(keys.current.left), 0, 0);

    if (forward.lengthSq() === 0 && right.lengthSq() === 0) {
      return;
    }

    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    next.copy(camera.position);
    next.addScaledVector(forward, MOVE_SPEED * delta);
    next.addScaledVector(right, MOVE_SPEED * delta);
    next.y = PLAYER_HEIGHT;

    if (!isBodyBlocked(next.x, next.z, getBlock)) {
      camera.position.copy(next);
      return;
    }

    const slideX = new THREE.Vector3(next.x, PLAYER_HEIGHT, camera.position.z);
    if (!isBodyBlocked(slideX.x, slideX.z, getBlock)) {
      camera.position.copy(slideX);
      return;
    }

    const slideZ = new THREE.Vector3(camera.position.x, PLAYER_HEIGHT, next.z);
    if (!isBodyBlocked(slideZ.x, slideZ.z, getBlock)) {
      camera.position.copy(slideZ);
    }
  });
}
