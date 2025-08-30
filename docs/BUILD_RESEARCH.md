# BUILD Editor and Engine — In‑Depth Research

This document captures how the classic BUILD editor (“BUILD”, DOS era) and its modern successor Mapster32 (EDuke32 project) work: data model, file formats, editor workflows, rendering specifics, and common game conventions (Duke Nukem 3D). It serves as a reference for achieving feature parity in BUILD3JS while allowing modern UX improvements.

## Overview

- Creator: Ken Silverman (mid‑1990s). BUILD powered Duke Nukem 3D, Shadow Warrior, Blood, etc.
- Components:
  - BUILD engine: software renderer with palette + shade tables, “sector/wall/sprite” world model.
  - BUILD editor: 2D top‑down editing with a real‑time 3D preview mode; DOS UI and hotkeys.
  - Mapster32: maintained, Win32/SDL replacement editor with many quality‑of‑life features; largely authoritative for workflows and hotkeys today.

## World Model

BUILD maps comprise 3 primitive types with integer coordinates and indices:
- Sector: polygonal region (one or more loops), holds ceiling/floor heights, texture, shading, slopes, etc.
- Wall: directed edges forming loops. Each wall references `point2` (the next wall in loop). Portals connect walls between sectors via `nextwall`/`nextsector`.
- Sprite: billboards or oriented quads for entities; carry picnum, shading, palette, cstat flags, tags.

Coordinate system and units
- 2D plane uses integer grid coordinates in “BUILD units” (often 1 unit ≈ 1/16th of a tile). Z is vertical and also integer.
- Orientation convention (common in tools): X to the right, Y forward in 2D; in our Three.js mapping we typically use XZ plane for 2D and Y as up.
- Angles: 0–2047 (11‑bit), where 2048 equals 360°; 1024 is 180°.

Indices and connectivity
- Sectors reference `[wallptr..wallptr+wallnum-1]` as their primary outer loop (additional loops for holes tracked by wall topology and cstat).
- Walls reference `point2` to traverse loop; `nextwall`/`nextsector` define a portal pairing across a shared edge. `nextwall` is symmetric: if `walls[i].nextwall = j` then `walls[j].nextwall = i` and they have opposite directions.

## Core Data Structures (Classic Layout)

SectorType (40 bytes typical DN3D)
- `int16 wallptr, wallnum`
- `int32 ceilingz, floorz`
- `int16 ceilingstat, floorstat` (bitfields)
- `int16 ceilingpicnum, ceilingheinum`
- `int8 ceilingshade`; `uint8 ceilingpal, ceilingxpanning, ceilingypanning`
- `int16 floorpicnum, floorheinum`
- `int8 floorshade`; `uint8 floorpal, floorxpanning, floorypanning`
- `uint8 visibility, filler`
- `int16 lotag, hitag, extra`

WallType (32 bytes)
- `int32 x, y`
- `int16 point2, nextwall, nextsector, cstat`
- `int16 picnum, overpicnum`
- `int8 shade`; `uint8 pal`
- `uint8 xrepeat, yrepeat, xpanning, ypanning`
- `int16 lotag, hitag, extra`

SpriteType (44 bytes)
- `int32 x, y, z`
- `int16 cstat, picnum`
- `int8 shade`; `uint8 pal, clipdist, filler`
- `uint8 xrepeat, yrepeat`; `int8 xoffset, yoffset`
- `int16 sectnum, statnum, ang, owner`
- `int16 xvel, yvel, zvel`
- `int16 lotag, hitag, extra`

Map header
- `uint32 version` (e.g., 7, 8 typical DN3D era)
- Player start: `posx, posy, posz (int32)`, `ang (int16)`, `cursectnum (int16)`
- Counts: `numsectors (uint16)`, sector array; `numwalls (uint16)`, wall array; `numsprites (uint16)`, sprite array.

Notes
- Fields are little‑endian. Exact layouts vary slightly between games/versions; Mapster32 supports several.
- Tags (`lotag`, `hitag`, `extra`) are engine‑agnostic but games adopt conventions (see Duke3D below).

## Flags and Semantics

Wall `cstat` (bitfield; common bits)
- 1: Blocking (player/actor collision)
- 2: Swap bottom texture (one‑way) / “blocking 2D only” variants exist
- 4: Align wall to bottom
- 8: xflip texture
- 16: Masking (wall has “mask” middle texture)
- 32: One‑way (no backface) / hitscan behavior varies
- 64: Translucent (with translucency table)
- 128: Y‑flip texture
- 256: Block hitscan
- 512: Tile over/under etc. (variants depend on game)
Note: Exact mapping differs across games; consult EDuke32 headers for authoritative bit meanings.

