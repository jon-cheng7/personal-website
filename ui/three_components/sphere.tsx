import React, { useRef, useState } from 'react';
import { Mesh, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Text, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { useDrag } from 'react-use-gesture';

interface SphereProps {
  args: [number, number, number];
  position: [number, number, number];
  color: string;
  text?: string;
}

const Sphere: React.FC<SphereProps> = ({ args, position, color, text }) => {
  const { size, viewport } = useThree();
  const aspect = size.width / viewport.width;
  const maxVelocity = 5;

  const [ref, api] = useSphere(() => ({
    mass: 1,
    args: [args[0]],
    position,
    restitution: 0,
    linearFactor: [1, 1, 0],
    friction: 0.1,
  }));

  // const bind = useDrag(({ offset: [x, y], down, first }) => {
  //   if (first) {
  //     // Disable gravity and set velocities to zero when dragging begins
  //     api.mass.set(0);
  //     api.velocity.set(0, 0, 0);
  //     api.angularVelocity.set(0, 0, 0);
  //   }

  //   // Adjust position based on drag offset scaled by aspect ratio
  //   api.position.set(x / aspect, -y / aspect, 0);

  //   if (!down) {
  //     // Re-enable gravity when dragging stops
  //     api.mass.set(1);
  //   }
  // }, { pointerEvents: true });

  // const bind = useDrag(({ offset: [x, y] }) => {
  //   api.position.set(x / aspect, -y / aspect, 0);
  // });

  return (
    <>
      <mesh ref={ref as any}>
        {/* This part will render the outline */}
        <lineSegments>
          <edgesGeometry
            attach="geometry"
            args={[new THREE.SphereGeometry(...args)]}
          />
          <lineBasicMaterial attach="material" color={color} />
        </lineSegments>
        <Text
          position={[0, 0, args[0] + 0.1]}
          fontSize={3}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {text}
        </Text>
      </mesh>
    </>
  );
};

export default Sphere;
