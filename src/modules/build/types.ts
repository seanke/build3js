export type i8 = number;
export type u8 = number;
export type i16 = number;
export type u16 = number;
export type i32 = number;
export type u32 = number;

export interface SectorType {
  wallptr: i16;
  wallnum: i16;
  ceilingz: i32;
  floorz: i32;
  ceilingstat: i16;
  floorstat: i16;
  ceilingpicnum: i16;
  ceilingheinum: i16; // slope
  ceilingshade: i8;
  ceilingpal: u8;
  ceilingxpanning: u8;
  ceilingypanning: u8;
  floorpicnum: i16;
  floorheinum: i16;
  floorshade: i8;
  floorpal: u8;
  floorxpanning: u8;
  floorypanning: u8;
  visibility: u8; // classic: uint8 visibility
  filler: u8; // classic: uint8 filler
  lotag: i16;
  hitag: i16;
  extra: i16;
}

export interface WallType {
  x: i32;
  y: i32;
  point2: i16; // index of next wall vertex
  nextwall: i16;
  nextsector: i16;
  cstat: i16;
  picnum: i16;
  overpicnum: i16;
  shade: i8;
  pal: u8;
  xrepeat: u8;
  yrepeat: u8;
  xpanning: u8;
  ypanning: u8;
  lotag: i16;
  hitag: i16;
  extra: i16;
}

export interface SpriteType {
  x: i32;
  y: i32;
  z: i32;
  cstat: i16;
  picnum: i16;
  shade: i8;
  pal: u8;
  clipdist: u8;
  filler: u8;
  xrepeat: u8;
  yrepeat: u8;
  xoffset: i8;
  yoffset: i8;
  sectnum: i16;
  statnum: i16;
  ang: i16;
  owner: i16;
  xvel: i16;
  yvel: i16;
  zvel: i16;
  lotag: i16;
  hitag: i16;
  extra: i16;
}

export interface BuildMap {
  version: u32;
  start: { posx: i32; posy: i32; posz: i32; ang: i16; cursectnum: i16 };
  sectors: SectorType[];
  walls: WallType[];
  sprites: SpriteType[];
}
