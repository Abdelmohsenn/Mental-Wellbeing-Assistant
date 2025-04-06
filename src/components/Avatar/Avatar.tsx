// src/Avatar/Avatar.tsx

import React, { Suspense } from "react";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const BaymaxModel = () => {
  const obj = useLoader(OBJLoader, "/Avatar/cute_baymax_separate_animated.obj"); // Ensure path is correct
  return <primitive object={obj} scale={100} />;
};

const BaymaxAvatar = () => {
  return (
    <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 2, 2]} />
      <Suspense fallback={<div>Loading...</div>}>
        <BaymaxModel />
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
};

export default BaymaxAvatar;
