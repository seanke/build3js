import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parseBuildMap, type BuildMap } from './modules/build/mapParser';
import { BuildWireRenderer } from './modules/render/buildWireRenderer';
import { parseGrp, type GrpArchive, type GrpEntry } from './modules/grp/grpParser';
import { createNewSquareMap, serializeBuildMap } from './modules/build/mapWriter';

const app = document.getElementById('app')!;
const statusEl = document.getElementById('status')!;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0b1220, 1);
app.appendChild(renderer.domElement);

// Scene & camera
const scene = new THREE.Scene();
scene.add(new THREE.AxesHelper(64));
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1_000_000);
camera.position.set(0, 512, 1024);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

// Grid (top-down, X right, Z forward, Y up)
const grid = new THREE.GridHelper(8192, 128, 0x334155, 0x1f2937);
grid.rotateX(Math.PI / 2); // put on XZ plane
scene.add(grid);

let wireRenderer: BuildWireRenderer | null = null;

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

function resetCamera(bounds?: THREE.Box3) {
  if (!bounds || !bounds.isEmpty()) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds!.getSize(size);
    bounds!.getCenter(center);
    const radius = Math.max(size.x, size.z) * 0.6 + 256;
    camera.position.set(center.x + radius, radius * 0.6, center.z + radius);
    controls.target.copy(center);
  } else {
    camera.position.set(0, 512, 1024);
    controls.target.set(0, 0, 0);
  }
  controls.update();
}

// File input/drop handling
const fileInput = document.getElementById('file') as HTMLInputElement;
const grpFileInput = document.getElementById('grpfile') as HTMLInputElement;
const dropzone = document.getElementById('dropzone')!;
// Menu items
const miNewMap = document.getElementById('menu-new-map') as HTMLButtonElement;
const miOpenMap = document.getElementById('menu-open-map') as HTMLButtonElement;
const miSaveMap = document.getElementById('menu-save-map') as HTMLButtonElement;
const miOpenGrp = document.getElementById('menu-open-grp') as HTMLButtonElement;
const miExploreGrp = document.getElementById('menu-explore-grp') as HTMLButtonElement;
const miResetCamera = document.getElementById('menu-reset-camera') as HTMLButtonElement;
const miHelpAbout = document.getElementById('menu-help-about') as HTMLButtonElement;
// Modal elements
const modalBackdrop = document.getElementById('modal-backdrop') as HTMLDivElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;
const grpTryBuiltin = document.getElementById('grp-try-builtin') as HTMLButtonElement;
const grpMeta = document.getElementById('grp-meta') as HTMLSpanElement;
const grpList = document.getElementById('grp-list') as HTMLDivElement;

miResetCamera.addEventListener('click', () => resetCamera(wireRenderer?.bounds));

fileInput.addEventListener('change', async () => {
  const f = fileInput.files?.[0];
  if (f) await loadMapFile(f);
});

grpFileInput.addEventListener('change', async () => {
  const f = grpFileInput.files?.[0];
  if (f) await loadGrpFile(f);
});

miNewMap.addEventListener('click', () => {
  const map = createNewSquareMap();
  setCurrentMap(map);
  setStatus('New map created');
});
miOpenMap.addEventListener('click', () => fileInput.click());
miSaveMap.addEventListener('click', () => {
  if (!currentMap) { setStatus('No map to save'); return; }
  try {
    const buf = serializeBuildMap(currentMap);
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'map.map';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus('Map saved to download');
  } catch (e: any) {
    console.error(e);
    setStatus('Failed to save map');
  }
});
miOpenGrp.addEventListener('click', () => grpFileInput.click());
miExploreGrp.addEventListener('click', () => showModal());
miHelpAbout.addEventListener('click', () => {
  alert('BUILD3JS — a TypeScript + three.js viewer for BUILD-era maps.');
});
modalClose.addEventListener('click', () => hideModal());
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) hideModal();
});
grpTryBuiltin.addEventListener('click', async () => {
  try {
    setStatus('Fetching /DUKE3D.GRP …');
    const res = await fetch('/DUKE3D.GRP');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    await loadGrpBuffer(buf, 'DUKE3D.GRP');
  } catch (e: any) {
    setStatus('Could not fetch built-in GRP. Place it in /public.');
    console.warn(e);
  }
});

