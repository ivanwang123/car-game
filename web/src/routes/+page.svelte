<script lang="ts">
	import * as THREE from 'three';
	import { onMount } from 'svelte';
	import {
		EffectComposer,
		GammaCorrectionShader,
		OrbitControls,
		ShaderPass
	} from 'three/examples/jsm/Addons.js';
	import { TextureRenderer } from './TextureRenderer';
	import { PixelateShaderPass } from './PixelateShaderPass';
	import { CustomToonMaterial } from './CustomToonMaterial';
	import { World } from './World';
	import { Water } from './Water';
	import { Ground } from './Ground';

	let canvas: HTMLCanvasElement;

	const world = World.getInstance();

	// Lighting
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.01);
	world.scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
	directionalLight.position.set(-5, 4, 3);
	directionalLight.castShadow = true;
	world.scene.add(directionalLight);

	const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 1);
	world.scene.add(directionalLightHelper);

	const pointLight = new THREE.PointLight(0xff0000, 5);
	pointLight.position.set(2, 2, 0);
	pointLight.castShadow = true;
	world.scene.add(pointLight);

	const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1);
	world.scene.add(pointLightHelper);

	const pointLight2 = new THREE.PointLight(0x0000ff, 5);
	pointLight2.position.set(-2, 2, 0);
	pointLight2.castShadow = true;
	world.scene.add(pointLight2);

	const pointLightHelper2 = new THREE.PointLightHelper(pointLight2, 0.1);
	world.scene.add(pointLightHelper2);

	// Models
	const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
	const cubeMaterial = new CustomToonMaterial({ color: new THREE.Color(0xff773d) });

	const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
	cube.position.set(0, 0.5, 0);
	cube.castShadow = true;
	world.scene.add(cube);

	const water = new Water({ width: 30, height: 30, segments: 1 });
	water.position.set(0, 0.5, 0);
	world.scene.add(water);

	const ground = new Ground({
		width: 30,
		height: 30,
		segments: 1,
		color: new THREE.Color(0xffffff)
	});
	ground.position.y = 1.5;
	world.scene.add(ground);

	onMount(() => {
		// Renderer
		const renderer = new THREE.WebGLRenderer({
			antialias: false,
			canvas
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.shadowMap.type = THREE.BasicShadowMap;
		renderer.shadowMap.enabled = true;

		// Texture Renderer
		const textureRenderer = new TextureRenderer(
			renderer,
			world.scene,
			world.camera,
			world.topdownCamera,
			world.resolution
		);

		// Composer
		const composer = new EffectComposer(renderer);
		composer.setSize(window.innerWidth, window.innerHeight);
		composer.addPass(new PixelateShaderPass(world.resolution, world.camera, textureRenderer));
		composer.addPass(new ShaderPass(GammaCorrectionShader));

		// Controls
		new OrbitControls(world.camera, renderer.domElement);

		// Clock
		const clock = new THREE.Clock();

		// Animate
		const animate = () => {
			requestAnimationFrame(animate);

			// Delta time
			const dt = clock.getElapsedTime();

			textureRenderer.resetTextures();

			water.update(dt, textureRenderer);

			composer.render();
		};

		// Resize
		const resize = () => {
			renderer.setSize(window.innerWidth, window.innerHeight);
			world.camera.aspect = window.innerWidth / window.innerHeight;
			world.camera.updateProjectionMatrix();
			world.topdownCamera.updateProjectionMatrix();

			composer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', resize);

		animate();
		resize();

		return () => {
			window.removeEventListener('resize', resize);
		};
	});
</script>

<canvas bind:this={canvas}></canvas>
