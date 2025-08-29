**BUILD3JS**

- Purpose: A modern TypeScript + three.js reboot of the classic BUILD application (Duke Nukem 3D era) focused on reading BUILD .map files and visualizing them.
- Status: Initial scaffold with a wireframe wall renderer and BUILD .map parser. Drag-and-drop a .map to view sectors and walls in 3D.

**Dev Setup**

- Install: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`

Open the browser at the URL Vite prints (default: http://localhost:5173).

**Using The Viewer**

- Menu bar at top:
  - File → Open Map…: load a `.map` file
  - File → Open GRP…: load a `.grp` (e.g., `DUKE3D.GRP`)
  - File → Explore GRP…: open the GRP Explorer modal and pick a `.MAP`
  - Edit → Reset Camera: reframe the scene
- Drag-and-drop: drop a `.map` or `.grp` anywhere in the window.
- Camera: Orbit with mouse; use Edit → Reset Camera to reframe.
- Samples: See `references/eduke32/package/sdk/samples/` for `.map` files (e.g. `aspect.map`, `ror.map`, `startpos.m32` etc.).

Notes: `.m32` is an extended format for Mapster; the included parser targets classic BUILD `.map` structure. Start with `.map` samples.

**Structure**

- `src/main.ts`: App bootstrap, renderer, camera, file handling.
- `src/modules/build/mapParser.ts`: Binary parser for BUILD `.map` (version ~7/8).
- `src/modules/build/types.ts`: TS definitions mirroring BUILD structures.
- `src/modules/render/buildWireRenderer.ts`: Simple wall line renderer on XZ plane.
- `src/modules/grp/grpParser.ts`: Parser for BUILD GRP archives (DUKE3D.GRP).

**BUILD Map Parsing**

The parser reads:
- Header: version, start position (posx/y/z, ang), and current sector.
- Sectors: `numsectors` entries with floor/ceiling parameters.
- Walls: `numwalls` entries with geometry and topology (`point2`, `nextwall`, `nextsector`).
- Sprites: `numsprites` entries.

Values are read little-endian, following common DN3D-era `.map` layouts. Further validation and edge cases (e.g., different map versions) can be added as needed.

**Roadmap**

- Textured sector extrusion (ceiling/floor heights and slopes).
- Proper polygon assembly from sector wall loops (including concavity and portals).
- Sprite visualization (billboards), cstat filtering.
- GRP (`DUKE3D.GRP`) archive parsing and ART/TILE rendering.
  - Explorer UI to browse GRP maps is implemented; next step is ART/TILE decoding for textures and sprite art.
- Editor affordances inspired by Mapster/BUILD (grid snap, selection, transforms).

**References**

- `references/eduke32`: source materials and SDK samples for BUILD/EDuke32.
- `DUKE3D.GRP`: content pack for Duke3D (future GRP/ART loading).

**Serving a Built-in DUKE3D.GRP**

- Dev servers typically serve static files from `public/`. If you want the “Try built-in DUKE3D.GRP” button to work, place or copy your `DUKE3D.GRP` into `public/DUKE3D.GRP` so it is available at `/DUKE3D.GRP`.
