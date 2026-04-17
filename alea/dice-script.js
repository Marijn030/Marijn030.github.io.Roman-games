import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js";

const DIE_SCALE = 0.42;
const FLOOR_Y = -1.72;
const EXIT_X_START = 0.42;
const EXIT_Y_START = -0.55;
const FLOAT_POSITIONS = [
  { x: -1.18, y: 1.76, z: -0.28 },
  { x: -0.58, y: 1.58, z: 0.14 },
  { x: 0.0, y: 1.88, z: -0.1 },
  { x: 0.58, y: 1.62, z: 0.18 },
  { x: 1.16, y: 1.8, z: -0.24 }
];

const FACE_MAP = [
  { dir: new THREE.Vector3(0, 1, 0), value: 1 },
  { dir: new THREE.Vector3(0, -1, 0), value: 6 },
  { dir: new THREE.Vector3(0, 0, 1), value: 2 },
  { dir: new THREE.Vector3(0, 0, -1), value: 5 },
  { dir: new THREE.Vector3(1, 0, 0), value: 3 },
  { dir: new THREE.Vector3(-1, 0, 0), value: 4 }
];

let scene;
let camera;
let renderer;
let controls;
let loader;

let sceneWrap;
let sceneContainer;
let statusText;
let throwText;
let resultsBar;
let spinBtn;
let dropBtn;
let resetBtn;

let dice = [];
let sourceDieTemplate = null;
let animationState = "idle";
let rollFinished = false;
let rollFinishTimer = null;
let clock = new THREE.Clock();

init();

async function init() {
  cacheDom();
  setupScene();
  setupLights();
  setupEvents();
  await setupDice();
  updateUi();
  animate();
}

function cacheDom() {
  sceneWrap = document.getElementById("sceneWrap");
  sceneContainer = document.getElementById("scene");
  statusText = document.getElementById("statusText");
  throwText = document.getElementById("throwText");
  resultsBar = document.getElementById("resultsBar");
  spinBtn = document.getElementById("spinBtn");
  dropBtn = document.getElementById("dropBtn");
  resetBtn = document.getElementById("resetBtn");
}

function setupScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    42,
    sceneContainer.clientWidth / sceneContainer.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.35, 5.8);
  camera.lookAt(0.15, 0.95, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  sceneContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4.2;
  controls.maxDistance = 8.5;
  controls.minPolarAngle = 0.95;
  controls.maxPolarAngle = 1.7;
  controls.target.set(0.12, 0.5, 0);

  loader = new GLTFLoader();
}

function setupLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(2.5, 4.8, 4.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xfff4dd, 0.5);
  fill.position.set(-3.8, 2.8, 1.8);
  scene.add(fill);
}

function setupEvents() {
  spinBtn.addEventListener("click", startSpin);
  dropBtn.addEventListener("click", dropIntoTower);
  resetBtn.addEventListener("click", resetRoll);
  window.addEventListener("resize", onResize);
}

async function setupDice() {
  sourceDieTemplate = await loadDieTemplate();

  for (let i = 0; i < 5; i++) {
    const mesh = sourceDieTemplate
      ? cloneNormalizedDie(sourceDieTemplate)
      : createFallbackDie();

    setFloatingLayout(mesh, i);
    scene.add(mesh);

    dice.push(createDieState(mesh, i));
  }
}

async function loadDieTemplate() {
  try {
    const gltf = await loader.loadAsync("dice.glb");
    const template = gltf.scene || gltf.scenes?.[0];
    if (!template) return null;

    const wrapper = new THREE.Group();
    const cloned = template.clone(true);
    wrapper.add(cloned);

    normalizeObject(wrapper, DIE_SCALE);
    return wrapper;
  } catch (error) {
    console.warn("dice.glb kon niet geladen worden, fallback kubussen worden gebruikt.", error);
    return null;
  }
}

function cloneNormalizedDie(template) {
  const clone = template.clone(true);
  normalizeMaterials(clone);
  return clone;
}

function normalizeObject(object, targetSize = 1) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  object.scale.setScalar(scale);
}

function normalizeMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = false;
    child.receiveShadow = false;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((mat) => mat.clone());
    } else if (child.material) {
      child.material = child.material.clone();
    }
  });
}

function createFallbackDie() {
  const geometry = new THREE.BoxGeometry(DIE_SCALE, DIE_SCALE, DIE_SCALE);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf2f2f2,
    roughness: 0.58,
    metalness: 0.02
  });
  return new THREE.Mesh(geometry, material);
}

