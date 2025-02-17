import * as THREE from 'three';
import waterVert from './water.vert';
import { World } from './World';

export class WaterMaterial extends THREE.ShaderMaterial {
	constructor() {
		const world = World.getInstance();

		const displacementTexture = new THREE.TextureLoader().load('/textures/DisplacementTexture.png');
		displacementTexture.flipY = false;
		displacementTexture.wrapS = THREE.RepeatWrapping;
		displacementTexture.wrapT = THREE.RepeatWrapping;

		super({
			uniforms: {
				...THREE.UniformsLib.lights,
				tReflectorDiffuseDepthless: { value: null },
				tReflectorDepthDepthless: { value: null },
				tReflectorNormalDepthless: { value: null },
				tReflectorDiffuse: { value: null },
				tReflectorDepth: { value: null },
				tDiffuse: { value: null },
				tDepth: { value: null },
				tDisplacement: { value: displacementTexture },
				uNear: { value: world.camera.near },
				uFar: { value: world.camera.far },
				uTime: { value: 0 },
				uDisplacementAmount: { value: 0.2 },
				// TODO: Get directional light direction
				uDirectionalLight: {
					value: new THREE.Vector3(5, 4, 3)
				},
				uInverseViewMatrix: { value: null },
				uTextureMatrix: { value: new THREE.Matrix4() },
				uResolution: {
					value: world.resolution
				}
			},
			vertexShader: waterVert,
			fragmentShader: '',
			lights: true
		});
	}

	onBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms): void {
		shader.fragmentShader = this.#generateFragmentShader(shader);
	}

	#generateFragmentShader(shader: THREE.WebGLProgramParametersWithUniforms) {
		const fragmentShader = `
      #include <common>
      #include <lights_pars_begin>
      #include <packing>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>

      uniform sampler2D tReflectorDiffuseDepthless;
      uniform sampler2D tReflectorDepthDepthless;
      uniform sampler2D tReflectorNormalDepthless;
      uniform sampler2D tReflectorDiffuse;
      uniform sampler2D tReflectorDepth;

      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;

      uniform sampler2D tDisplacement;

      uniform float uNear;
      uniform float uFar;
      uniform float uTime;
      uniform float uDisplacementAmount;

      uniform mat4 uInverseViewMatrix;
      uniform vec3 uDirectionalLight;

      uniform vec4 uResolution;

      varying vec2 vUv;
      varying vec4 vTextureUV;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vViewPosition;

      const float levels = 3.0;
      const float ditheringLevels = 1.0 / 10.0;

      const float ditherMatrix[16] =
          float[](0.0, 0.5, 0.125, 0.625, 0.75, 0.25, 0.875, 0.375, 0.1875, 0.6875,
                  0.0625, 0.5625, 0.9375, 0.4375, 0.8125, 0.3125);

      float getDitherValue(ivec2 pixelCoord) {
        int index = (pixelCoord.x % 4) + (pixelCoord.y % 4) * 4;
        return ditherMatrix[index] - 0.5; 
      }

      float linearize(float depth) {
        return uNear * uFar / (uFar + depth * (uNear - uFar));
      }

      void main() {
        ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
        float ditherOffset =
            getDitherValue(pixelCoord) * ditheringLevels; 

        vec3 pointLight = vec3(0.0, 0.0, 0.0);
        vec3 directionalLight = vec3(0.0, 0.0, 0.0);
      
        ${this.#generatePointLighting(shader)}
        ${this.#generateDirectionalLighting(shader)}

        vec2 screenUV = gl_FragCoord.xy / uResolution.xy;

        // Displacement
        vec2 displacement = texture2D(tDisplacement, vUv + uTime / 16.0).rg;
        displacement = ((displacement * 2.0) - 1.0) * uDisplacementAmount;

        // Foam depth
        float zDepth = linearize(texture2D(tDepth, screenUV).r);
        float zPos = linearize(gl_FragCoord.z);
        float zDiff = clamp(zDepth - zPos, 0.0, 1.0);
        zDiff += displacement.x;

        // Reflection
        vec4 textureUV = vTextureUV;
        textureUV.xy = vTextureUV.xy + displacement.xy / 30.0 * vTextureUV.w;

        float centerDepth = texture2D(tReflectorDepthDepthless, textureUV.xy / textureUV.w).r;
        vec3 centerNormal =
            texture2D(tReflectorNormalDepthless, textureUV.xy / textureUV.w).xyz * 2.0 - 1.0;

        vec2 uvs[4];
        uvs[0] = textureUV.xy / textureUV.w + vec2(0.0, uResolution.w);
        uvs[1] = textureUV.xy / textureUV.w + vec2(0.0, -uResolution.w);
        uvs[2] = textureUV.xy / textureUV.w + vec2(uResolution.z, 0.0);
        uvs[3] = textureUV.xy / textureUV.w + vec2(-uResolution.z, 0.0);

        float depthDiff = 0.0;
        float nearestDepth = centerDepth;
        vec2 nearestUV = textureUV.xy / textureUV.w;

        float normalSum = 0.0;

        for (int i = 0; i < 4; i++) {
          float offsetDepth = texture2D(tReflectorDepthDepthless, uvs[i]).r;
          depthDiff += centerDepth - offsetDepth;

          if (offsetDepth < nearestDepth) {
            nearestDepth = offsetDepth;
            nearestUV = uvs[i];
          }

          vec3 offsetNormal = texture2D(tReflectorNormalDepthless, uvs[i]).xyz * 2.0 - 1.0;
          vec3 normalDiff = centerNormal - offsetNormal;

          vec3 normalEdgeBias = vec3(1.0, 1.0, 1.0);
          float normalBiasDiff = dot(normalDiff, normalEdgeBias);
          float normalIndicator = smoothstep(-0.01, 0.01, normalBiasDiff);

          normalSum += dot(normalDiff, normalDiff) * normalIndicator;
        }

        float depthThreshold = 0.05;
        float depthEdge = step(depthThreshold, depthDiff);

        float darkenAmount = 0.3;
        float lightenAmount = 1.5;

        float normalThreshold = 0.6;
        float indicator = sqrt(normalSum);
        float normalEdge = step(normalThreshold, indicator);

        vec3 texel = texture2D(tReflectorDiffuseDepthless, textureUV.xy / textureUV.w).rgb;
        vec3 edgeTexel = texture2D(tReflectorDiffuseDepthless, nearestUV).rgb;

        // TODO: Fix light edge outlining
        mat3 viewToWorldNormalMat =
            mat3(uInverseViewMatrix[0].xyz, uInverseViewMatrix[1].xyz,
                uInverseViewMatrix[2].xyz);
        float ld =
            dot((viewToWorldNormalMat * centerNormal), -normalize(uDirectionalLight));

        vec3 reflectionColor;
        if ((texture2D(tReflectorDepth, nearestUV).r + 0.01) < nearestDepth) {
          reflectionColor = texture2D(tReflectorDiffuse, nearestUV).rgb;
        } else if (depthEdge > 0.0) {
          reflectionColor = mix(texel, edgeTexel * darkenAmount, depthEdge);
        } else {
          reflectionColor = mix(
              texel, texel * (ld > 0.0 ? darkenAmount : lightenAmount), normalEdge);
        }

        vec3 waterColor =
            mix(texture2D(tDiffuse, screenUV + displacement / 16.0).rgb,
                vec3(0.0, 0.0, 1.0), 0.5);

        vec3 foamColor = vec3(1.0, 1.0, 1.0);

        vec3 color = mix(waterColor, reflectionColor, 0.4);
        color = mix(foamColor, color, step(0.25, zDiff - ditherOffset));

        gl_FragColor = vec4(
            color * (ambientLightColor + directionalLight + pointLight),
            1.0);
      }
    `;

		return fragmentShader;
	}

	#generatePointLighting(shader: THREE.WebGLProgramParametersWithUniforms) {
		let pointLighting = ``;
		for (let i = 0; i < shader.numPointLights; i++) {
			pointLighting += `
        PointLightShadow pointShadow${i} = pointLightShadows[${i}];

        float pointShadowIntensity${i} = getPointShadow(
            pointShadowMap[${i}], pointShadow${i}.shadowMapSize, pointShadow${i}.shadowIntensity, pointShadow${i}.shadowBias,
            pointShadow${i}.shadowRadius, vPointShadowCoord[${i}],
            pointShadow${i}.shadowCameraNear, pointShadow${i}.shadowCameraFar);

        vec3 pointLightDirection${i} =
            pointLights[${i}].position -
            vec3(-vViewPosition.x, vViewPosition.y, vViewPosition.z);
        float pointLightDistance${i} =
            sqrt(dot(pointLightDirection${i}, pointLightDirection${i}));

        float NdotP${i} = dot(vNormal, normalize(pointLightDirection${i}));
        float pointLightIntensity${i} = max(-NdotP${i} + ditherOffset, 0.0);
        float pLevel${i} = floor(pointLightIntensity${i} * levels);
        pointLightIntensity${i} = pLevel${i} / levels;

        pointLight += pointLights[${i}].color * pointLightIntensity${i} /
                      pow(pointLightDistance${i}, 2.0);
      `;
		}

		return pointLighting;
	}

	#generateDirectionalLighting(shader: THREE.WebGLProgramParametersWithUniforms) {
		console.log(shader.uniforms);
		let directionalLighting = ``;
		for (let i = 0; i < shader.numDirLights; i++) {
			directionalLighting += `
        DirectionalLightShadow directionalShadow${i} = directionalLightShadows[${i}];

        float directionalShadowIntensity${i} =
            getShadow(directionalShadowMap[${i}], directionalShadow${i}.shadowMapSize, directionalShadow${i}.shadowIntensity,
                      directionalShadow${i}.shadowBias, directionalShadow${i}.shadowRadius,
                      vDirectionalShadowCoord[${i}]);

        float NdotD${i} = dot(vNormal, directionalLights[${i}].direction);
        float directionalLightIntensity${i} = max(-NdotD${i} + ditherOffset, 0.0);
        float directionalLevel${i} = floor(directionalLightIntensity${i} * levels);
        directionalLightIntensity${i} = directionalLevel${i} / levels;

        directionalLight += directionalLights[${i}].color * directionalLightIntensity${i};
      `;
		}

		return directionalLighting;
	}
}
