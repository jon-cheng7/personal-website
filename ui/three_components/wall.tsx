import React, { useRef } from 'react';
import { Mesh } from 'three';
import { useBox } from '@react-three/cannon';
import {
  Shape,
  ExtrudeGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import * as THREE from 'three';

// Create a rounded rectangle shape function
function createRoundedRectShape(width: number, height: number, radius: number) {
  const shape = new Shape();
  const x = -width / 2; // Centered at origin
  const y = -height / 2; // Centered at origin

  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);

  return shape;
}

interface BoxProps {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}

const Wall: React.FC<BoxProps> = ({ args, position, rotation, color }) => {
  const meshRef = useRef<Mesh | null>(null);

  const [ref] = useBox(() => ({
    type: 'Static',
    args,
    position,
    rotation,
    restitution: 1,
  }));

  const width = args[0];
  const height = args[1];
  const radius = 5; // Adjust this value to your preference

  const shape = createRoundedRectShape(width, height, radius);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.1, // Small value just to give it some thickness
    bevelEnabled: false,
  });

  return (
    <>
      <mesh ref={ref as any} position={position} rotation={rotation}>
        <primitive attach="geometry" object={geometry} />
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0}
        />
      </mesh>
      {/* Adding the outline */}
      <lineSegments position={position} rotation={rotation}>
        <edgesGeometry attach="geometry" args={[geometry]} />
        <lineBasicMaterial attach="material" color="black" linewidth={2} />
      </lineSegments>
    </>
  );
};

export default Wall;
