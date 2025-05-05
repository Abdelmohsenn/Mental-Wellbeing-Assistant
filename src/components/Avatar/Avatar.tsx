import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, Environment, Center } from '@react-three/drei';

const BaymaxModel = ({ mode = [1], speed = 1 }: { mode?: number []; speed?: number }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('src/components/Avatar/FullBaymax.glb');
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    Object.values(actions).forEach(action => {
      action.stop(); // Clear previous actions
    });

    // Define animation sets for different modes
    const animationSets: Record<number, string[]> = {
      1: ['Breathing'], // breathing (IDLE)
      2: ['Nodding', 'Breathing', 'Breathing'], // Talking (When Voice Received)
      3: ['LeftArmAction', 'RightArmAction'], // waving without head
      4: ['EyesAction', 'HeadAction'], // tilt
      5: ['HeadAction', 'LeftArmAction','RightArmAction', 'HeadAction', 'EyesAction'] // Waving with head
    };


    const selectedAnimations = mode.flatMap(m => animationSets[m] || [])
    const Speed = speed;

    selectedAnimations.forEach(name => {
      const action = actions[name];
      if (action) {
        action.reset().setEffectiveTimeScale(Speed).play();
      } else {
        console.warn(`Animation "${name}" not found for mode ${mode}`);
      }
    });
  }, [actions, mode]);

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
    camera.position.set(1.5, -0.3, 3.5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      {/* <gridHelper args={[10, 10]} position={[0, -0.5, 0]} /> */}
      {/* <axesHelper args={[5]} /> */}
    </>
  );
};

const Avatar = ({ mode = [1], speed = 0.35 }: { mode?: number[]; speed?: number }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={1} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />

        <Suspense fallback={null}>
          <SceneSetup />
          <BaymaxModel mode={mode} speed = {speed} /> {/* <- Fixed here */}
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
