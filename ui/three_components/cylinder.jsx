const radians = (degrees) => {
  return (degrees * Math.PI) / 180;
};

export default class Cylinder {
  constructor() {
    this.geom = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 64);
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = radians(-180);
  }
}
