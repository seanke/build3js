import type { BuildMap } from '../build/types';
import { SelectionInfo } from '../../types/selection';

type Vec2 = { x: number; y: number };

type SelectionState = {
  selectedWalls: Set<number>;
  selectedSectors: Set<number>;
  selectedSprites: Set<number>;
  selectedVertices: Set<string>; // "x,y" keys
};

type DragState = {
  startMouse: Vec2;
  currentMouse: Vec2;
  isBoxSelecting: boolean;
};

export class TwoDView {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: BuildMap | null = null;
  // Camera state
  private zoom = 1; // pixels per build unit
  private pan: Vec2 = { x: 0, y: 0 }; // screen-space pan in pixels
  private dragging = false;
  private lastMouse: Vec2 = { x: 0, y: 0 };
  // Selection state
  private selection: SelectionState = {
    selectedWalls: new Set(),
    selectedSectors: new Set(),
    selectedSprites: new Set(),
    selectedVertices: new Set()
  };
  private dragState: DragState | null = null;
  // Display options
  private showGrid = true;
  private showVertexHandles = true;
  private showPropertyOverlays = false;
  private showSpriteNumbers = false;
  // Performance
  private animationFrameId: number | null = null;
  private needsRedraw = true;
  private sectorPaths: Path2D[] = [];
  private sectorCenters: (Vec2 | null)[] = [];
  // Grid extent (BUILD editor board size)
  private gridExtent = 131072; // Default BUILD extent (can be 65536 to 524288)
  
