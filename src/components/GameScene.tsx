import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { CaveWorld } from "./CaveWorld";

export function GameScene() {
  return (
    <Canvas
      camera={{ fov: 72, near: 0.1, far: 200, position: [0, 2.6, 2] }}
      shadows
      gl={{ antialias: false }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={["#070605"]} />
      <fog attach="fog" args={["#070605", 8, 34]} />

      <Suspense fallback={null}>
        <CaveWorld />
      </Suspense>

      <EffectComposer>
        <Bloom intensity={0.32} luminanceThreshold={0.45} mipmapBlur />
        <Noise opacity={0.08} />
        <Vignette eskil={false} offset={0.22} darkness={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
