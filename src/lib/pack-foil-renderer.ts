/** Imported only by the opening enhancement, never by the game shell. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type FoilPose = { progress: number; from: number; to: number; opened: boolean };
export type FoilRenderer = { update: (pose: FoilPose) => void; dispose: () => void };

const HEIGHT = 880 / 300;
const SEAM = HEIGHT * (0.5 - 0.1545);

export async function createFoilRenderer(host: HTMLElement, artwork: string, onLost: () => void): Promise<FoilRenderer> {
  // A failed context or texture never disables the underlying accessible gesture.
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0, 0);
  const canvas = renderer.domElement;
  const lost = (event: Event) => { event.preventDefault(); onLost(); };
  canvas.addEventListener("webglcontextlost", lost);
  let texture: THREE.Texture;
  try { texture = await new THREE.TextureLoader().loadAsync(artwork); }
  catch (error) { canvas.removeEventListener("webglcontextlost", lost); renderer.dispose(); throw error; }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .06);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = .45;
  const camera = new THREE.OrthographicCamera(-1.35, 1.35, HEIGHT * .675, -HEIGHT * .675, .1, 20);
  camera.position.z = 8;
  const pouch = new THREE.Group();
  scene.add(pouch);
  const material = new THREE.MeshPhysicalMaterial({ map: texture, metalness: .38, roughness: .32,
    clearcoat: .7, clearcoatRoughness: .24, side: THREE.DoubleSide, alphaTest: .45, transparent: true });
  const capMaterial = material.clone();
  const backMaterial = material.clone();
  backMaterial.color.set("#6c405c");
  backMaterial.roughness = .48;

  // Subdivision gives actual bulging laminate normals and crimped welds.
  const makeSheet = (bottom: number, top: number) => {
    const geometry = new THREE.PlaneGeometry(2, top - bottom, 40, 24);
    const positions = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i) + (top + bottom) / 2;
      const v = (y + HEIGHT / 2) / HEIGHT;
      const bulge = Math.max(0, 1 - x * x) * Math.sin(v * Math.PI) * .13;
      const wrinkles = Math.sin(x * 17 + y * 3) * Math.sin(v * Math.PI) * .005;
      const weld = v > .87 || v < .07 ? Math.sin(x * 100) * .007 : 0;
      positions.setXYZ(i, x, y, bulge + wrinkles + weld);
      uv.setXY(i, (x + 1) / 2, v);
    }
    geometry.computeVertexNormals();
    return geometry;
  };
  const bodyGeometry = makeSheet(-HEIGHT / 2, SEAM);
  const capGeometry = makeSheet(SEAM, HEIGHT / 2);
  const rest = Float32Array.from(capGeometry.attributes.position.array);
  const body = new THREE.Mesh(bodyGeometry, material);
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  const rear = new THREE.Mesh(bodyGeometry, backMaterial);
  rear.position.z = -.055;
  rear.rotation.y = Math.PI;
  pouch.add(rear, body, cap);
  scene.add(new THREE.HemisphereLight(0xfff0df, 0x25192e, 2.4));
  const key = new THREE.DirectionalLight(0xffe8d3, 3.4);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdebaff, 1.7);
  rim.position.set(3, -.5, 2);
  scene.add(rim);

  let disposed = false;
  let frame = 0;
  let started: number | null = null;
  let pose: FoilPose = { progress: 0, from: 7, to: 7, opened: false };
  const draw = (now: number) => {
    if (disposed) return;
    const t = started === null ? 0 : Math.min(1, (now - started) / 920);
    const ease = 1 - Math.pow(1 - t, 3);
    const positions = capGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
      const percent = (x + 1) * 50;
      const peeled = pose.opened ? ease : Math.max(0, Math.min(1, (percent - pose.from) / 5, (pose.to - percent) / 5)) * pose.progress / 100;
      const angle = peeled * 1.65;
      const dy = y - SEAM;
      positions.setXYZ(i, x + (pose.opened ? ease * .3 : 0),
        SEAM + dy * Math.cos(angle) + (pose.opened ? ease * .28 : 0),
        z + dy * Math.sin(angle));
    }
    positions.needsUpdate = true;
    capGeometry.computeVertexNormals();
    const finger = pose.progress ? ((pose.from + pose.to) / 100 - 1) : 0;
    pouch.rotation.set(pose.opened ? -ease * .15 : .025, pose.opened ? 0 : -.045 + finger * .08, 0);
    body.position.y = rear.position.y = -ease * HEIGHT * .34;
    material.opacity = backMaterial.opacity = 1 - ease * .45;
    capMaterial.opacity = 1 - ease;
    // Specular is evaluated on the curved mesh, clipped by the printed alpha.
    // After opening, stop the active glint while leaving diffuse shell visible.
    material.clearcoat = pose.opened ? 0 : .7;
    capMaterial.clearcoat = pose.opened ? 0 : .7;
    material.metalness = pose.opened ? 0 : .38;
    capMaterial.metalness = pose.opened ? 0 : .38;
    backMaterial.clearcoat = pose.opened ? 0 : .7;
    backMaterial.metalness = pose.opened ? 0 : .38;
    material.specularIntensity = capMaterial.specularIntensity = backMaterial.specularIntensity = pose.opened ? 0 : 1;
    key.position.x = -2 + finger * 2;
    renderer.render(scene, camera);
    canvas.dataset.foilFrames = String(Number(canvas.dataset.foilFrames ?? 0) + 1);
    frame = pose.opened && t < 1 ? requestAnimationFrame(draw) : 0;
  };
  const resize = () => {
    if (disposed) return;
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    if (!frame) draw(performance.now());
  };
  host.appendChild(canvas);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    update(next) {
      if (disposed) return;
      if (next.opened && !pose.opened) started = performance.now();
      pose = next;
      if (frame) cancelAnimationFrame(frame);
      draw(performance.now());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      bodyGeometry.dispose(); capGeometry.dispose();
      material.dispose(); capMaterial.dispose(); backMaterial.dispose(); texture.dispose();
      environment.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
