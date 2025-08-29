import type { BuildMap, SectorType, SpriteType, WallType } from './types';

class Cursor {
  private view: DataView;
  private off = 0;
  constructor(view: DataView) { this.view = view; }
  get offset() { return this.off; }
  i8(): number { const v = this.view.getInt8(this.off); this.off += 1; return v; }
  u8(): number { const v = this.view.getUint8(this.off); this.off += 1; return v; }
  i16(): number { const v = this.view.getInt16(this.off, true); this.off += 2; return v; }
  u16(): number { const v = this.view.getUint16(this.off, true); this.off += 2; return v; }
  i32(): number { const v = this.view.getInt32(this.off, true); this.off += 4; return v; }
  u32(): number { const v = this.view.getUint32(this.off, true); this.off += 4; return v; }
}

export function parseBuildMap(view: DataView): BuildMap {
  const c = new Cursor(view);

  const version = c.u32();
  // Known BUILD .map versions are typically 7 or 8 for DN3D-era editors.
  if (version < 6 || version > 10) {
    throw new Error(`Unexpected BUILD map version: ${version}`);
  }

  const posx = c.i32();
  const posy = c.i32();
  const posz = c.i32();
  const ang = c.i16();
  const cursectnum = c.i16();

  const numsectors = c.u16();
  const sectors: SectorType[] = new Array(numsectors);
  for (let i = 0; i < numsectors; i++) {
    const s: SectorType = {
      wallptr: c.i16(),
      wallnum: c.i16(),
      ceilingz: c.i32(),
      floorz: c.i32(),
      ceilingstat: c.i16(),
      floorstat: c.i16(),
      ceilingpicnum: c.i16(),
      ceilingheinum: c.i16(),
      ceilingshade: c.i8(),
      ceilingpal: c.u8(),
      ceilingxpanning: c.u8(),
      ceilingypanning: c.u8(),
      floorpicnum: c.i16(),
      floorheinum: c.i16(),
      floorshade: c.i8(),
      floorpal: c.u8(),
      floorxpanning: c.u8(),
      floorypanning: c.u8(),
      visibility: c.u8(),
      filler: c.u8(),
      lotag: c.i16(),
      hitag: c.i16(),
      extra: c.i16(),
    };
    sectors[i] = s;
  }

  const numwalls = c.u16();
  const walls: WallType[] = new Array(numwalls);
  for (let i = 0; i < numwalls; i++) {
    const w: WallType = {
      x: c.i32(),
      y: c.i32(),
      point2: c.i16(),
      nextwall: c.i16(),
      nextsector: c.i16(),
      cstat: c.i16(),
      picnum: c.i16(),
      overpicnum: c.i16(),
      shade: c.i8(),
      pal: c.u8(),
      xrepeat: c.u8(),
      yrepeat: c.u8(),
      xpanning: c.u8(),
      ypanning: c.u8(),
      lotag: c.i16(),
      hitag: c.i16(),
      extra: c.i16(),
    };
    walls[i] = w;
  }

  const numsprites = c.u16();
  const sprites: SpriteType[] = new Array(numsprites);
  for (let i = 0; i < numsprites; i++) {
    const sp: SpriteType = {
      x: c.i32(),
      y: c.i32(),
      z: c.i32(),
      cstat: c.i16(),
      picnum: c.i16(),
      shade: c.i8(),
      pal: c.u8(),
      clipdist: c.u8(),
      filler: c.u8(),
      xrepeat: c.u8(),
      yrepeat: c.u8(),
      xoffset: c.i8(),
      yoffset: c.i8(),
      sectnum: c.i16(),
      statnum: c.i16(),
      ang: c.i16(),
      owner: c.i16(),
      xvel: c.i16(),
      yvel: c.i16(),
      zvel: c.i16(),
      lotag: c.i16(),
      hitag: c.i16(),
      extra: c.i16(),
    };
    sprites[i] = sp;
  }

  const map: BuildMap = {
    version,
    start: { posx, posy, posz, ang, cursectnum },
    sectors,
    walls,
    sprites,
  };

  return map;
}

export type { BuildMap };
