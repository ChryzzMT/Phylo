/**
 * Simulador MRUV del laboratorio de riel y carrito.
 *
 * Three.js dibuja la escena en un canvas WebGL (el equivalente 3D de un
 * canvas 2D). Dos THREE.Group separan el hardware quieto del móvil:
 * `hardware-estatico` guarda el riel y `movil-dinamico` guarda el carrito
 * y una esfera de referencia. El bucle de `requestAnimationFrame` usa
 * THREE.Clock y, en cada cuadro, coloca el móvil con
 * x = x0 + v0·t + ½·a·t² a lo largo del riel.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TRAIL_CAPACITY = 2000;
const TRAIL_SPACING = 0.012;

export function mountMruvSimulator(root) {
	if (!root) return;

	const canvas = root.querySelector('#mruv-canvas');
	const viewport = root.querySelector('#mruv-viewport');
	const status = root.querySelector('#mruv-status');
	const playButton = root.querySelector('#mruv-play');
	const pauseButton = root.querySelector('#mruv-pause');
	const resetButton = root.querySelector('#mruv-reset');
	const v0Input = root.querySelector('#mruv-v0');
	const aInput = root.querySelector('#mruv-a');
	const v0Value = root.querySelector('#mruv-v0-value');
	const aValue = root.querySelector('#mruv-a-value');
	const x0Output = root.querySelector('#mruv-x0');
	const railOutput = root.querySelector('#mruv-rail');
	const timeOutput = root.querySelector('#mruv-time');
	const xOutput = root.querySelector('#mruv-x');
	const vOutput = root.querySelector('#mruv-v');
	const equationOutput = root.querySelector('#mruv-equation');

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xe7eef4);

	const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
	camera.position.set(0.15, 0.55, 1.45);

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.maxDistance = 6;
	controls.minDistance = 0.08;
	controls.target.set(0, 0.05, 0);

	scene.add(new THREE.AmbientLight(0xffffff, 0.75));
	scene.add(new THREE.HemisphereLight(0xf7fbfe, 0xb7c3ce, 0.55));
	const sun = new THREE.DirectionalLight(0xffffff, 1.35);
	sun.position.set(1.6, 2.4, 1.2);
	scene.add(sun);

	const grid = new THREE.GridHelper(2.2, 22, 0xb7c3ce, 0xd5dee6);
	grid.position.y = -0.001;
	scene.add(grid);

	const hardwareGroup = new THREE.Group();
	hardwareGroup.name = 'hardware-estatico';
	const dynamicGroup = new THREE.Group();
	dynamicGroup.name = 'movil-dinamico';
	scene.add(hardwareGroup);
	scene.add(dynamicGroup);

	const trailPositions = new Float32Array(TRAIL_CAPACITY * 3);
	const trailGeometry = new THREE.BufferGeometry();
	trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
	trailGeometry.setDrawRange(0, 0);
	const trail = new THREE.Line(
		trailGeometry,
		new THREE.LineBasicMaterial({ color: 0x0369a1 }),
	);
	trail.name = 'estela';
	trail.frustumCulled = false;
	scene.add(trail);

	const state = {
		ready: false,
		playing: false,
		finished: false,
		t: 0,
		x0: 0,
		v0: 0.08,
		a: 0.1,
		railLength: 1.177,
	};
	let trailCount = 0;
	const trailAnchor = new THREE.Vector3();

	const clock = new THREE.Clock();

	function setStatus(message) {
		status.textContent = message;
	}

	function format(value) {
		return Number(value).toFixed(2);
	}

	function readSlider(input, fallback) {
		const value = Number(input.value);
		return Number.isFinite(value) ? value : fallback;
	}

	function positionAt(time) {
		return state.x0 + state.v0 * time + 0.5 * state.a * time * time;
	}

	function velocityAt(time) {
		return state.v0 + state.a * time;
	}

	function updateEquation() {
		equationOutput.textContent =
			`x = ${format(state.x0)} + ${format(state.v0)} t + ½ (${format(state.a)}) t²`;
	}

	function updateReadouts() {
		timeOutput.textContent = `${format(state.t)} s`;
		xOutput.textContent = `${format(dynamicGroup.position.x)} m`;
		vOutput.textContent = `${format(velocityAt(state.t))} m/s`;
	}

	function updateSliderLabels() {
		v0Value.textContent = format(v0Input.value);
		aValue.textContent = format(aInput.value);
	}

	function updateButtons() {
		playButton.disabled = !state.ready || state.playing || state.finished;
		pauseButton.disabled = !state.ready || !state.playing;
		resetButton.disabled = !state.ready;
	}

	function clearTrail() {
		trailCount = 0;
		trailGeometry.setDrawRange(0, 0);
	}

	function pushTrail(displacement) {
		const x = trailAnchor.x + displacement;
		const y = trailAnchor.y;
		const z = trailAnchor.z;
		if (trailCount > 0) {
			const previous = (trailCount - 1) * 3;
			const dx = x - trailPositions[previous];
			const dy = y - trailPositions[previous + 1];
			const dz = z - trailPositions[previous + 2];
			if (dx * dx + dy * dy + dz * dz < TRAIL_SPACING * TRAIL_SPACING) return;
		}
		if (trailCount >= TRAIL_CAPACITY) return;
		const offset = trailCount * 3;
		trailPositions[offset] = x;
		trailPositions[offset + 1] = y;
		trailPositions[offset + 2] = z;
		trailCount += 1;
		trailGeometry.setDrawRange(0, trailCount);
		trailGeometry.attributes.position.needsUpdate = true;
	}

	function timeAtLimit(limit, from, to) {
		const quadratic = 0.5 * state.a;
		const linear = state.v0;
		const roots = [];
		if (Math.abs(quadratic) < 1e-9) {
			if (Math.abs(linear) > 1e-9) roots.push((limit - state.x0) / linear);
		} else {
			const discriminant = linear * linear - 4 * quadratic * (state.x0 - limit);
			if (discriminant >= 0) {
				const root = Math.sqrt(discriminant);
				roots.push((-linear + root) / (2 * quadratic), (-linear - root) / (2 * quadratic));
			}
		}
		const hits = roots.filter((time) => time >= from - 1e-4 && time <= to + 1e-4);
		if (hits.length === 0) return null;
		return Math.min(...hits);
	}

	function resize() {
		const width = viewport.clientWidth;
		const height = viewport.clientHeight;
		if (width === 0 || height === 0) return;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}

	function frameCamera() {
		const box = new THREE.Box3().setFromObject(hardwareGroup);
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		camera.position.set(center.x + size.x * 0.08, center.y + 0.42, center.z + size.x * 1.05);
		controls.target.copy(center);
		controls.update();
	}

	function applyActiveParameters(logChange) {
		state.v0 = readSlider(v0Input, state.v0);
		state.a = readSlider(aInput, state.a);
		updateEquation();
		if (logChange) {
			console.log('PHYLO MRUV — parámetros activos:', {
				x0: state.x0,
				v0: state.v0,
				a: state.a,
				railLength: state.railLength,
			});
		}
	}

	function placeMobile(displacement) {
		dynamicGroup.position.x = displacement;
	}

	playButton.addEventListener('click', () => {
		if (!state.ready || state.playing || state.finished) return;
		state.playing = true;
		setStatus('En movimiento.');
		updateButtons();
	});

	pauseButton.addEventListener('click', () => {
		if (!state.playing) return;
		state.playing = false;
		setStatus('En pausa.');
		updateButtons();
	});

	resetButton.addEventListener('click', () => {
		if (!state.ready) return;
		state.playing = false;
		state.finished = false;
		state.t = 0;
		applyActiveParameters(true);
		clearTrail();
		placeMobile(positionAt(0));
		updateReadouts();
		setStatus('Reiniciado. Pulsa Reproducir.');
		updateButtons();
	});

	v0Input.addEventListener('input', updateSliderLabels);
	aInput.addEventListener('input', updateSliderLabels);

	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(viewport);
	resize();
	updateSliderLabels();
	updateButtons();

	function animate() {
		requestAnimationFrame(animate);
		const delta = clock.getDelta();

		if (state.ready) {
			const wasMoving = state.playing;
			if (wasMoving) state.t += delta;

			let x = positionAt(state.t);
			if (wasMoving && (x < 0 || x > state.railLength)) {
				const limit = x > state.railLength ? state.railLength : 0;
				const hit = timeAtLimit(limit, state.t - delta, state.t);
				if (hit !== null) state.t = Math.max(0, hit);
				x = Math.min(state.railLength, Math.max(0, positionAt(state.t)));
				state.playing = false;
				state.finished = true;
				setStatus(
					limit === 0
						? 'El carrito llegó al inicio del riel.'
						: 'El carrito llegó al extremo del riel.',
				);
				updateButtons();
			}

			placeMobile(x);
			if (wasMoving) pushTrail(x);
			updateReadouts();
		}

		controls.update();
		renderer.render(scene, camera);
	}

	requestAnimationFrame(animate);

	loadModel();

	async function loadModel() {
		try {
			const response = await fetch('/data/mruv.json');
			if (!response.ok) throw new Error(`No se pudo leer mruv.json (${response.status})`);
			const config = await response.json();
			console.log('PHYLO MRUV — parámetros cargados desde /data/mruv.json');
			console.log(config);

			state.x0 = finite(config.x0, 0);
			state.v0 = finite(config.v0, 0.08);
			state.a = finite(config.a, 0.1);
			state.railLength = finite(config.railLength, 1.177);
		v0Input.value = state.v0.toFixed(2);
		aInput.value = state.a.toFixed(2);
			updateSliderLabels();
			x0Output.textContent = `${format(state.x0)} m`;
			railOutput.textContent = `${format(state.railLength)} m`;
			updateEquation();

			const gltf = await new GLTFLoader().loadAsync(config.model || '/models/riel-y-carrito.glb');
			const hardware = gltf.scene.getObjectByName('hardware');
			const cart = gltf.scene.getObjectByName('carrito');
			if (!hardware || !cart) throw new Error('El modelo no trae los nodos hardware y carrito.');

			hardwareGroup.add(hardware);
			dynamicGroup.add(cart);

			const cartBox = new THREE.Box3().setFromObject(cart);
			const cartCenter = cartBox.getCenter(new THREE.Vector3());
			const cartSize = cartBox.getSize(new THREE.Vector3());
			const radius = Math.max(0.02, cartSize.y * 0.45);
			const marker = new THREE.Mesh(
				new THREE.SphereGeometry(radius, 28, 18),
				new THREE.MeshStandardMaterial({
					color: 0xf97316,
					emissive: 0x9a3412,
					emissiveIntensity: 0.35,
					roughness: 0.4,
				}),
			);
			marker.name = 'esfera-referencia';
			marker.position.set(cartCenter.x, cartBox.max.y + radius * 0.2, cartCenter.z);
			dynamicGroup.add(marker);
			trailAnchor.copy(marker.position);

			placeMobile(positionAt(0));
			frameCamera();
			state.ready = true;
			setStatus('Listo. Pulsa Reproducir.');
			updateButtons();
			updateReadouts();
		} catch (error) {
			console.error(error);
			setStatus('No se pudo cargar el simulador.');
		}
	}
}

function finite(value, fallback) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}
