import * as THREE from 'three';
import { DEPTHLESS_LAYER } from './constants';
import { WaterMaterial } from './WaterMaterial';
import { TextureRenderer } from './TextureRenderer';
import { World } from './World';

export class Water extends THREE.Mesh<
	THREE.PlaneGeometry,
	THREE.ShaderMaterial,
	THREE.Object3DEventMap
> {
	clipBias: number;

	reflectorPlane: THREE.Plane;
	normal: THREE.Vector3;
	reflectorWorldPosition: THREE.Vector3;
	cameraWorldPosition: THREE.Vector3;
	rotationMatrix: THREE.Matrix4;
	lookAtPosition: THREE.Vector3;
	clipPlane: THREE.Vector4;

	view: THREE.Vector3;
	target: THREE.Vector3;
	q: THREE.Vector4;

	textureMatrix: THREE.Matrix4;
	virtualCamera: THREE.PerspectiveCamera;

	reflectorTextureRenderer: TextureRenderer | null;

	constructor() {
		const waterGeometry = new THREE.PlaneGeometry(10, 10, 20, 20);
		const waterMaterial = new WaterMaterial();

		super(waterGeometry, waterMaterial);

		this.layers.set(DEPTHLESS_LAYER);
		this.rotation.x = THREE.MathUtils.degToRad(-90);

		// Reflection
		this.clipBias = 0;

		this.reflectorPlane = new THREE.Plane();
		this.normal = new THREE.Vector3();
		this.reflectorWorldPosition = new THREE.Vector3();
		this.cameraWorldPosition = new THREE.Vector3();
		this.rotationMatrix = new THREE.Matrix4();
		this.lookAtPosition = new THREE.Vector3(0, 0, -1);
		this.clipPlane = new THREE.Vector4();

		this.view = new THREE.Vector3();
		this.target = new THREE.Vector3();
		this.q = new THREE.Vector4();

		this.textureMatrix = new THREE.Matrix4();
		this.virtualCamera = new THREE.PerspectiveCamera();
		this.virtualCamera.layers.enableAll();

		waterMaterial.uniforms['uTextureMatrix'].value = this.textureMatrix;
		waterMaterial.uniforms['uInverseViewMatrix'].value = this.virtualCamera.matrixWorld;

		this.reflectorTextureRenderer = null;
	}

	update(dt: number, textureRenderer: TextureRenderer) {
		this.material.uniforms.uTime.value = dt;
		this.material.uniforms.tDiffuse.value = textureRenderer.diffuseDepthlessTexture;
		this.material.uniforms.tDepth.value = textureRenderer.depthDepthlessTexture;
		// this.material.uniforms = {
		// 	...this.material.uniforms,
		// 	...THREE.UniformsLib.lights
		// };
		// console.log(THREE.UniformsLib.lights.pointLights.value[0]);
	}

	onBeforeRender(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
		const world = World.getInstance();

		this.reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
		this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

		this.rotationMatrix.extractRotation(this.matrixWorld);

		this.normal.set(0, 0, 1);
		this.normal.applyMatrix4(this.rotationMatrix);

		this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);

		// Avoid rendering when reflector is facing away
		if (this.view.dot(this.normal) > 0) return;

		this.view.reflect(this.normal).negate();
		this.view.add(this.reflectorWorldPosition);

		this.rotationMatrix.extractRotation(camera.matrixWorld);

		this.lookAtPosition.set(0, 0, -1);
		this.lookAtPosition.applyMatrix4(this.rotationMatrix);
		this.lookAtPosition.add(this.cameraWorldPosition);

		this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition);
		this.target.reflect(this.normal).negate();
		this.target.add(this.reflectorWorldPosition);

		this.virtualCamera.position.copy(this.view);
		this.virtualCamera.up.set(0, 1, 0);
		this.virtualCamera.up.applyMatrix4(this.rotationMatrix);
		this.virtualCamera.up.reflect(this.normal);
		this.virtualCamera.lookAt(this.target);

		this.virtualCamera.far = (camera as THREE.PerspectiveCamera).far;

		this.virtualCamera.updateMatrixWorld();
		this.virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

		// Update the texture matrix
		this.textureMatrix.set(
			0.5,
			0.0,
			0.0,
			0.5,
			0.0,
			0.5,
			0.0,
			0.5,
			0.0,
			0.0,
			0.5,
			0.5,
			0.0,
			0.0,
			0.0,
			1.0
		);
		this.textureMatrix.multiply(this.virtualCamera.projectionMatrix);
		this.textureMatrix.multiply(this.virtualCamera.matrixWorldInverse);
		this.textureMatrix.multiply(this.matrixWorld);

		// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
		// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
		this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, this.reflectorWorldPosition);
		this.reflectorPlane.applyMatrix4(this.virtualCamera.matrixWorldInverse);

		this.clipPlane.set(
			this.reflectorPlane.normal.x,
			this.reflectorPlane.normal.y,
			this.reflectorPlane.normal.z,
			this.reflectorPlane.constant
		);

		const projectionMatrix = this.virtualCamera.projectionMatrix;

		this.q.x =
			(Math.sign(this.clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
		this.q.y =
			(Math.sign(this.clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
		this.q.z = -1.0;
		this.q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

		// Calculate the scaled plane vector
		this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.q));

		// Replacing the third row of the projection matrix
		projectionMatrix.elements[2] = this.clipPlane.x;
		projectionMatrix.elements[6] = this.clipPlane.y;
		projectionMatrix.elements[10] = this.clipPlane.z + 1.0 - this.clipBias;
		projectionMatrix.elements[14] = this.clipPlane.w;

		this.visible = false;

		if (this.reflectorTextureRenderer === null) {
			this.reflectorTextureRenderer = new TextureRenderer(
				renderer,
				scene,
				this.virtualCamera,
				new THREE.OrthographicCamera(),
				world.resolution
			);
		}

		this.reflectorTextureRenderer.resetTextures();

		// Render
		const currentRenderTarget = renderer.getRenderTarget();

		const currentXrEnabled = renderer.xr.enabled;
		const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

		renderer.xr.enabled = false; // Avoid camera modification
		renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

		this.material.uniforms['tReflectorDiffuseDepthless'].value =
			this.reflectorTextureRenderer.diffuseDepthlessTexture;
		this.material.uniforms['tReflectorDepthDepthless'].value =
			this.reflectorTextureRenderer.depthDepthlessTexture;
		this.material.uniforms['tReflectorNormalDepthless'].value =
			this.reflectorTextureRenderer.normalDepthlessTexture;
		this.material.uniforms['tReflectorDiffuse'].value =
			this.reflectorTextureRenderer.diffuseTexture;
		this.material.uniforms['tReflectorDepth'].value = this.reflectorTextureRenderer.depthTexture;

		renderer.xr.enabled = currentXrEnabled;
		renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

		renderer.setRenderTarget(currentRenderTarget);

		// TODO: Restore this.viewport

		// const this.viewport = (camera as THREE.PerspectiveCamera).this.viewport;

		// if (this.viewport !== undefined) {
		//   renderer.state.this.viewport(this.viewport);
		// }

		this.visible = true;
	}
}
