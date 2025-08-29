import * as THREE from 'three';
import type { BuildMap } from '../build/mapParser';

// Simple wireframe renderer: draws walls on XZ plane and verticals to floor/ceiling for reference.
export class BuildWireRenderer {
  public readonly group = new THREE.Group();
  public readonly bounds = new THREE.Box3();

  private wallLines: THREE.LineSegments | null = null;
  private vBounds: THREE.Box3Helper | null = null;

  constructor(private map: BuildMap) {
    this.group.name = 'BuildWireRenderer';
    this.wallLines = this.createWallLines();
    this.group.add(this.wallLines);
    this.computeBounds();
    this.vBounds = new THREE.Box3Helper(this.bounds, 0x4b5563);
    this.group.add(this.vBounds);
  }

  private createWallLines(): THREE.LineSegments {
    const { walls } = this.map;
    // Each wall makes one segment from (x,y) to point2's (x,y)
    const positions: number[] = [];
    const colorA = new THREE.Color(0x60a5fa); // blue-ish
    const colorB = new THREE.Color(0xf59e0b); // amber-ish for portal walls
    const colors: number[] = [];

    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const p2 = walls[w.point2];
      if (!p2) continue;
      // Map Build (x,y) -> Three (x, z); use y as z; Y-up is 0 plane
      positions.push(w.x, 0, w.y, p2.x, 0, p2.y);

      // Different color if it’s a portal (has a nextsector)
      const isPortal = w.nextsector >= 0 && w.nextwall >= 0;
      const col = isPortal ? colorB : colorA;
      colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 1 });
    const lines = new THREE.LineSegments(geom, mat);
    lines.name = 'Walls';
    return lines;
  }

  private computeBounds() {
    const { walls, sectors } = this.map;
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      v.set(w.x, 0, w.y);
      box.expandByPoint(v);
    }
    // expand by sector heights
    for (const s of sectors) {
      // Build Z is in units of 1/16th of a unit? Use as-is for bounds.
      box.expandByPoint(new THREE.Vector3(box.min.x, s.ceilingz, box.min.z));
      box.expandByPoint(new THREE.Vector3(box.max.x, s.floorz, box.max.z));
    }
    this.bounds.copy(box);
  }

  dispose() {
    if (this.wallLines) {
      this.wallLines.geometry.dispose();
      (this.wallLines.material as THREE.Material).dispose();
    }
  }
}

