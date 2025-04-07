import React, { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Center } from '@react-three/drei';

const BaymaxModel = () => {
  const { scene } = useGLTF('src/components/Avatar/cute_Baymax_separate.glb');
  const modelRef = useRef<THREE.Group>(null);

  // This helps us see the actual dimensions and position of the model
  useEffect(() => {
    if (modelRef.current) {
      console.log('Model loaded and positioned');
    }
  }, [scene]);

  return (
    // Using Center component to automatically center the model on origin
    <Center position={[0, 0, 0]}>
      <group ref={modelRef} scale={0.7}>
        <primitive object={scene} />
      </group>
    </Center>
  );
};

// A helper component that shows grid and centers the camera on the scene
const SceneSetup = () => {
  const { camera } = useThree();
  
  useEffect(() => {
    // Reset camera position to look at the center
    camera.position.set(1.5, 0, 3.5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <gridHelper args={[10, 10]} position={[0, -0.5, 0]} />
      <axesHelper args={[5]} /> {/* X = red, Y = green, Z = blue */}
    </>
  );
};

const Avatar = () => {
  return (
    <div style={{ width: '1500px', height: '1200px', background: 'transparent' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={1} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        
        <Suspense fallback={null}>
          <SceneSetup />
          <BaymaxModel />
          <Environment preset="city" />
        </Suspense>
        
        <OrbitControls 
          makeDefault 
          target={[0, 0, 0]} 
          enableDamping={true}
          dampingFactor={0.5}
        />
      </Canvas>
    </div>
  );
};

export default Avatar;