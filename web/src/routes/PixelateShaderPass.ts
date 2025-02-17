import * as THREE from 'three';

import pixelateVert from './pixelate.vert';
import pixelateFrag from './pixelate.frag';
import type { TextureRenderer } from './TextureRenderer';
import { FullScreenQuad, Pass } from 'three/examples/jsm/Addons.js';

export class PixelateShaderPass extends Pass {
	resolution: THREE.Vector4;
	camera: THREE.Camera;
	textureRenderer: TextureRenderer;
	fsQuad: FullScreenQuad;

	constructor(resolution: THREE.Vector4, camera: THREE.Camera, textureRenderer: TextureRenderer) {
		super();

		this.resolution = resolution;
		this.camera = camera;
		this.textureRenderer = textureRenderer;
		this.fsQuad = new FullScreenQuad(this.material());
	}

	render(
		renderer: THREE.WebGLRenderer,
		writeBuffer: THREE.WebGLRenderTarget,
		readBuffer: THREE.WebGLRenderTarget
	) {
		const uniforms = (this.fsQuad.material as THREE.ShaderMaterial).uniforms;

		uniforms.tDiffuseDepthless.value = this.textureRenderer.diffuseDepthlessTexture;
		uniforms.tDepthDepthless.value = this.textureRenderer.depthDepthlessTexture;

		uniforms.tNormalDepthless.value = this.textureRenderer.normalDepthlessTexture;

		uniforms.tDiffuse.value = this.textureRenderer.diffuseTexture;
		uniforms.tDepth.value = this.textureRenderer.depthTexture;

		if (this.renderToScreen) {
			renderer.setRenderTarget(null);
		} else {
			renderer.setRenderTarget(writeBuffer);
			writeBuffer.depthTexture = readBuffer.texture as THREE.DepthTexture;
			writeBuffer.depthBuffer = true;
			if (this.clear) {
				renderer.clear();
			}
		}

		this.fsQuad.render(renderer);
	}

	material() {
		return new THREE.ShaderMaterial({
			vertexShader: pixelateVert,
			fragmentShader: pixelateFrag,
			uniforms: {
				tDiffuseDepthless: { value: null },
				tDepthDepthless: { value: null },
				tNormalDepthless: { value: null },
				tDiffuse: { value: null },
				tDepth: { value: null },
				// TODO: Get directional light direction
				uDirectionalLight: {
					value: new THREE.Vector3(5, 4, 3)
				},
				uInverseProjectionMatrix: {
					value: this.camera.projectionMatrixInverse
				},
				uInverseViewMatrix: {
					value: this.camera.matrixWorld
				},
				uResolution: {
					value: this.resolution
				}
			}
		});
	}
}
