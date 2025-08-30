import { parseBuildMap, BuildMap } from '../build/mapParser';
import { serializeBuildMap } from '../build/mapWriter';
import { parseGrp, GrpArchive, GrpEntry } from '../grp/grpParser';
import { createNewSquareMap } from '../build/mapWriter';

/**
 * Handles file loading, saving, and GRP archive management
 */
export class FileManager {
  async loadMapFile(file: File): Promise<BuildMap> {
    const buf = await file.arrayBuffer();
    return parseBuildMap(new DataView(buf));
  }

  async loadMapFromBuffer(buffer: ArrayBuffer): Promise<BuildMap> {
    return parseBuildMap(new DataView(buffer));
  }

  async loadGrpFile(file: File): Promise<GrpArchive> {
    const buf = await file.arrayBuffer();
    return parseGrp(new DataView(buf));
  }

  async loadGrpFromBuffer(buffer: ArrayBuffer): Promise<GrpArchive> {
    return parseGrp(new DataView(buffer));
  }

  async loadMapFromGrpEntry(arc: GrpArchive, entry: GrpEntry): Promise<BuildMap> {
    const dv = arc.slice(entry);
    return parseBuildMap(dv);
  }

  saveMapToFile(map: BuildMap, filename: string = 'map.map') {
    const buf = serializeBuildMap(map);
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  createNewMap(): BuildMap {
    return createNewSquareMap();
  }

  /**
   * Fetch built-in GRP file from server
   */
  async fetchBuiltinGrp(filename: string = '/DUKE3D.GRP'): Promise<ArrayBuffer> {
    const res = await fetch(filename);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  }
}