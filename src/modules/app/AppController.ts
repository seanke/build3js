import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildMap } from '../build/types';
import { BuildWireRenderer } from '../render/buildWireRenderer';
import { TwoDView } from '../view/twoDView';
import { GrpArchive } from '../grp/grpParser';
import { SelectionInfo } from '../../types/selection';

export type ViewMode = '2d' | '3d' | 'split';

/**
 * Main application controller that manages the editor state and coordinates between views
 */
export class AppController {
  // THREE.js components
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  
  // Views
  private view2d: TwoDView | null = null;
  private wireRenderer: BuildWireRenderer | null = null;
  
  // State
  private currentMap: BuildMap | null = null;
  private currentGrp: { arc: GrpArchive; name: string } | null = null;
  private viewMode: ViewMode = '3d';
  
  // DOM elements (set externally)
  private view2dEl: HTMLDivElement | null = null;
  private view3dEl: HTMLDivElement | null = null;

  // Callbacks for React integration
  public onMapChange?: (map: BuildMap | null) => void;
  public onGrpChange?: (grp: { arc: GrpArchive; name: string } | null) => void;
  public onStatusChange?: (status: string) => void;
  public onSelectionChange?: (selection: SelectionInfo | null) => void;

  constructor() {
    this.initThreeJS();
  }

  // Initialize with DOM elements from React
  initWithElements(view2dEl: HTMLDivElement, view3dEl: HTMLDivElement) {
    this.view2dEl = view2dEl;
    this.view3dEl = view3dEl;
    
    // Mount renderer
    this.view3dEl.appendChild(this.renderer.domElement);
    
    // Initialize 2D view
    this.view2d = new TwoDView(this.view2dEl);
    
    // Set up selection callback
    this.view2d.onSelectionChange = (selection) => {
      this.onSelectionChange?.(selection);
    };
    
    this.resize3DToContainer();
  }

  private initThreeJS() {
    // Scene & camera
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AxesHelper(64));
    this.camera = new THREE.PerspectiveCamera(60, 1, 1, 1_000_000);
    this.camera.position.set(0, 512, 1024);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0b1220, 1);

    // Controls (will be updated when renderer is mounted)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    // Grid
    const grid = new THREE.GridHelper(8192, 128, 0x334155, 0x1f2937);
    grid.rotateX(Math.PI / 2);
    this.scene.add(grid);
  }

  setStatus(msg: string) {
    this.onStatusChange?.(msg);
  }

  setCurrentMap(map: BuildMap) {
    this.currentMap = map;
    
    // Update 3D view
    if (this.wireRenderer) {
      this.scene.remove(this.wireRenderer.group);
      this.wireRenderer.dispose();
    }
    this.wireRenderer = new BuildWireRenderer(map);
    this.scene.add(this.wireRenderer.group);
    this.resetCamera(this.wireRenderer.bounds);
    
    // Update 2D view
    if (this.view2d) {
      this.view2d.setMap(map);
    }
    
    // Notify React
    this.onMapChange?.(map);
  }

  getCurrentMap(): BuildMap | null {
    return this.currentMap;
  }

  setCurrentGrp(arc: GrpArchive, name: string) {
    this.currentGrp = { arc, name };
    this.onGrpChange?.(this.currentGrp);
  }

  getCurrentGrp() {
    return this.currentGrp;
  }

  resetCamera(bounds?: THREE.Box3) {
    if (bounds && !bounds.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);
      const radius = Math.max(size.x, size.z) * 0.6 + 256;
      this.camera.position.set(center.x + radius, radius * 0.6, center.z + radius);
      this.controls.target.copy(center);
    } else {
      this.camera.position.set(0, 512, 1024);
      this.controls.target.set(0, 0, 0);
    }
    this.controls.update();
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.layoutViews();
  }

  private layoutViews() {
    if (!this.view2dEl || !this.view3dEl) return;

    const app = this.view2dEl.parentElement;
    if (!app) return;

    const totalW = app.clientWidth;
    const totalH = app.clientHeight;
    
    if (this.viewMode === '2d') {
      this.view2dEl.style.display = 'block';
      this.view3dEl.style.display = 'none';
      this.view2dEl.style.width = totalW + 'px';
      this.view2dEl.style.height = totalH + 'px';
    } else if (this.viewMode === '3d') {
      this.view2dEl.style.display = 'none';
      this.view3dEl.style.display = 'block';
      this.view3dEl.style.width = totalW + 'px';
      this.view3dEl.style.height = totalH + 'px';
    } else {
      this.view2dEl.style.display = 'block';
      this.view3dEl.style.display = 'block';
      this.view2dEl.style.width = Math.floor(totalW / 2) + 'px';
      this.view3dEl.style.width = Math.ceil(totalW / 2) + 'px';
      this.view2dEl.style.height = totalH + 'px';
      this.view3dEl.style.height = totalH + 'px';
    }
    
    if (this.view2d) {
      this.view2d.resize();
    }
    this.resize3DToContainer();
  }

  private resize3DToContainer() {
    if (!this.view3dEl) return;
    
    const rect = this.view3dEl.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  resize() {
    this.layoutViews();
  }

  setSelectionCallback(callback: (selection: SelectionInfo | null) => void) {
    this.onSelectionChange = callback;
    if (this.view2d) {
      this.view2d.onSelectionChange = callback;
    }
  }

  startRenderLoop() {
    const tick = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };
    tick();
  }
}