import type { BuildMap, SectorType, WallType, SpriteType } from './types';

class Writer {
  private view: DataView;
  private off = 0;
  constructor(private buf: ArrayBuffer) {
    this.view = new DataView(buf);
  }
  get offset() { return this.off; }
  i8(v: number) { this.view.setInt8(this.off, v); this.off += 1; }
  u8(v: number) { this.view.setUint8(this.off, v); this.off += 1; }
  i16(v: number) { this.view.setInt16(this.off, v, true); this.off += 2; }
  u16(v: number) { this.view.setUint16(this.off, v, true); this.off += 2; }
  i32(v: number) { this.view.setInt32(this.off, v, true); this.off += 4; }
  u32(v: number) { this.view.setUint32(this.off, v, true); this.off += 4; }
}

function sizeofSector(): number { return 40; }
function sizeofWall(): number { return 32; }
function sizeofSprite(): number { return 44; }

export function serializeBuildMap(map: BuildMap): ArrayBuffer {
  const nsec = map.sectors.length;
  const nwal = map.walls.length;
  const nspr = map.sprites.length;
  const size = 4 + 4*3 + 2 + 2 + 2 + nsec*sizeofSector() + 2 + nwal*sizeofWall() + 2 + nspr*sizeofSprite();
  const buf = new ArrayBuffer(size);
  const w = new Writer(buf);

  w.u32(map.version);
  w.i32(map.start.posx);
  w.i32(map.start.posy);
  w.i32(map.start.posz);
  w.i16(map.start.ang);
  w.i16(map.start.cursectnum);

  w.u16(nsec);
  for (const s of map.sectors) writeSector(w, s);

  w.u16(nwal);
  for (const ww of map.walls) writeWall(w, ww);

  w.u16(nspr);
  for (const sp of map.sprites) writeSprite(w, sp);

  return buf;
}

function writeSector(w: Writer, s: SectorType) {
  w.i16(s.wallptr);
  w.i16(s.wallnum);
  w.i32(s.ceilingz);
  w.i32(s.floorz);
  w.i16(s.ceilingstat);
  w.i16(s.floorstat);
  w.i16(s.ceilingpicnum);
  w.i16(s.ceilingheinum);
  w.i8(s.ceilingshade);
  w.u8(s.ceilingpal);
  w.u8(s.ceilingxpanning);
  w.u8(s.ceilingypanning);
  w.i16(s.floorpicnum);
  w.i16(s.floorheinum);
  w.i8(s.floorshade);
  w.u8(s.floorpal);
  w.u8(s.floorxpanning);
  w.u8(s.floorypanning);
  w.u8(s.visibility);
  w.u8(s.filler);
  w.i16(s.lotag);
  w.i16(s.hitag);
  w.i16(s.extra);
}

function writeWall(w: Writer, ww: WallType) {
  w.i32(ww.x);
  w.i32(ww.y);
  w.i16(ww.point2);
  w.i16(ww.nextwall);
  w.i16(ww.nextsector);
  w.i16(ww.cstat);
  w.i16(ww.picnum);
  w.i16(ww.overpicnum);
  w.i8(ww.shade);
  w.u8(ww.pal);
  w.u8(ww.xrepeat);
  w.u8(ww.yrepeat);
  w.u8(ww.xpanning);
  w.u8(ww.ypanning);
  w.i16(ww.lotag);
  w.i16(ww.hitag);
  w.i16(ww.extra);
}

function writeSprite(w: Writer, sp: SpriteType) {
  w.i32(sp.x); w.i32(sp.y); w.i32(sp.z);
  w.i16(sp.cstat);
  w.i16(sp.picnum);
  w.i8(sp.shade);
  w.u8(sp.pal);
  w.u8(sp.clipdist);
  w.u8(sp.filler);
  w.u8(sp.xrepeat);
  w.u8(sp.yrepeat);
  w.i8(sp.xoffset);
  w.i8(sp.yoffset);
  w.i16(sp.sectnum);
  w.i16(sp.statnum);
  w.i16(sp.ang);
  w.i16(sp.owner);
  w.i16(sp.xvel);
  w.i16(sp.yvel);
  w.i16(sp.zvel);
  w.i16(sp.lotag);
  w.i16(sp.hitag);
  w.i16(sp.extra);
}

export function createNewSquareMap(): BuildMap {
  // Simple 1024x1024 square sector with 4 walls around origin.
  const walls: WallType[] = [];
  const size = 1024;
  const pts = [
    { x: -size, y: -size },
    { x:  size, y: -size },
    { x:  size, y:  size },
    { x: -size, y:  size },
  ];
  for (let i = 0; i < 4; i++) {
    const p = pts[i];
    const p2 = (i + 1) % 4;
    walls.push({
      x: p.x, y: p.y,
      point2: p2,
      nextwall: -1,
      nextsector: -1,
      cstat: 0,
      picnum: 0,
      overpicnum: 0,
      shade: 0,
      pal: 0,
      xrepeat: 8,
      yrepeat: 8,
      xpanning: 0,
      ypanning: 0,
      lotag: 0,
      hitag: 0,
      extra: -1,
    });
  }

  const sectors: SectorType[] = [
    {
      wallptr: 0,
      wallnum: 4,
      ceilingz: 0,
      floorz: 1024,
      ceilingstat: 0,
      floorstat: 0,
      ceilingpicnum: 0,
      ceilingheinum: 0,
      ceilingshade: 0,
      ceilingpal: 0,
      ceilingxpanning: 0,
      ceilingypanning: 0,
      floorpicnum: 0,
      floorheinum: 0,
      floorshade: 0,
      floorpal: 0,
      floorxpanning: 0,
      floorypanning: 0,
      visibility: 0,
      filler: 0,
      lotag: 0,
      hitag: 0,
      extra: -1,
    },
  ];

  const map: BuildMap = {
    version: 7,
    start: { posx: 0, posy: -2048, posz: 512, ang: 0, cursectnum: 0 },
    sectors,
    walls,
    sprites: [] as SpriteType[],
  };

  return map;
}

