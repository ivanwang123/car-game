import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { CustomToonMaterial } from './CustomToonMaterial';
import { GROUND_LAYER } from './constants';

export type GroundOptions = {
	width: number;
	height: number;
	segments: number;
	color: THREE.Color;
};

export class Ground extends THREE.Mesh<
	THREE.PlaneGeometry,
	THREE.ShaderMaterial,
	THREE.Object3DEventMap
> {
	constructor(options: GroundOptions) {
		const noise2D = createNoise2D();

		const groundGeometry = new THREE.PlaneGeometry(
			options.width,
			options.height,
			options.width * options.segments,
			options.height * options.segments
		);
		const groundMaterial = new CustomToonMaterial({ color: options.color });

		super(groundGeometry, groundMaterial);

		this.layers.set(GROUND_LAYER);
		this.geometry.rotateX(THREE.MathUtils.degToRad(-90));
		this.receiveShadow = true;

		const equation = (x: number, z: number) => {
			return -Math.pow(Math.E, -(Math.pow(x, 2) / 18 + Math.pow(z, 2) / 18));
		};
		let peak = 3;
		let smoothing = 20;
		let vertices = this.geometry.attributes.position.array;
		for (let i = 0; i <= vertices.length; i += 3) {
			vertices[i + 1] = peak * noise2D(vertices[i] / smoothing, vertices[i + 2] / smoothing);
			// vertices[i + 1] = peak * equation(vertices[i] / smoothing, vertices[i + 2] / smoothing);
		}
		this.geometry.computeVertexNormals();
	}
}
