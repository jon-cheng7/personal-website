import RoundedBoxGeometry from 'roundedBox.js';

export default class Box {
  constructor() {
    this.size = 0.45;
    this.geom = new RoundedBoxGeometry(
      this.size,
      this.size,
      this.size,
      0.02,
      0.2,
    );
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;
  }
}