function createDieState(mesh, index) {
  return {
    mesh,
    index,
    state: "floating",
    visibleInTower: false,
    settled: false,
    result: null,
    floatBaseY: FLOAT_POSITIONS[index].y,
    floatOffset: Math.random() * Math.PI * 2,
    spin: new THREE.Vector3(
      0.012 + Math.random() * 0.015,
      0.012 + Math.random() * 0.015,
      0.01 + Math.random() * 0.014
    ),
    velocity: new THREE.Vector3(),
    settleLerp: 0,
    targetQuaternion: new THREE.Quaternion()
  };
}

function setFloatingLayout(obj, index) {
  const pos = FLOAT_POSITIONS[index];
  obj.position.set(pos.x, pos.y, pos.z);
  obj.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
}

function startSpin() {
  if (animationState === "dropping" || animationState === "rolling") return;

  animationState = "spinning";
  rollFinished = false;
  clearRollFinishTimer();

  dice.forEach((d, index) => {
    d.state = "floating";
    d.mesh.visible = true;
    d.visibleInTower = false;
    d.settled = false;
    d.result = null;
    d.settleLerp = 0;
    d.velocity.set(0, 0, 0);
    setFloatingLayout(d.mesh, index);
  });

  updateUi();
}

function dropIntoTower() {
  if (animationState === "dropping" || animationState === "rolling") return;

  animationState = "dropping";
  rollFinished = false;
  clearRollFinishTimer();

  dice.forEach((d) => {
    d.state = "toTower";
    d.visibleInTower = false;
    d.settled = false;
    d.result = null;
    d.velocity.set(0, 0, 0);
  });

  updateUi();

  setTimeout(() => {
    hideDiceInTower();
  }, 550);

  setTimeout(() => {
    launchFromTower();
  }, 1050);
}

function hideDiceInTower() {
  dice.forEach((d) => {
    d.mesh.visible = false;
    d.visibleInTower = true;
    d.state = "inTower";
  });
}

function launchFromTower() {
  animationState = "rolling";

  dice.forEach((d, i) => {
    d.mesh.visible = true;
    d.visibleInTower = false;
    d.state = "rolling";
    d.settled = false;
    d.result = null;
    d.settleLerp = 0;

    d.mesh.position.set(
      EXIT_X_START + (Math.random() - 0.5) * 0.22,
      EXIT_Y_START + Math.random() * 0.08,
      -0.15 + i * 0.035
    );

    d.velocity.set(
      0.045 + Math.random() * 0.03,
      -0.015 - Math.random() * 0.015,
      (Math.random() - 0.5) * 0.02
    );

    d.spin.set(
      0.03 + Math.random() * 0.03,
      0.03 + Math.random() * 0.03,
      0.02 + Math.random() * 0.025
    );
  });

  updateUi();
}

function resetRoll() {
  animationState = "idle";
  rollFinished = false;
  clearRollFinishTimer();

  dice.forEach((d, index) => {
    d.mesh.visible = true;
    d.state = "floating";
    d.visibleInTower = false;
    d.settled = false;
    d.result = null;
    d.settleLerp = 0;
    d.velocity.set(0, 0, 0);
    d.spin.set(
      0.012 + Math.random() * 0.015,
      0.012 + Math.random() * 0.015,
      0.01 + Math.random() * 0.014
    );
    setFloatingLayout(d.mesh, index);
  });

  updateUi();
}

function clearRollFinishTimer() {
  if (rollFinishTimer) {
    clearTimeout(rollFinishTimer);
    rollFinishTimer = null;
  }
}

function onResize() {
  const width = sceneContainer.clientWidth;
  const height = sceneContainer.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  for (const d of dice) {
    if (d.state === "floating") {
      updateFloatingDie(d, elapsed);
    } else if (d.state === "toTower") {
      updateTowardTower(d);
    } else if (d.state === "rolling") {
      updateRollingDie(d);
    } else if (d.state === "settling") {
      updateSettlingDie(d);
    }
  }

  if (animationState === "rolling" && !rollFinished) {
    maybeFinishRoll();
  }

  controls.update();
  renderer.render(scene, camera);
}

function updateFloatingDie(d, time) {
  d.mesh.rotation.x += d.spin.x;
  d.mesh.rotation.y += d.spin.y;
  d.mesh.rotation.z += d.spin.z;

  const pos = FLOAT_POSITIONS[d.index];
  d.mesh.position.x = pos.x + Math.sin(time * 1.15 + d.floatOffset) * 0.04;
  d.mesh.position.y = d.floatBaseY + Math.sin(time * 1.8 + d.floatOffset) * 0.055;
  d.mesh.position.z = pos.z + Math.cos(time * 1.25 + d.floatOffset) * 0.035;
}

