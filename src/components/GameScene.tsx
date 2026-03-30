import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { CaveWorld } from "./CaveWorld";

export function GameScene() {
  return (
    <Canvas
      camera={{ fov: 72, near: 0.1, far: 200, position: [0, 2.6, 2] }}
      shadows
      gl={{ antialias: false }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={["#090909"]} />
      <fog attach="fog" args={["#090909", 12, 48]} />

      <Suspense fallback={null}>
        <CaveWorld />
      </Suspense>

      <EffectComposer>
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.22} darkness={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
