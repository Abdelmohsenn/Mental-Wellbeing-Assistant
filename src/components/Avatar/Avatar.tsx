import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Environment, Center } from '@react-three/drei';

const BaymaxModel = () => {
  const group = useRef<THREE.Group>(null);

  // Load model and animations
  const { scene, animations } = useGLTF('src/components/Avatar/NoHandsBaymax_Renamed.glb');
  const { actions, mixer } = useAnimations(animations, group);


  useEffect(() => {
    console.log("Available animations:", Object.keys(actions));
    if (actions['HeadAction'] && actions['BodyAction'] && actions['LeftArmAction'] && actions['RightArmAction'] && actions['RightArmAction'] && actions['EyesAction']){

      actions['HeadAction'].reset().play();
      actions['LeftArmAction'].play();
      actions['RightArmAction'].play();
      actions['HeadAction'].play();
      actions['EyesAction'].reset().play();

    } else {

    }
  }, [actions]);

  useFrame((state, delta) => {
    mixer?.update(delta);
  });

  return (
    <Center position={[0, 0, 0]}>
      <group ref={group} scale={0.7}>
        <primitive object={scene} />
      </group>
    </Center>
  );
};

const SceneSetup = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(1.5, 0, 3.5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      {/* <gridHelper args={[10, 10]} position={[0, -0.5, 0]} /> */}
      {/* <axesHelper args={[5]} /> */}
    </>
  );
};

const Avatar = () => {
  return (
    <div style={{ width: '2000px', height: '1100px' }}>
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