Sector `ceilingstat`/`floorstat`
- 1: Parallaxed (sky)
- 2: Sloped (uses `heinum`)
- 4: Swap x/y panning alignment mode
- 8: Double‑smooshy (texture alignment quirks)
- 16: Masked/opaque variants (game‑specific)
- 32+: Additional bits control texture alignment behavior and visibility in some forks

Sprite `cstat`
- 1: Blocking
- 2: Translucent (type 1)
- 4: X‑flip
- 8: Y‑flip
- 16, 32: Alignment (face/wall/floor aligned)
- 64/128/256: Hitscan/collision modifiers
- Additional bits for visibility and drawing order

Slopes (`heinum`)
- `heinum` defines plane slope: higher magnitude = steeper. Plane equation derived from sector polygon and heinum. Sign chooses slope direction based on wall orientation.
- Editor typically provides slope toggle and sloping by dragging a vertex in 3D.

Texture addressing
- `picnum`: texture index (from ART tiles). `overpicnum` for walls’ top/bottom overlays.
- `xrepeat/yrepeat`: scaling factors (8 = 1.0 in some tools).
- `xpanning/ypanning`: integer pan offsets (wrap by tile size).
- `shade`: signed brightness offset. `pal`: palette variant.

Visibility and shading
- Software renderer uses palette lookup tables plus shade tables to darken/brighten and apply translucency. `visibility` at sector level affects distance fade.

## File Formats

GRP archive (KenSilverman)
- Header: 12‑byte ASCII signature `KenSilverman`, then `int32 fileCount`.
- Directory table: for each file, 12‑byte name (ASCII, zero‑padded), `int32 size`.
- File data: concatenated blobs in order; offsets are derived by summing sizes.
- Case: canonical names are uppercase in GRP.

MAP files
- See data structures above. Common versions 7/8 for DN3D era. Mapster32 can convert between versions.

ART tile files
- Multiple volumes (e.g., `TILES000.ART`, `TILES001.ART`, …). Each volume stores consecutive tile ranges.
- Header (typical):
  - `int32 numtiles` in this volume
  - `int32 localtilestart` (first tile index in this volume)
  - `int32 localtileend`
  - Arrays: `int32 tileWidth[numtiles]`, `int32 tileHeight[numtiles]`
  - Arrays: `int32 picanm[numtiles]` (bitfield: animation speed/frames/x/y offsets)
  - Pixel data: 8‑bit indices into a palette.
- Palette: separate `PALETTE.DAT` (or embedded elsewhere in ports). 256×3 RGB plus lookup/shade tables.

## Editor Workflows (Classic BUILD)

2D mode (primary editing)
- Draw sectors by placing walls (click to add vertices). Close loop to create sector.
- Split/Join walls; insert/delete vertices; move vertices with grid snap.
- Create portals by overlapping edges and pairing `nextwall` values (often auto‑paired by tool).
- Assign textures (picnum), panning/repeats; set shade/palette.
- Place sprites; set angle; choose alignment (face/wall/floor) via cstat.
- Edit tags (lotag/hitag) for game logic (doors, elevators, triggers).
- Grid zoom/pan; change grid size; toggles for overlays (IDs, tags, cstat).

3D mode (preview + some edits)
- Navigate in first‑person; paint textures by pointing; adjust shade/pan.
- Set slopes by dragging ceiling/floor.
- Visualize portals, masked walls, and translucent materials in engine style.

Selection and transforms
- Single/multi‑select of walls/sectors/sprites; drag to move; rotate/scale sectors; flip/mirror.
- Box select in 2D; focus selection; copy/paste (Mapster32 supports advanced paste modes).

Undo/Redo
- Original BUILD had limited undo. Mapster32 adds robust undo/redo stacks.

Hotkeys (typical patterns; Mapster32 defaults vary)
- Toggle 2D/3D: Enter or Tab
- Grid size cycling: G; toggles/snap modifiers with Shift/Ctrl
- Insert/Delete points: I/Del; split walls: S; join sector loops: J
- Texture ops: alignment/panning with arrow keys + modifiers
- Shade ±: +/-; palette cycle: P; slope tools: [ ] and Alt/Shift variants
- Search/filter dialogs in Mapster32; classic BUILD relied more on manual selection

## Game Conventions (Duke3D)

