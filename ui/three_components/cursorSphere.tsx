import { useEffect } from 'react';
import { useSphere } from '@react-three/cannon';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Vector2 } from 'three';
import * as THREE from 'three';

interface CursorSphereProps {
  args: [number, number, number];
  position: [number, number, number];
}

const CursorSphere: React.FC<CursorSphereProps> = ({ args, position }) => {
  const [ref, api] = useSphere(() => ({
    args: [args[0]],
    position,
    mass: 0,
    restitution: 0.1,
    linearDamping: 1,
    angularDamping: 1,
    linearVelocity: [0, 0, 0],
    angularVelocity: [0, 0, 0],
    visible: false,
  }));

  const { camera, gl } = useThree();

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const mouse = new Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // A plane facing the z-axis

    const onMouseMove = (event: MouseEvent) => {
      // Convert mouse position to normalized device coordinates (-1 to +1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Find the point where the ray intersects the plane
      const intersectionPoint = new Vector3();
      raycaster.ray.intersectPlane(plane, intersectionPoint);

      api.position.set(intersectionPoint.x, intersectionPoint.y, 0);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    };

    gl.domElement.addEventListener('mousemove', onMouseMove);

    return () => {
      gl.domElement.removeEventListener('mousemove', onMouseMove);
    };
  }, [camera, api, gl.domElement]);

  return (
    <mesh ref={ref as any}>
      <lineSegments>
        {/* <edgesGeometry attach="geometry" args={[new THREE.SphereGeometry(...args)]} />
            <lineBasicMaterial attach="material" color={'red'} /> */}
      </lineSegments>
    </mesh>
  );
};

export default CursorSphere;
