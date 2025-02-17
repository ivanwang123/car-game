import * as THREE from 'three';
import toonVert from './toon.vert';

export class CustomToonMaterial extends THREE.ShaderMaterial {
	constructor(color: THREE.Color) {
		super({
			uniforms: {
				...THREE.UniformsLib.lights,
				uGlossiness: { value: 5 },
				uColor: { value: color }
			},
			vertexShader: toonVert,
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

      uniform float uGlossiness;
      uniform vec3 uColor;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vViewPosition;

      const float levels = 3.0;
      const float ditheringLevels = 1.0 / 10.0;

      const float ditherMatrix[16] = float[](
          0.0,  0.5,  0.125, 0.625,
          0.75, 0.25, 0.875, 0.375,
          0.1875, 0.6875, 0.0625, 0.5625,
          0.9375, 0.4375, 0.8125, 0.3125
      );

      float getDitherValue(ivec2 pixelCoord) {
          int index = (pixelCoord.x % 4) + (pixelCoord.y % 4) * 4;
          return ditherMatrix[index] - 0.5;
      }

      void main() {
        ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
        float ditherOffset = getDitherValue(pixelCoord) * ditheringLevels;

        vec3 pointLight = vec3(0.0, 0.0, 0.0);
        vec3 directionalLight = vec3(0.0, 0.0, 0.0);
        vec3 specular = vec3(0.0, 0.0, 0.0);
        vec3 rim = vec3(0.0, 0.0, 0.0);

        ${this.#generatePointLighting(shader)}
        ${this.#generateDirectionalLighting(shader)}

        gl_FragColor = vec4(uColor * (ambientLightColor + directionalLight + pointLight + specular + rim), 1.0);
      }
    `;

		return fragmentShader;
	}

	#generatePointLighting(shader: THREE.WebGLProgramParametersWithUniforms) {
		let pointLighting = '';
		for (let i = 0; i < shader.numPointLights; i++) {
			pointLighting += `
			PointLightShadow pointShadow${i} = pointLightShadows[${i}];
			
			float pointShadowIntensity${i} = getPointShadow(
					pointShadowMap[${i}], pointShadow${i}.shadowMapSize, pointShadow${i}.shadowIntensity, pointShadow${i}.shadowBias,
					pointShadow${i}.shadowRadius, vPointShadowCoord[${i}],
					pointShadow${i}.shadowCameraNear, pointShadow${i}.shadowCameraFar);

			vec3 pointLightDirection${i} = pointLights[${i}].position - vViewPosition;
				float pointLightDistance${i} =
					sqrt(dot(pointLightDirection${i}, pointLightDirection${i}));

			float NdotP${i} = dot(vNormal, normalize(pointLightDirection${i}));
			float pointLightIntensity${i} = max(NdotP${i} + ditherOffset, 0.0);
			float pLevel${i} = floor(pointLightIntensity${i} * levels);
			pointLightIntensity${i} = pLevel${i} / levels;

			pointLight += pointLights[${i}].color * pointLightIntensity${i} *
										pointShadowIntensity${i} / pow(pointLightDistance${i}, 2.0);
		`;
		}

		return pointLighting;
	}

	#generateDirectionalLighting(shader: THREE.WebGLProgramParametersWithUniforms) {
		let directionalLighting = '';
		for (let i = 0; i < shader.numDirLights; i++) {
			directionalLighting += `
			DirectionalLightShadow directionalShadow${i} = directionalLightShadows[${i}];

			float directionalShadowIntensity${i} =
					getShadow(directionalShadowMap[${i}], directionalShadow${i}.shadowMapSize, directionalShadow${i}.shadowIntensity,
										directionalShadow${i}.shadowBias, directionalShadow${i}.shadowRadius,
										vDirectionalShadowCoord[${i}]);
				
			float NdotD${i} = dot(vNormal, directionalLights[${i}].direction);

			float directionalLightIntensity${i} = max(NdotD${i} + ditherOffset, 0.0);
			float directionalLevel${i} = floor(directionalLightIntensity${i} * levels);
			directionalLightIntensity${i} = directionalLevel${i} / levels;

			directionalLight += directionalLights[${i}].color *
													directionalLightIntensity${i} *
													directionalShadowIntensity${i};

			// Specular lighting
			vec3 halfVector${i} = normalize(directionalLights[${i}].direction * 1.5 + vViewDir);
			float NdotH${i} = dot(vNormal, halfVector${i});

			float specularIntensity${i} = pow(NdotH${i}, 1000.0 / uGlossiness);
			float specularIntensitySmooth${i} = smoothstep(0.05, 0.1, specularIntensity${i});

			specular += specularIntensitySmooth${i} * directionalLights[${i}].color;

			// Rim lighting
			float rimDot${i} = 1.0 - dot(vViewDir, vNormal);
			float rimAmount${i} = 0.7;

			float rimThreshold${i} = 0.7;
			float rimIntensity${i} = rimDot${i} * pow(NdotD${i}, rimThreshold${i});
			rimIntensity${i} = smoothstep(rimAmount${i} - 0.01, rimAmount${i} + 0.01, rimIntensity${i});

			rim += rimIntensity${i} * directionalLights[${i}].color;
		`;
		}

		return directionalLighting;
	}
}
