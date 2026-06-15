import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Torche du joueur (cf. GDD §4) : lumière ponctuelle qui suit la caméra, avec un
// léger vacillement. Montée uniquement dans les donjons.
export function Torch() {
  const light = useRef<THREE.PointLight>(null);
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (!light.current) return;
    light.current.position.copy(camera.position);
    light.current.intensity = 5.8 + Math.sin(clock.elapsedTime * 11) * 0.3;
  });

  return <pointLight ref={light} color={0xffc07a} intensity={6} distance={30} decay={1.3} />;
}
