export interface GrpEntry {
  name: string; // normalized uppercase name like E1L1.MAP
  size: number;
  offset: number; // byte offset in data after directory
}

export interface GrpArchive {
  signature: string; // should be 'KenSilverman'
  count: number;
  entries: GrpEntry[];
  get(name: string): GrpEntry | undefined;
  slice(entry: GrpEntry): DataView;
}

class Cursor {
  private view: DataView;
  private off = 0;
  constructor(view: DataView) { this.view = view; }
  get offset() { return this.off; }
  u8(): number { const v = this.view.getUint8(this.off); this.off += 1; return v; }
  i32(): number { const v = this.view.getInt32(this.off, true); this.off += 4; return v; }
  bytes(n: number): Uint8Array { const a = new Uint8Array(this.view.buffer, this.view.byteOffset + this.off, n); this.off += n; return new Uint8Array(a); }
}

function decodeAscii(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

export function parseGrp(view: DataView): GrpArchive {
  const c = new Cursor(view);
  const sig = decodeAscii(c.bytes(12));
  if (sig !== 'KenSilverman') {
    throw new Error(`Invalid GRP signature: ${sig}`);
  }
  const count = c.i32();

  const dirBytes = count * (12 + 4);
  const dirStart = c.offset;
  const dirEnd = dirStart + dirBytes;
  let dataOffset = dirEnd; // data starts immediately after directory

  const entries: GrpEntry[] = [];
  for (let i = 0; i < count; i++) {
    const nameRaw = decodeAscii(c.bytes(12));
    const size = c.i32();
    const name = nameRaw.replace(/\u0000+.*$/, '').trim().toUpperCase();
    const e: GrpEntry = { name, size, offset: dataOffset };
    entries.push(e);
    dataOffset += size;
  }

  const archive: GrpArchive = {
    signature: sig,
    count,
    entries,
    get(name: string) {
      const upper = name.toUpperCase();
      return entries.find(e => e.name === upper);
    },
    slice(entry: GrpEntry): DataView {
      return new DataView(view.buffer, view.byteOffset + entry.offset, entry.size);
    },
  };

  return archive;
}

