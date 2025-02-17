import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { CustomToonMaterial } from './CustomToonMaterial';
import { GROUND_LAYER } from './constants';

export class Ground extends THREE.Mesh {
	constructor() {
		const noise2D = createNoise2D();

		const groundGeometry = new THREE.PlaneGeometry(10, 10, 100, 100);
		const groundMaterial = new CustomToonMaterial(new THREE.Color(0xffffff));

		super(groundGeometry, groundMaterial);

		this.layers.set(GROUND_LAYER);
		// this.rotation.x = THREE.MathUtils.degToRad(-90);
		this.geometry.rotateX(THREE.MathUtils.degToRad(-90));
		this.receiveShadow = true;

		const equation = (x: number, z: number) => {
			return -Math.pow(Math.E, -(Math.pow(x, 2) / 15 + Math.pow(z, 2) / 15));
		};
		let peak = 3;
		let smoothing = 1;
		let vertices = this.geometry.attributes.position.array;
		for (let i = 0; i <= vertices.length; i += 3) {
			// vertices[i + 1] = peak * noise2D(vertices[i] / smoothing, vertices[i + 2] / smoothing);
			vertices[i + 1] = peak * equation(vertices[i] / smoothing, vertices[i + 2] / smoothing);
		}
		this.geometry.computeVertexNormals();
	}
}