function updateTowardTower(d) {
  const target = new THREE.Vector3(0.46, 0.9, 0.05);
  d.mesh.visible = true;

  d.mesh.position.lerp(target, 0.16);
  d.mesh.rotation.x += d.spin.x * 2.2;
  d.mesh.rotation.y += d.spin.y * 2.2;
  d.mesh.rotation.z += d.spin.z * 2.2;
}

function updateRollingDie(d) {
  d.mesh.position.add(d.velocity);
  d.velocity.y -= 0.0028;

  d.mesh.rotation.x += d.spin.x * 2.4;
  d.mesh.rotation.y += d.spin.y * 2.4;
  d.mesh.rotation.z += d.spin.z * 1.6;

  if (d.mesh.position.y <= FLOOR_Y) {
    d.mesh.position.y = FLOOR_Y;
    d.velocity.y *= -0.28;
    d.velocity.x *= 0.96;
    d.velocity.z *= 0.94;

    if (Math.abs(d.velocity.y) < 0.006) d.velocity.y = 0;
    if (Math.abs(d.velocity.x) < 0.003) d.velocity.x = 0;
    if (Math.abs(d.velocity.z) < 0.003) d.velocity.z = 0;
  }

  const speed = d.velocity.length();
  if (
    d.mesh.position.y <= FLOOR_Y + 0.0001 &&
    speed < 0.0065 &&
    !d.settled
  ) {
    d.settled = true;
    d.state = "settling";
    d.result = getUpFaceValue(d.mesh);
    d.targetQuaternion.copy(getTargetQuaternionForValue(d.result));
  }
}

function updateSettlingDie(d) {
  d.mesh.position.y = FLOOR_Y;
  d.velocity.set(0, 0, 0);

  d.settleLerp += 0.08;
  const t = Math.min(d.settleLerp, 1);

  d.mesh.quaternion.slerp(d.targetQuaternion, t);

  if (t >= 1) {
    d.state = "done";
  }
}

function maybeFinishRoll() {
  const allDone = dice.every((d) => d.state === "done");

  if (!allDone || rollFinishTimer) return;

  rollFinishTimer = setTimeout(() => {
    finalizeResults();
  }, 280);
}

function finalizeResults() {
  rollFinished = true;
  animationState = "idle";
  clearRollFinishTimer();

  const values = dice.map((d) => d.result ?? getUpFaceValue(d.mesh));
  const total = values.reduce((sum, value) => sum + value, 0);

  throwText.textContent = `Worp: ${values.join(" • ")}  |  Totaal: ${total}`;
  resultsBar.textContent = `Bovenkant: ${values.join(", ")} — totaal ${total}`;
  statusText.textContent = "De dobbelstenen zijn uit de toren gerold.";

  updateUi();
}

function getUpFaceValue(object) {
  const up = new THREE.Vector3(0, 1, 0);
  let bestValue = 1;
  let bestDot = -Infinity;

  for (const face of FACE_MAP) {
    const dir = face.dir.clone().applyQuaternion(object.quaternion);
    const dot = dir.dot(up);
    if (dot > bestDot) {
      bestDot = dot;
      bestValue = face.value;
    }
  }

  return bestValue;
}

function getTargetQuaternionForValue(value) {
  switch (value) {
    case 1:
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    case 6:
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));
    case 2:
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    case 5:
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    case 3:
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
    case 4:
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
    default:
      return new THREE.Quaternion();
  }
}

function updateUi() {
  const isRolling = animationState === "dropping" || animationState === "rolling";

  spinBtn.disabled = isRolling;
  dropBtn.disabled = isRolling;

  if (animationState === "spinning") {
    statusText.textContent = "De dobbelstenen spinnen boven de tafel.";
    if (!rollFinished) {
      throwText.textContent = "Nog geen worp.";
      resultsBar.textContent = "Klik op ‘Laat in toren vallen’ om de worp te starten.";
    }
    return;
  }

  if (animationState === "dropping") {
    statusText.textContent = "De dobbelstenen verdwijnen in de toren.";
    throwText.textContent = "De worp is bezig...";
    resultsBar.textContent = "De dobbelstenen gaan nu door de toren.";
    return;
  }

  if (animationState === "rolling") {
    statusText.textContent = "De dobbelstenen rollen uit de toren.";
    throwText.textContent = "De worp is bezig...";
    resultsBar.textContent = "Even wachten tot alle dobbelstenen stil liggen.";
    return;
  }

  if (!rollFinished) {
    statusText.textContent = "De dobbelstenen zweven klaar boven de tafel.";
    throwText.textContent = "Nog geen worp.";
    resultsBar.textContent = "Laat eerst de dobbelstenen spinnen of stuur ze direct door de toren.";
  }
}
