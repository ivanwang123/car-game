import * as THREE from 'three';

export class World {
	static #instance: World;

	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	topdownCamera: THREE.OrthographicCamera;

	resolution: THREE.Vector4;
	pixelIntensity: number;

	private constructor() {
		// Resolution
		this.pixelIntensity = 3;
		this.resolution = new THREE.Vector4(
			window.innerWidth / this.pixelIntensity,
			window.innerHeight / this.pixelIntensity,
			this.pixelIntensity / window.innerWidth,
			this.pixelIntensity / window.innerHeight
		);

		// Scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xfef6c9);

		// Camera
		this.camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.camera.position.set(0, 8, 8);
		this.camera.layers.enableAll();
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		// Topdown camera
		this.topdownCamera = new THREE.OrthographicCamera(
			-window.innerWidth / 60,
			window.innerWidth / 60,
			window.innerHeight / 60,
			-window.innerHeight / 60,
			0.1,
			1000
		);
		this.topdownCamera.position.set(0, 5, 0);
		this.topdownCamera.lookAt(new THREE.Vector3(0, 0, 0));
		this.topdownCamera.layers.enableAll();
		this.topdownCamera.updateProjectionMatrix();
		this.topdownCamera.updateMatrixWorld();
	}

	static getInstance() {
		if (!World.#instance) {
			World.#instance = new World();
		}
		return World.#instance;
	}
}
