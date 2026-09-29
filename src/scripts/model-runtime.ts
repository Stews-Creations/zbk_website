import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export async function mountModel(viewer: HTMLElement, progress: (percent: number) => void) {
  const host = viewer.querySelector<HTMLElement>('.model-canvas')!;
  const launch = viewer.querySelector<HTMLElement>('.model-launch')!;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 3000);
  scene.add(new THREE.HemisphereLight(0xd9ecff, 0x5a6059, .95));
  const key = new THREE.DirectionalLight(0xffecd0, 3.0); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb6d6ff, .65); fill.position.set(150, 100, -100); scene.add(fill);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  try {
    gltf = await loader.loadAsync(viewer.dataset.model!, e => progress(e.total ? Math.round(e.loaded / e.total * 100) : 0));
  } catch (error) { renderer.dispose(); throw error; }
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  model.position.sub(center);
  scene.add(model);
  const maxDimension = Math.max(size.x, size.y, size.z);
  key.position.set(-maxDimension, maxDimension * 1.8, maxDimension * 1.25);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -maxDimension * .85;
  key.shadow.camera.right = maxDimension * .85;
  key.shadow.camera.top = maxDimension * .85;
  key.shadow.camera.bottom = -maxDimension * .85;
  key.shadow.camera.near = maxDimension * .1;
  key.shadow.camera.far = maxDimension * 5;
  key.shadow.normalBias = maxDimension * .0003;
  key.shadow.bias = -.0001;
  key.shadow.radius = 2.5;
  key.shadow.camera.updateProjectionMatrix();
  model.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(maxDimension * 1.6, maxDimension * 1.6), new THREE.ShadowMaterial({ opacity: .25 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -size.y / 2 - maxDimension * .025;
  ground.receiveShadow = true;
  scene.add(ground);
  renderer.shadowMap.needsUpdate = true;
  camera.near = maxDimension / 1000; camera.far = maxDimension * 20;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.enableZoom = false; // Fixed framing: drag/arrow rotation only; scrolling belongs to the page.
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 0.24;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = maxDimension * 0.65;
  controls.maxDistance = maxDimension * 5;
  controls.target.set(0, size.y * -0.06, 0);
  const home = new THREE.Vector3();
  let visible = true;
  let active = true;
  const render = () => { if (visible && active && !document.hidden && !document.body.classList.contains('modal-open')) renderer.render(scene, camera); };
  const reset = () => { camera.position.copy(home); controls.target.set(0, size.y * -0.06, 0); controls.update(); render(); };
  const resize = () => {
    if (document.body.classList.contains('modal-open')) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const isCastle = viewer.dataset.map === 'de';
    const distance = maxDimension * (isCastle ? Math.max(1.12, 1.9 / camera.aspect) : camera.aspect < 1 ? 2.05 : 1.65);
    const oldDistance = home.length();
    home.set(isCastle ? -1.25 : -1.24, isCastle ? 0.48 : 0.72, isCastle ? 0.42 : -0.42).normalize().multiplyScalar(distance);
    if (!oldDistance) reset();
    else {
      camera.position.sub(controls.target).multiplyScalar(distance / oldDistance).add(controls.target);
      controls.update(); render();
    }
  };
  controls.addEventListener('change', render);
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  resize(); reset();
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) render(); }); observer.observe(viewer);
  const visibility = () => { if (!document.hidden) render(); };
  document.addEventListener('visibilitychange', visibility);
  const videoVisibility = () => {
    controls.enabled = !document.body.classList.contains('modal-open');
    if (controls.enabled) { resize(); render(); }
  };
  document.addEventListener('video:visibility', videoVisibility);
  controls.enabled = !document.body.classList.contains('modal-open');
  const manipulate = (action: string) => {
    const offset = camera.position.clone().sub(controls.target);
    if (action === 'left' || action === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === 'left' ? 0.18 : -0.18);
    if (action === 'up' || action === 'down') {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + (action === 'up' ? -.12 : .12), controls.minPolarAngle, controls.maxPolarAngle);
      offset.setFromSpherical(spherical);
    }
    camera.position.copy(controls.target).add(offset); controls.update(); render();
  };
  host.addEventListener('keydown', e => {
    const keys: Record<string, string> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (keys[e.key]) { e.preventDefault(); manipulate(keys[e.key]); }
  });
  // Reveal only after a textured frame has been painted, avoiding a hard canvas pop-in.
  requestAnimationFrame(() => requestAnimationFrame(() => viewer.classList.add('model-ready')));
  host.tabIndex = 0;
  launch.hidden = true;
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault(); active = false;
    host.tabIndex = -1;
    viewer.classList.add('model-paused');
    launch.hidden = false;
    launch.querySelector('.model-status')!.textContent = '3D paused by your device. Reload the page to try again.';
  });
  const cleanup = () => {
    observer.disconnect(); resizeObserver.disconnect(); controls.dispose();
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('video:visibility', videoVisibility);
    model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      }
    });
    renderer.dispose();
    ground.geometry.dispose(); ground.material.dispose(); key.shadow.dispose();
  };
  window.addEventListener('pagehide', event => { if (!event.persisted) cleanup(); });
  window.addEventListener('pageshow', render);
  render();
}
