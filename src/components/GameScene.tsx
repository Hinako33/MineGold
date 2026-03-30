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
      <color attach="background" args={["#020203"]} />
      <fog attach="fog" args={["#020203", 4, 20]} />

      <Suspense fallback={null}>
        <CaveWorld />
      </Suspense>

      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.28} mipmapBlur />
        <Noise opacity={0.16} />
        <Vignette eskil={false} offset={0.12} darkness={0.96} />
      </EffectComposer>
    </Canvas>
  );
}