['dragenter', 'dragover'].forEach(evt => {
  window.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('show');
  });
});

['dragleave', 'drop'].forEach(evt => {
  window.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('show');
  });
});

window.addEventListener('drop', async (e: DragEvent) => {
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;
  const name = f.name.toLowerCase();
  if (name.endsWith('.map')) await loadMapFile(f);
  else if (name.endsWith('.grp')) await loadGrpFile(f);
});

async function loadMapFile(file: File) {
  setStatus(`Loading ${file.name} …`);
  try {
    const buf = await file.arrayBuffer();
    const map = parseBuildMap(new DataView(buf));

    // Remove previous
    if (wireRenderer) {
      scene.remove(wireRenderer.group);
      wireRenderer.dispose();
    }

    wireRenderer = new BuildWireRenderer(map);
    scene.add(wireRenderer.group);
    resetCamera(wireRenderer.bounds);
    setStatus(`Loaded: ${file.name} — sectors: ${map.sectors.length}, walls: ${map.walls.length}, sprites: ${map.sprites.length}`);
  } catch (err: any) {
    console.error(err);
    setStatus(`Failed to load: ${err?.message ?? 'Unknown error'}`);
  }
}

let currentGrp: { arc: GrpArchive; name: string } | null = null;

async function loadGrpFile(file: File) {
  setStatus(`Loading GRP ${file.name} …`);
  const buf = await file.arrayBuffer();
  await loadGrpBuffer(buf, file.name);
}

async function loadGrpBuffer(buf: ArrayBuffer, name: string) {
  try {
    const arc = parseGrp(new DataView(buf));
    currentGrp = { arc, name };
    setStatus(`Loaded GRP: ${name} — files: ${arc.count}`);
    populateGrpPanel(arc, name);
    // Do not auto-open modal; open via menu → GRP Explorer…
  } catch (err: any) {
    console.error(err);
    setStatus(`Failed to load GRP: ${err?.message ?? 'Unknown error'}`);
  }
}

function populateGrpPanel(arc: GrpArchive, name: string) {
  grpMeta.textContent = `${name} — ${arc.count} files`;
  grpList.innerHTML = '';
  // Show MAP files first, then others
  const maps = arc.entries.filter(e => e.name.endsWith('.MAP'));
  const others = arc.entries.filter(e => !e.name.endsWith('.MAP'));
  const section = (title: string, items: GrpEntry[]) => {
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'font-weight:600;color:#e5e7eb;margin:8px 0 4px;';
    grpList.appendChild(h);
    for (const e of items) {
      const row = document.createElement('div');
      row.className = 'list-row';
      const nameEl = document.createElement('span');
      nameEl.textContent = e.name;
      const sizeEl = document.createElement('span');
      sizeEl.textContent = `${e.size} bytes`;
      sizeEl.style.cssText = 'color:#94a3b8;font-size:12px;';
      row.appendChild(nameEl);
      row.appendChild(sizeEl);
      row.addEventListener('click', async () => {
        if (e.name.endsWith('.MAP')) {
          await loadMapFromGrpEntry(e);
        }
      });
      grpList.appendChild(row);
    }
  };
  section('Maps', maps);
  section('Other Files', others);
}

async function loadMapFromGrpEntry(entry: GrpEntry) {
  if (!currentGrp) return;
  const { arc, name } = currentGrp;
  setStatus(`Loading ${entry.name} from ${name} …`);
  try {
    const dv = arc.slice(entry);
    const map = parseBuildMap(dv);
    setCurrentMap(map);
    setStatus(`Loaded: ${entry.name} — sectors: ${map.sectors.length}, walls: ${map.walls.length}, sprites: ${map.sprites.length}`);
  } catch (err: any) {
    console.error(err);
    setStatus(`Failed to load map from GRP: ${err?.message ?? 'Unknown error'}`);
  }
}

let currentMap: BuildMap | null = null;
function setCurrentMap(map: BuildMap) {
  currentMap = map;
  if (wireRenderer) {
    scene.remove(wireRenderer.group);
    wireRenderer.dispose();
  }
  wireRenderer = new BuildWireRenderer(map);
  scene.add(wireRenderer.group);
  resetCamera(wireRenderer.bounds);
}

function showModal() {
  modalBackdrop.hidden = false;
}

function hideModal() {
  modalBackdrop.hidden = true;
}

// Render loop
function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
