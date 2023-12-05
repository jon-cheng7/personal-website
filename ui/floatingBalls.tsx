import React, { useState, useEffect, useRef } from 'react';
import { Debug, Physics, useSphere } from '@react-three/cannon';
import Wall from './three_components/wall';
import Sphere from './three_components/sphere';
import { Canvas } from '@react-three/fiber';
import CursorSphere from './three_components/cursorSphere';

const FloatingBalls: React.FC = () => {
  const MAX_SPHERES = 18;
  const [spheres, setSpheres] = useState<JSX.Element[]>([]);
  const TECH = [
    'C++',
    'TYPESCRIPT',
    'PYTHON',
    'JS',
    'REACT',
    'JAVA',
    'NEXTJS',
    'HTML',
    'CSS',
    'SQL',
    'NODE',
    'MONGODB',
    'GIT',
    'EXPRESS',
    'GRAPHQL',
    'THREEJS',
    'BOOTSTRAP',
    'SWIFT',
  ];

  useEffect(() => {
    if (spheres.length >= MAX_SPHERES) {
      return;
    }

    const timer = setInterval(() => {
      if (spheres.length < MAX_SPHERES) {
        const label = TECH[spheres.length];
        const newSphere = (
          <Sphere
            key={spheres.length}
            args={[10, 32, 32]}
            position={[Math.random() * 30, Math.random() * 30, 0]}
            color="black"
            text={label}
          />
        );
        setSpheres((prevSpheres) => {
          if (prevSpheres.length < MAX_SPHERES) {
            const label = TECH[prevSpheres.length];
            const newSphere = (
              <Sphere
                key={prevSpheres.length}
                args={[10, 32, 32]}
                position={[Math.random() * 30, Math.random() * 30, 0]}
                color="black"
                text={label}
              />
            );
            return [...prevSpheres, newSphere];
          }
          return prevSpheres;
        });
      } else {
        clearInterval(timer); // If we've reached the maximum, clear the interval
      }
    }, 300);

    return () => clearInterval(timer);
  }, [spheres]);

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 20], zoom: 7 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      <Physics gravity={[0, -10, 0]}>
        <Debug />
        <Wall
          args={[200, 100, 50]}
          position={[0, 0, 75]}
          rotation={[0, 0, 0]}
          color="white"
        />{' '}
        // Front
        <Wall
          args={[200, 100, 50]}
          position={[0, 0, -75]}
          rotation={[0, Math.PI, 0]}
          color="white"
        />{' '}
        // Back
        <Wall
          args={[100, 100, 50]}
          position={[125, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          color="white"
        />{' '}
        // Right
        <Wall
          args={[100, 100, 50]}
          position={[-125, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          color="white"
        />{' '}
        // Left
        <Wall
          args={[200, 100, 50]}
          position={[0, 75, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          color="white"
        />{' '}
        // Top
        <Wall
          args={[200, 100, 50]}
          position={[0, -75, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          color="white"
        />{' '}
        // Bottom
        <CursorSphere args={[15, 80, 80]} position={[0, 0, 0]} />
        {spheres.map((sphere) => sphere)}
      </Physics>
    </Canvas>
  );
};

export default FloatingBalls;
