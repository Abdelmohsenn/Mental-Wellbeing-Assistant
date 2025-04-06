// components/Avatar/Avatar.tsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';

// Create a separate model component to handle the GLTF loading
const BaymaxModel = () => {
  try{
  // Make sure path is correct relative to public folder
  const { scene } = useGLTF('src/components/Avatar/cute_Baymax_separate.glb');
  return <primitive object={scene} scale={2} position={[0, -10, 0]} />; 
  } catch (error) {
    console.error("Error loading 3D model:", error);
    return null;
  }
};

const Avatar = () => {
  return (
    <div style={{ width: '1800px', height: '1800px', background: 'transparent' }}>
      <Canvas camera={{ position: [0, 10, 0], fov: 50 }}>
   
          <BaymaxModel />
          <Environment preset="city" />
        
        {/* Add controls to orbit around model */}
        <OrbitControls enableZoom={true} enablePan={true} />
      </Canvas>
    </div>
  );
};

export default Avatar;