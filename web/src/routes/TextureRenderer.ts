import * as THREE from 'three';
import { DEPTHLESS_LAYER, GROUND_LAYER } from './constants';

export class TextureRenderer {
	private renderer: THREE.WebGLRenderer;
	private scene: THREE.Scene;
	private camera: THREE.Camera;
	private topdownCamera: THREE.Camera;

	private diffuseAndDepthRenderTarget: THREE.WebGLRenderTarget;
	private diffuseAndDepthDepthlessRenderTarget: THREE.WebGLRenderTarget;
	private normalDepthlessRenderTarget: THREE.WebGLRenderTarget;
	private groundAndDepthRenderTarget: THREE.WebGLRenderTarget;

	private normalMaterial: THREE.MeshNormalMaterial;

	private _diffuseTexture: THREE.Texture | null = null;
	private _depthTexture: THREE.DepthTexture | null = null;
	private _diffuseDepthlessTexture: THREE.Texture | null = null;
	private _depthDepthlessTexture: THREE.DepthTexture | null = null;
	private _normalDepthlessTexture: THREE.Texture | null = null;
	private _groundDiffuseTexture: THREE.Texture | null = null;
	private _groundDepthTexture: THREE.DepthTexture | null = null;

	constructor(
		renderer: THREE.WebGLRenderer,
		scene: THREE.Scene,
		camera: THREE.PerspectiveCamera,
		topdownCamera: THREE.OrthographicCamera,
		resolution: THREE.Vector4
	) {
		this.renderer = renderer;
		this.scene = scene;
		this.camera = camera;
		this.topdownCamera = topdownCamera;

		this.diffuseAndDepthRenderTarget = this.createRenderTarget(resolution.x, resolution.y, true);

		this.diffuseAndDepthDepthlessRenderTarget = this.createRenderTarget(
			resolution.x,
			resolution.y,
			true
		);

		this.normalDepthlessRenderTarget = this.createRenderTarget(resolution.x, resolution.y, true);

		this.groundAndDepthRenderTarget = this.createRenderTarget(resolution.x, resolution.y, true);

		this.normalMaterial = new THREE.MeshNormalMaterial();
	}

	get diffuseTexture() {
		if (this._diffuseTexture === null) {
			this.renderDiffuseAndDepth();
		}
		return this._diffuseTexture as THREE.Texture;
	}

	get depthTexture() {
		if (this._depthTexture === null) {
			this.renderDiffuseAndDepth();
		}
		return this._depthTexture as THREE.DepthTexture;
	}

	get diffuseDepthlessTexture() {
		if (this._diffuseDepthlessTexture === null) {
			this.renderDiffuseAndDepthDepthless();
		}
		return this._diffuseDepthlessTexture as THREE.Texture;
	}

	get depthDepthlessTexture() {
		if (this._depthDepthlessTexture === null) {
			this.renderDiffuseAndDepthDepthless();
		}
		return this._depthDepthlessTexture as THREE.DepthTexture;
	}

	get normalDepthlessTexture() {
		if (this._normalDepthlessTexture === null) {
			this.renderNormalDepthless();
		}
		return this._normalDepthlessTexture as THREE.Texture;
	}

	get groundDiffuseTexture() {
		if (this._groundDiffuseTexture === null) {
			this.renderGroundDiffuseAndDepthTexture();
		}
		return this._groundDiffuseTexture as THREE.Texture;
	}

	get groundDepthTexture() {
		if (this._groundDepthTexture === null) {
			this.renderGroundDiffuseAndDepthTexture();
		}
		return this._groundDepthTexture as THREE.DepthTexture;
	}

	resetTextures() {
		this._diffuseTexture = null;
		this._depthTexture = null;
		this._diffuseDepthlessTexture = null;
		this._depthDepthlessTexture = null;
		this._normalDepthlessTexture = null;
		this._groundDiffuseTexture = null;
		this._groundDepthTexture = null;
	}

	private renderDiffuseAndDepth() {
		this.renderer.setRenderTarget(this.diffuseAndDepthRenderTarget);
		this.renderer.render(this.scene, this.camera);

		this._diffuseTexture = this.diffuseAndDepthRenderTarget.texture;
		this._depthTexture = this.diffuseAndDepthRenderTarget.depthTexture;
	}

	private renderDiffuseAndDepthDepthless() {
		this.camera.layers.disable(DEPTHLESS_LAYER);
		this.renderer.setRenderTarget(this.diffuseAndDepthDepthlessRenderTarget);
		this.renderer.render(this.scene, this.camera);
		this.camera.layers.enable(DEPTHLESS_LAYER);

		this._diffuseDepthlessTexture = this.diffuseAndDepthDepthlessRenderTarget.texture;
		this._depthDepthlessTexture = this.diffuseAndDepthDepthlessRenderTarget.depthTexture;
	}

	private renderNormalDepthless() {
		this.camera.layers.disable(DEPTHLESS_LAYER);
		const prevOverrideMaterial = this.scene.overrideMaterial;
		this.renderer.setRenderTarget(this.normalDepthlessRenderTarget);
		this.scene.overrideMaterial = this.normalMaterial;
		this.renderer.render(this.scene, this.camera);
		this.scene.overrideMaterial = prevOverrideMaterial;
		this.camera.layers.enable(DEPTHLESS_LAYER);

		this._normalDepthlessTexture = this.normalDepthlessRenderTarget.texture;
	}

	private renderGroundDiffuseAndDepthTexture() {
		const groundLayer = new THREE.Layers();
		groundLayer.set(GROUND_LAYER);

		const setWrite = (objects: THREE.Object3D[], write: boolean) => {
			objects.forEach((object) => {
				if (object instanceof THREE.Mesh && !object.layers.test(groundLayer)) {
					object.material.colorWrite = write;
					object.material.depthWrite = write;
					if (object.children.length) {
						setWrite(object.children, write);
					}
				}
			});
		};

		setWrite(this.scene.children, false);

		this.renderer.setRenderTarget(this.groundAndDepthRenderTarget);
		this.renderer.render(this.scene, this.topdownCamera);

		setWrite(this.scene.children, true);

		this._groundDiffuseTexture = this.groundAndDepthRenderTarget.texture;
		this._groundDepthTexture = this.groundAndDepthRenderTarget.depthTexture;
	}

	private createRenderTarget(width: number, height: number, depthTexture: boolean) {
		const renderTarget = new THREE.WebGLRenderTarget(
			width,
			height,
			depthTexture
				? {
						depthTexture: new THREE.DepthTexture(width, height),
						depthBuffer: true
					}
				: undefined
		);
		renderTarget.texture.format = THREE.RGBAFormat;
		renderTarget.texture.minFilter = THREE.NearestFilter;
		renderTarget.texture.magFilter = THREE.NearestFilter;
		renderTarget.texture.generateMipmaps = false;
		renderTarget.stencilBuffer = false;

		return renderTarget;
	}
}