  // Selection callback
  public onSelectionChange?: (selectionInfo: SelectionInfo | null) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;
    this.container.appendChild(this.canvas);
    this.resize();
    this.bindEvents();
    this.draw();
  }

  setMap(map: BuildMap | null) {
    this.map = map;
    if (map) {
      this.frameToMapBounds();
      this.cacheSectorGeometry();
    }
    this.requestDraw();
  }

  frameToMapBounds() {
    const bounds = this.computeBounds();
    if (!bounds) return;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const margin = 40;
    const dx = bounds.max.x - bounds.min.x;
    const dy = bounds.max.y - bounds.min.y;
    const zx = (w - margin * 2) / (dx || 1);
    const zy = (h - margin * 2) / (dy || 1);
    this.zoom = Math.max(0.001, Math.min(50, Math.min(zx, zy)));
    // Center
    const cx = (bounds.max.x + bounds.min.x) / 2;
    const cy = (bounds.max.y + bounds.min.y) / 2;
    this.pan.x = w / 2 - cx * this.zoom;
    this.pan.y = h / 2 + cy * this.zoom;
    this.requestDraw();
  }

  frameToBoard() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const margin = 40;
    // Board extends from -gridExtent to +gridExtent
    const boardSize = this.gridExtent * 2;
    const zx = (w - margin * 2) / boardSize;
    const zy = (h - margin * 2) / boardSize;
    this.zoom = Math.min(zx, zy);
    // Center at origin (0, 0)
    this.pan.x = w / 2;
    this.pan.y = h / 2;
    this.requestDraw();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.requestDraw();
  }

  private requestDraw() {
    this.needsRedraw = true;
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.animationFrameId = null;
        if (this.needsRedraw) {
          this.needsRedraw = false;
          this.draw();
        }
      });
    }
  }

  private bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      const mouse = this.getMouse(e);
      
      if (e.button === 0) { // Left click
        const world = this.screenToWorld(mouse);
        
        if (e.shiftKey) {
          // Start box selection
          this.dragState = {
            startMouse: mouse,
            currentMouse: mouse,
            isBoxSelecting: true
          };
        } else if (!this.handleSelection(world, e.ctrlKey || e.metaKey)) {
          // No selection hit, start box select
          this.dragState = {
            startMouse: mouse,
            currentMouse: mouse,
            isBoxSelecting: true
          };
        }
        this.requestDraw();
      } else if (e.button === 1) { // Middle click
        e.preventDefault();
        this.dragging = true;
        this.lastMouse = mouse;
      } else if (e.button === 2) { // Right click - pan
        e.preventDefault();
        this.dragging = true;
        this.lastMouse = mouse;
      }
    });

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const mouse = this.getMouse(e);
      
      if (this.dragState?.isBoxSelecting) {
        this.dragState.currentMouse = mouse;
        this.requestDraw();
      } else if (this.dragging) {
        const dx = mouse.x - this.lastMouse.x;
        const dy = mouse.y - this.lastMouse.y;
        this.pan.x += dx;
        this.pan.y += dy;
        this.lastMouse = mouse;
        this.requestDraw();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (this.dragState?.isBoxSelecting) {
        this.handleBoxSelection(e.ctrlKey || e.metaKey);
        this.dragState = null;
        this.requestDraw();
      }
      this.dragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const mouse = this.getMouse(e);
      const delta = Math.sign(e.deltaY) * -0.1;
      const prevZoom = this.zoom;
      const nextZoom = Math.max(0.001, Math.min(50, prevZoom * (1 + delta))); // Allow much more zoom out
      // Zoom towards mouse position
      const worldBefore = this.screenToWorld(mouse);
      this.zoom = nextZoom;
      const worldAfter = this.screenToWorld(mouse);
      this.pan.x += (worldAfter.x - worldBefore.x) * this.zoom;
      this.pan.y -= (worldAfter.y - worldBefore.y) * this.zoom;
      this.requestDraw();
    }, { passive: false });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.selectAll();
      } else if (e.key === 'Escape') {
        this.clearSelection();
      } else if (e.key === 'g') {
        this.showGrid = !this.showGrid;
        this.requestDraw();
      } else if (e.key === 'v') {
        this.showVertexHandles = !this.showVertexHandles;
        this.requestDraw();
      } else if (e.key === 'p') {
        this.showPropertyOverlays = !this.showPropertyOverlays;
        this.requestDraw();
      } else if (e.key === 'b') {
        // Frame to board extents
        this.frameToBoard();
      } else if (e.key === 'f') {
        // Frame to map contents
        this.frameToMapBounds();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const panSpeed = e.shiftKey ? 100 : 30;
        this.pan.x += panSpeed;
        this.requestDraw();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const panSpeed = e.shiftKey ? 100 : 30;
        this.pan.x -= panSpeed;
        this.requestDraw();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const panSpeed = e.shiftKey ? 100 : 30;
        this.pan.y += panSpeed;
        this.requestDraw();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const panSpeed = e.shiftKey ? 100 : 30;
        this.pan.y -= panSpeed;
        this.requestDraw();
      }
    });
  }

  private getMouse(e: MouseEvent | WheelEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private screenToWorld(p: Vec2): Vec2 {
    return { x: (p.x - this.pan.x) / this.zoom, y: (this.pan.y - p.y) / this.zoom };
  }

  private worldToScreen(p: Vec2): Vec2 {
    return { x: p.x * this.zoom + this.pan.x, y: -p.y * this.zoom + this.pan.y };
  }

  private handleSelection(world: Vec2, addToSelection: boolean): boolean {
    if (!this.map) return false;
    
    // Check sprites first (on top)
    for (let i = 0; i < this.map.sprites.length; i++) {
      const sprite = this.map.sprites[i];
      const dist = Math.sqrt((sprite.x - world.x) ** 2 + (sprite.y - world.y) ** 2);
      if (dist < 128 / this.zoom) { // 128 build units radius
        if (!addToSelection) this.clearSelection();
        if (this.selection.selectedSprites.has(i)) {
          this.selection.selectedSprites.delete(i);
        } else {
          this.selection.selectedSprites.add(i);
        }
        this.notifySelectionChange();
        return true;
      }
    }
    
    // Check walls
    for (let i = 0; i < this.map.walls.length; i++) {
      const wall = this.map.walls[i];
      const wall2 = this.map.walls[wall.point2];
      if (!wall2) continue;
      
      if (this.pointNearLine(world, {x: wall.x, y: wall.y}, {x: wall2.x, y: wall2.y}, 64 / this.zoom)) {
        if (!addToSelection) this.clearSelection();
        if (this.selection.selectedWalls.has(i)) {
          this.selection.selectedWalls.delete(i);
        } else {
          this.selection.selectedWalls.add(i);
        }
        this.notifySelectionChange();
        return true;
      }
    }
    
    return false;
  }

  private handleBoxSelection(addToSelection: boolean) {
    if (!this.map || !this.dragState) return;
    
    const min = {
      x: Math.min(this.dragState.startMouse.x, this.dragState.currentMouse.x),
      y: Math.min(this.dragState.startMouse.y, this.dragState.currentMouse.y)
    };
    const max = {
      x: Math.max(this.dragState.startMouse.x, this.dragState.currentMouse.x),
      y: Math.max(this.dragState.startMouse.y, this.dragState.currentMouse.y)
    };
    
    if (!addToSelection) this.clearSelection();
    
    // Select sprites in box
    for (let i = 0; i < this.map.sprites.length; i++) {
      const sprite = this.map.sprites[i];
      const screen = this.worldToScreen({x: sprite.x, y: sprite.y});
      if (screen.x >= min.x && screen.x <= max.x && screen.y >= min.y && screen.y <= max.y) {
        this.selection.selectedSprites.add(i);
      }
    }
    
    // Select walls with both endpoints in box
    for (let i = 0; i < this.map.walls.length; i++) {
      const wall = this.map.walls[i];
      const wall2 = this.map.walls[wall.point2];
      if (!wall2) continue;
      
      const p1 = this.worldToScreen({x: wall.x, y: wall.y});
      const p2 = this.worldToScreen({x: wall2.x, y: wall2.y});
      
      if (p1.x >= min.x && p1.x <= max.x && p1.y >= min.y && p1.y <= max.y &&
          p2.x >= min.x && p2.x <= max.x && p2.y >= min.y && p2.y <= max.y) {
        this.selection.selectedWalls.add(i);
      }
    }
  }

  private pointNearLine(p: Vec2, a: Vec2, b: Vec2, threshold: number): boolean {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ap = { x: p.x - a.x, y: p.y - a.y };
    const ab2 = ab.x * ab.x + ab.y * ab.y;
    if (ab2 === 0) return Math.sqrt(ap.x * ap.x + ap.y * ap.y) < threshold;
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / ab2));
    const proj = { x: a.x + t * ab.x, y: a.y + t * ab.y };
    const dist = Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
    return dist < threshold;
  }

  private selectAll() {
    if (!this.map) return;
    for (let i = 0; i < this.map.walls.length; i++) {
      this.selection.selectedWalls.add(i);
    }
    for (let i = 0; i < this.map.sprites.length; i++) {
      this.selection.selectedSprites.add(i);
    }
    this.notifySelectionChange();
    this.requestDraw();
  }

  private clearSelection() {
    this.selection.selectedWalls.clear();
    this.selection.selectedSectors.clear();
    this.selection.selectedSprites.clear();
    this.selection.selectedVertices.clear();
    this.notifySelectionChange();
    this.requestDraw();
  }

  private notifySelectionChange() {
    if (!this.onSelectionChange || !this.map) return;

    const wallCount = this.selection.selectedWalls.size;
    const sectorCount = this.selection.selectedSectors.size;
    const spriteCount = this.selection.selectedSprites.size;
    const vertexCount = this.selection.selectedVertices.size;
    
    const totalSelected = wallCount + sectorCount + spriteCount + vertexCount;

    if (totalSelected === 0) {
      this.onSelectionChange(null);
      return;
    }

    // Single object selected
    if (totalSelected === 1) {
      if (wallCount === 1) {
        const index = Array.from(this.selection.selectedWalls)[0];
        this.onSelectionChange({
          type: 'wall',
          indices: [index],
          objects: [this.map.walls[index]],
          map: this.map
        });
      } else if (sectorCount === 1) {
        const index = Array.from(this.selection.selectedSectors)[0];
        this.onSelectionChange({
          type: 'sector',
          indices: [index],
          objects: [this.map.sectors[index]],
          map: this.map
        });
      } else if (spriteCount === 1) {
        const index = Array.from(this.selection.selectedSprites)[0];
        this.onSelectionChange({
          type: 'sprite',
          indices: [index],
          objects: [this.map.sprites[index]],
          map: this.map
        });
      }
    } else {
      // Multiple objects selected
      const indices: number[] = [];
      const objects: any[] = [];

      this.selection.selectedWalls.forEach(i => {
        indices.push(i);
        objects.push(this.map.walls[i]);
      });
      this.selection.selectedSectors.forEach(i => {
        indices.push(i);
        objects.push(this.map.sectors[i]);
      });
      this.selection.selectedSprites.forEach(i => {
        indices.push(i);
        objects.push(this.map.sprites[i]);
      });

      this.onSelectionChange({
        type: 'multiple',
        indices,
        objects,
        map: this.map
      });
    }
  }

  private computeBounds(): { min: Vec2; max: Vec2 } | null {
    if (!this.map || this.map.walls.length === 0) return null;
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const w of this.map.walls) {
      if (w.x < minx) minx = w.x;
      if (w.y < miny) miny = w.y;
      if (w.x > maxx) maxx = w.x;
      if (w.y > maxy) maxy = w.y;
    }
    return { min: { x: minx, y: miny }, max: { x: maxx, y: maxy } };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    // Grid
    if (this.showGrid) this.drawGrid(w, h);

    if (!this.map) return;
    
    // Draw sectors (filled)
    this.drawSectors();
    
    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.scale(this.zoom, -this.zoom); // Y-up in world space

    // Walls
    ctx.lineWidth = Math.max(1, 2 / this.zoom);
    for (let i = 0; i < this.map.walls.length; i++) {
      const a = this.map.walls[i];
      const b = this.map.walls[a.point2];
      if (!b) continue;
      
      const isSelected = this.selection.selectedWalls.has(i);
      const isPortal = a.nextsector >= 0 && a.nextwall >= 0;
      const isMasked = (a.cstat & 16) !== 0; // Masked wall
      const isOneWay = (a.cstat & 32) !== 0; // One-way wall
      
      // Determine color based on wall type and selection
      if (isSelected) {
        ctx.strokeStyle = '#10b981'; // Green for selected
        ctx.lineWidth = Math.max(2, 3 / this.zoom);
      } else if (isMasked) {
        ctx.strokeStyle = '#8b5cf6'; // Purple for masked
      } else if (isOneWay) {
        ctx.strokeStyle = '#ef4444'; // Red for one-way
      } else if (isPortal) {
        ctx.strokeStyle = '#f59e0b'; // Orange for portal
      } else {
        ctx.strokeStyle = '#60a5fa'; // Blue for regular
      }
      
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      
      // Draw normal indicator for one-way walls
      if (isOneWay) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len * 64; // Normal
        const ny = dx / len * 64;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(1, 1 / this.zoom);
        ctx.beginPath();
        ctx.moveTo(mid.x, mid.y);
        ctx.lineTo(mid.x + nx, mid.y + ny);
        ctx.stroke();
      }
    }

    // Sprites
    this.drawSprites();
    
    // Vertex handles
    if (this.showVertexHandles) {
      this.drawVertexHandles();
    }
    
    // Start position
    this.drawStartPosition();
    
    ctx.restore();
    
    // Property overlays (drawn in screen space)
    if (this.showPropertyOverlays) {
      this.drawPropertyOverlays();
    }
    
    // Selection box
    if (this.dragState?.isBoxSelecting) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      const min = {
        x: Math.min(this.dragState.startMouse.x, this.dragState.currentMouse.x),
        y: Math.min(this.dragState.startMouse.y, this.dragState.currentMouse.y)
      };
      const size = {
        x: Math.abs(this.dragState.currentMouse.x - this.dragState.startMouse.x),
        y: Math.abs(this.dragState.currentMouse.y - this.dragState.startMouse.y)
      };
      ctx.strokeRect(min.x, min.y, size.x, size.y);
      ctx.setLineDash([]);
    }
  }

  private cacheSectorGeometry() {
    if (!this.map) return;
    
    this.sectorPaths = [];
    this.sectorCenters = [];
    
    for (let s = 0; s < this.map.sectors.length; s++) {
      const sector = this.map.sectors[s];
      const path = new Path2D();
      let hasPath = false;
      let sumX = 0, sumY = 0, count = 0;
      
      // Draw walls directly from sector definition
      for (let w = 0; w < sector.wallnum; w++) {
        const wallIdx = sector.wallptr + w;
        const wall = this.map.walls[wallIdx];
        if (!wall) continue;
        
        if (!hasPath) {
          path.moveTo(wall.x, wall.y);
          hasPath = true;
        } else {
          path.lineTo(wall.x, wall.y);
        }
        
        sumX += wall.x;
        sumY += wall.y;
        count++;
      }
      
      if (hasPath) {
        path.closePath();
        this.sectorPaths[s] = path;
        this.sectorCenters[s] = count > 0 ? { x: sumX / count, y: sumY / count } : null;
      }
    }
  }

  private drawSectors() {
    if (!this.map || this.sectorPaths.length === 0) return;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.scale(this.zoom, -this.zoom);
    
    // Draw all non-selected sectors first
    ctx.fillStyle = 'rgba(30, 41, 59, 0.3)';
    for (let s = 0; s < this.sectorPaths.length; s++) {
      if (!this.selection.selectedSectors.has(s) && this.sectorPaths[s]) {
        ctx.fill(this.sectorPaths[s]);
      }
    }
    
    // Draw selected sectors on top
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    for (const s of this.selection.selectedSectors) {
      if (this.sectorPaths[s]) {
        ctx.fill(this.sectorPaths[s]);
      }
    }
    
    ctx.restore();
  }


  private drawSprites() {
    if (!this.map) return;
    const ctx = this.ctx;
    
    for (let i = 0; i < this.map.sprites.length; i++) {
      const sprite = this.map.sprites[i];
      const isSelected = this.selection.selectedSprites.has(i);
      
      ctx.save();
      ctx.translate(sprite.x, sprite.y);
      
      // Draw sprite as a diamond/square rotated 45 degrees
      const size = 64;
      ctx.fillStyle = isSelected ? '#10b981' : '#fbbf24';
      ctx.strokeStyle = isSelected ? '#059669' : '#f59e0b';
      ctx.lineWidth = Math.max(1, 2 / this.zoom);
      
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Draw angle indicator
      const angleRad = (sprite.ang * Math.PI) / 1024; // BUILD angle to radians
      const arrowLen = size * 1.5;
      ctx.strokeStyle = isSelected ? '#059669' : '#dc2626';
      ctx.lineWidth = Math.max(1, 2 / this.zoom);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angleRad) * arrowLen, Math.sin(angleRad) * arrowLen);
      ctx.stroke();
      
      // Sprite number
      if (this.showSpriteNumbers || isSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(12, 16 / this.zoom)}px monospace`;
        ctx.scale(1, -1); // Flip text right-side up
        ctx.fillText(i.toString(), size + 10, 0);
      }
      
      ctx.restore();
    }
  }

  private drawVertexHandles() {
    if (!this.map) return;
    const ctx = this.ctx;
    
    const vertices = new Map<string, Vec2>();
    
    // Collect unique vertices
    for (const wall of this.map.walls) {
      const key = `${wall.x},${wall.y}`;
      if (!vertices.has(key)) {
        vertices.set(key, { x: wall.x, y: wall.y });
      }
    }
    
    // Draw handles
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(1, 1 / this.zoom);
    const size = Math.max(3, 4 / this.zoom);
    
    for (const [key, vertex] of vertices) {
      const isSelected = this.selection.selectedVertices.has(key);
      
      if (isSelected) {
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#059669';
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#475569';
      }
      
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawStartPosition() {
    if (!this.map || !this.map.start) return;
    const ctx = this.ctx;
    
    const pos = this.map.start;
    const size = 96;
    
    // Draw player start as a triangle
    ctx.save();
    ctx.translate(pos.posx, pos.posy);
    ctx.rotate((pos.ang * Math.PI) / 1024 - Math.PI / 2);
    
    ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = Math.max(2, 3 / this.zoom);
    
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.6, size * 0.6);
    ctx.lineTo(size * 0.6, size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  private drawPropertyOverlays() {
    if (!this.map) return;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    
    // Wall properties
    for (let i = 0; i < this.map.walls.length; i++) {
      const wall = this.map.walls[i];
      const wall2 = this.map.walls[wall.point2];
      if (!wall2) continue;
      
      const mid = this.worldToScreen({
        x: (wall.x + wall2.x) / 2,
        y: (wall.y + wall2.y) / 2
      });
      
      const text = `#${i}`;
      if (wall.lotag || wall.hitag) {
        const tags = `L:${wall.lotag} H:${wall.hitag}`;
        ctx.strokeText(tags, mid.x, mid.y - 5);
        ctx.fillText(tags, mid.x, mid.y - 5);
      }
      ctx.strokeText(text, mid.x, mid.y + 10);
      ctx.fillText(text, mid.x, mid.y + 10);
    }
    
    // Sector properties
    for (let i = 0; i < this.map.sectors.length; i++) {
      const sector = this.map.sectors[i];
      const center = this.getSectorCenter(i);
      if (!center) continue;
      
      const screen = this.worldToScreen(center);
      const text = `S#${i}`;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(screen.x - 20, screen.y - 20, 40, 30);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, screen.x - 15, screen.y - 5);
      
      if (sector.lotag || sector.hitag) {
        const tags = `${sector.lotag}/${sector.hitag}`;
        ctx.fillText(tags, screen.x - 15, screen.y + 8);
      }
    }
    
    ctx.restore();
  }

  private getSectorCenter(sectorIndex: number): Vec2 | null {
    return this.sectorCenters[sectorIndex] || null;
  }

  private drawGrid(w: number, h: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.translate(this.pan.x, this.pan.y);
    ctx.scale(this.zoom, -this.zoom);

    // Grid spacing in world units (adaptive)
    const targetPx = 64; // want ~64px between grid lines
    const base = Math.pow(2, Math.round(Math.log2(targetPx / this.zoom)));
    const step = Math.max(64, base);

    // Clamp grid drawing to the grid extent (board boundaries)
    const bounds = this.screenBoundsToWorld(w, h);
    const gridMinX = Math.max(-this.gridExtent, bounds.min.x);
    const gridMaxX = Math.min(this.gridExtent, bounds.max.x);
    const gridMinY = Math.max(-this.gridExtent, bounds.min.y);
    const gridMaxY = Math.min(this.gridExtent, bounds.max.y);
    
    const minx = Math.floor(gridMinX / step) * step;
    const maxx = Math.ceil(gridMaxX / step) * step;
    const miny = Math.floor(gridMinY / step) * step;
    const maxy = Math.ceil(gridMaxY / step) * step;

    // Draw board boundary (grid extent)
    ctx.lineWidth = Math.max(2, 2 / this.zoom);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(-this.gridExtent, -this.gridExtent, this.gridExtent * 2, this.gridExtent * 2);

    // Draw grid lines within the board
    ctx.lineWidth = Math.max(1, 1 / this.zoom);
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    for (let x = minx; x <= maxx; x += step) {
      if (x >= -this.gridExtent && x <= this.gridExtent) {
        ctx.moveTo(x, Math.max(miny, -this.gridExtent));
        ctx.lineTo(x, Math.min(maxy, this.gridExtent));
      }
    }
    for (let y = miny; y <= maxy; y += step) {
      if (y >= -this.gridExtent && y <= this.gridExtent) {
        ctx.moveTo(Math.max(minx, -this.gridExtent), y);
        ctx.lineTo(Math.min(maxx, this.gridExtent), y);
      }
    }
    ctx.stroke();

    // Axes (clamped to grid extent)
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = Math.max(1, 1.5 / this.zoom);
    ctx.beginPath();
    ctx.moveTo(Math.max(minx, -this.gridExtent), 0); 
    ctx.lineTo(Math.min(maxx, this.gridExtent), 0);
    ctx.moveTo(0, Math.max(miny, -this.gridExtent)); 
    ctx.lineTo(0, Math.min(maxy, this.gridExtent));
    ctx.stroke();

    // Draw extent coordinates at corners when zoomed out enough
    if (this.zoom < 0.5) {
      ctx.save();
      ctx.scale(1, -1); // Flip text right-side up
      ctx.fillStyle = '#6b7280';
      ctx.font = `${Math.max(12, 16 / this.zoom)}px monospace`;
      
      // Top-left corner
      ctx.fillText(`-${this.gridExtent}`, -this.gridExtent + 10 / this.zoom, this.gridExtent - 10 / this.zoom);
      // Top-right corner  
      ctx.fillText(`${this.gridExtent}`, this.gridExtent - 80 / this.zoom, this.gridExtent - 10 / this.zoom);
      // Bottom-left corner
      ctx.fillText(`-${this.gridExtent}`, -this.gridExtent + 10 / this.zoom, -this.gridExtent + 25 / this.zoom);
      // Bottom-right corner
      ctx.fillText(`${this.gridExtent}`, this.gridExtent - 80 / this.zoom, -this.gridExtent + 25 / this.zoom);
      
      ctx.restore();
    }

    ctx.restore();
  }

  private screenBoundsToWorld(w: number, h: number) {
    const tl = this.screenToWorld({ x: 0, y: 0 });
    const br = this.screenToWorld({ x: w, y: h });
    return { min: { x: Math.min(tl.x, br.x), y: Math.min(tl.y, br.y) }, max: { x: Math.max(tl.x, br.x), y: Math.max(tl.y, br.y) } };
  }
}