Tags (lotag/hitag) and effects
- Duke 3D defines many tag meanings (engine agnostic but game specific). Examples:
  - Sector Effectors (sprite picnum SECTOREFFECTOR): `lotag` identifies effect type (e.g., 0: rotating sector, 10: door, 15: elevator), `hitag` often channel/group.
  - Activators/Locks: channel control for triggers.
  - Respawns, ambient sounds, switches, mirrors, water etc.
- These are editor‑visible via props and often supported by helper overlays in Mapster32.

Masked/one‑way walls and portals
- Masked walls have a middle texture shown when `cstat` bit set; can be translucent.
- One‑way walls render only front side; portals connect two sectors to allow visibility and player traversal.

TROR/ROR
- Classic BUILD lacks true overlapping room stacks; games fake ROR via portals/mirrors. EDuke32 adds TROR (true rooms over rooms) as an extension (extra ceiling/floor stacks) managed in Mapster32.

## Rendering Details (Software Engine)

Palette and shade tables
- Colors are 8‑bit indices; shade tables darken/brighten by index remapping; translucency uses lookup tables to blend indices.
- `shade` shifts through shade table; `pal` selects an alternate palette row (e.g., water, night vision).

Wall/floor/ceiling texturing
- Walls: vertical spans with picnum; `xrepeat/yrepeat` scale; `xpanning/ypanning` offsets; top/bottom textures for upper/lower wall segments relative to adjacent sector heights.
- Floors/ceilings: planar mapping based on world coordinates; slopes require per‑vertex height calculation.

Z/height conventions
- Ceiling Z ≤ floor Z; player start z is eye height relative to floor; units are consistent across sectors.

## Map Validity and Common Errors

- Unclosed loops or mis‑ordered point2 chains.
- One‑sided portals (nextwall set only on one side) or mismatched pairs.
- Overlapping sectors without portals (z‑fighting/undefined behavior).
- Incorrect winding causing inverted slopes or render anomalies.
- Sprites outside sector bounds or with invalid statnum/sectnum.

## Map Versions and Compatibility

- DN3D era: versions 7/8; Mapster32 understands and converts between formats.
- Ports (EDuke32/Mapster32) add features like TROR, extended limits, additional cstat bits.
- For parity, target v7/8 read/write and gracefully ignore unknown extras; consider an internal JSON sidecar for editor metadata.

## What We Should Replicate (Parity Targets)

Data fidelity
- Exact parsing/writing of MAP v7/8 (sector/wall/sprite), GRP, ART, PALETTE.
- Correct slope math (`heinum`), texture addressing, and shade/palette behaviors.

2D editor
- Full loop/vertex editing, insert/delete/split/join; 2D selection; grid tools; overlays.
- Tag and cstat editing with bit inspectors.

3D editor
- Palette‑correct textured rendering; masked/translucent walls; slopes; sky parallax; sprites with billboarding and alignment modes.
- Texture paint (picnum assignment, panning, repeats), slope manipulation, shade adjustments.

Utilities
- Map validation and fix‑it tools; search/filter; tile browser; prefabs/stamps.
- Undo/redo and autosave; keyboard‑first workflows with customizable bindings.

## Modernizations (Proposed)

- WebGL shaders: implement palette + shade + translucency via textures and LUTs for pixel‑perfect look, with an optional PBR preview for modders.
- Dockable UI with inspector, command palette, and inline property editing; non‑modal workflows instead of blocking dialogs.
- Safer save with backups/versioning; visual diffs of map changes.
- Scriptable extensions in JS/TS replacing M32Script; plugin system for game‑specific helpers (e.g., Duke3D SE wizards).
- Multi‑viewport layouts (2D+3D side by side); snapping gizmos; measurement tools.

## References (Suggested Source Material)

- EDuke32/Mapster32 source: sector/wall/sprite definitions, cstat/estat bits, TROR extensions.
- Duke3D/Shadow Warrior documentation and community wikis for tag conventions.
- Ken Silverman’s BUILD documentation and palette/shade tables description.

## Implementation Notes for BUILD3JS

- File I/O: Completed GRP and MAP read; add ART/PALETTE parsing next. Maintain a virtual FS for GRP contents.
- Rendering: Start with wireframe (done), then textured walls/floors; implement palette LUTs and shade tables on GPU; add masked/translucent walls and sky.
- Geometry: Build sector meshes by triangulating loops; respect portals for proper visibility and selection; compute sloped plane heights per vertex.
- Editor: Add 2D view first (grid, selection, wall drawing), then 3D textured view; keep UX keyboard‑first with modern affordances.

