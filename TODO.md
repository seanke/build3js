**BUILD3JS Parity Plan**

- Goal: Reach functional parity with classic BUILD/Mapster32 editor while modernizing UX and platform (web, TypeScript, three.js). Preserve workflows BUILD users expect, but provide better discoverability, safety, and speed.

**Guiding Principles**

- Compatibility: Load/save classic `.map` faithfully; read assets from `.grp`/`.art`.
- Modern UX: Command palette, dockable panels, inspector, non-modal workflows, undo/redo, autosave.
- Performance: Large maps at 60fps with palette-correct rendering and fast picking.
- Extensibility: Scriptability and plugin hooks to replace/augment M32Script flows.

**User Stories**

- As a mapper, I open a GRP, browse maps, and load one to edit.
- As a mapper, I create a new map, draw sectors/walls, place sprites, and test geometry validity.
- As a mapper, I see an accurate textured 3D view with palette, shade, transparency, slopes, and sky parallax.
- As a mapper, I have a classic 2D top-down view with grid and zoom/pan; all classic hotkeys work or have modern equivalents.
- As a mapper, I tweak wall/sector/sprite properties via an inspector and use search/filter (cstat, lotag, hitag, picnum, text) to find things.
- As a mapper, I use undo/redo, autosave, and diff-friendly saves.
- As a mapper, I browse tiles (ART) and drag-drop to assign textures.
- As a power user, I run scripts/macros to batch-edit maps (modern alternative to M32Script).

**2D View**

- Navigation: pan (MMB/space+drag), zoom (wheel), zoom-to-fit/current selection.
- Grid: infinite grid with scale steps; toggle, spacing, snap strength, angle snap.
- Rendering: sector fills, wall lines with types (one-way/portal/masked) color-coded, sprite glyphs, start position/angle.
- Selection: click/box, multi-select, select-connected, select by filter; visible handles for verts/edges.
- Editing: draw sectors/walls (auto-close loops), insert/delete vertices, split/join walls, drag verts/edges with grid snap.
- Properties overlay: IDs, lotag/hitag, picnum, cstat bits; toggle overlays.
- Tools: measure distance/area, flip/rotate/mirror sectors, align textures in 2D context.
- Hotkeys: classic BUILD/Mapster mappings with modern customizable bindings.

**3D View**

- Navigation: orbit/fly (WASD + mouse), reset, focus selection.
- Texturing: ART/TILE + palette-correct shader, shade/pal/visibility; x/y panning and repeats.
- Geometry: floor/ceiling triangulation, wall quads, slopes via `heinum`, sector stacking visuals.
- Materials: masked walls, one-way walls, translucency, parallax skies.
- Sprites: billboard or wall/floor-aligned; clipdist visualization; bounding helpers.
- Picking: precise 3D picking of verts/walls/sprites with acceleration structures.
- Gizmos: translate/rotate/scale in 3D; snap; numeric input.
- Overlays: normals, bounds, sector/wall ids; toggles.

**Milestones**

- MVP
  - GRP explorer modal (done)
  - MAP reader (sectors, walls, sprites) (done)
  - 3D wireframe view with camera controls (done)
  - ART/TILE loader (palette, tiles) and basic tile browser
  - Textured floor/ceiling extrusion and wall quads (no slopes)
  - 2D top-down view with grid and selection
  - Selection + transform gizmos (move/rotate/scale), grid snap
  - Inspector panel (sector/wall/sprite common fields)
  - Undo/redo and autosave
  - New/Open/Save Map (save implemented; improve metadata/compat)

- Alpha Parity
  - Slopes: ceiling/floor `heinum`, ceiling/floor stat flags
  - Portals: `nextwall`/`nextsector` rendering, masked walls, one-way walls
  - Parallax skies and skybox
  - Translucency and correct palette shading in fragment shader
  - Sprite billboards (face, wall, floor-aligned), clipdist
  - Texture alignment: x/y panning, repeats, shade/pal per wall/sector
  - 2D tools: draw sectors, split/join walls, insert/delete vertices, drag verts
  - Tile browser with filters (by number/name), favorites, recent
  - Search panel: by cstat, lotag/hitag, picnum, text; highlight results
  - Classic hotkeys compatibility layer + customizable bindings
  - Map validator: orphan walls, unclosed loops, dangling portals, sector winding

- Beta Parity
  - ROR/SE effects visualization (as feasible without game code)
  - Sector effector helpers: visualize common patterns (elevators, doors)
  - Multi-viewport layout: 2D + 3D side-by-side, resizable, detachable panels
  - Prefabs and stamping
  - Batch ops: replace tiles, normalize shades, align textures across loops
  - Script API: modern JS-based macro system with sandboxing; import/export scripts
  - Mapster script compatibility layer (partial): import common macros and adapt
  - Performance passes: BVH/quadtrees for picking, instancing for sprites

**Core Systems**

- File I/O
  - `.grp` parser (done) and virtual FS overlay
  - `.map` reader (done) and writer (done) for classic versions (v7/v8); detect version and adapt
  - `.art` parser: headers, tile offsets, sizes; `palette.dat` reading
  - Export: safe-save and backup rotation; optional JSON sidecar for editor metadata

- Rendering
  - Palette-correct shader: indexed tiles → RGB via palette/lookup; shade/pal handling
  - Geometry builders: sectors as triangulated meshes, walls as quads; rebuild on edits
  - Slopes: per-vertex heights from `heinum`
  - Transparency and masked walls
  - Sky/parallax and visibility distance
  - Picking: raycast acceleration structures; hit test verts/walls/sprites

- Editor Views
  - 3D perspective: textured render, orbit/fly camera, gizmos, helpers
  - 2D top-down: infinite grid, zoom/pan, classic selection/dragging, wall loop visualization
  - Overlays: lotag/hitag/cstat badges, sector ids, start pos/angle

- Tools & Workflows
  - Draw walls/sectors; auto-close loops; hole/inner loop (sector within sector)
  - Vertex and edge editing; split/merge walls; flip and rotate sectors
  - Sprite placement and alignment modes (face/wall/floor), angle edit
  - Texture paint: click/drag to assign and align; numeric panning/repeats; shade/pal adjustments
  - Grid snapping levels; precision input fields
  - Selection: single/multi, box-select, select-by-filter, select-connected
  - Undo/redo with granular actions; timeline view

- UI/UX
  - Menu bar (done), command palette, keyboard shortcuts
  - Docked panels: Inspector, Tile Browser, Layers, Search, Scripts, GRP Explorer
  - Non-blocking modals, toasts for feedback, status bar details
  - Theme and accessibility (high contrast, font sizing)

- Search/Filter
  - By picnum/name, lotag/hitag, cstat bits, shade, pal, sector/wall ids
  - Live highlight in 2D/3D; jump-to results

- Validation
  - Geometry: closed loops, consistent point2 cycles, portal pairing, normal directions
  - Gameplay: start position valid, sprite sector ownership, common SE mistakes
  - Fix-it actions with previews

- Scripting/Automation
  - JS macro API: iterate sectors/walls/sprites, edit fields, create geometry
  - Command registration and UI contributions (panels, menu items)
  - Optional compatibility shim for common M32Script patterns

- Interop
  - Import from older/newer map versions where feasible
  - Export to JSON for external tools/testing; re-import roundtrip tests

**Modern Enhancements (beyond parity)**

- Command palette with fuzzy search (actions, tiles, entities)
- Autosave, crash recovery, and versioned backups
- Layering/grouping and hide/isolate
- Measurement tools and rulers; area/length display
- History timeline with scrub and annotations
- Multi-select property editing with diff preview
- In-browser diff of map saves; visual diff (geometry/props)

**Risks/Investigations**

- Exact palette/lookup reproduction in WebGL; accuracy against reference renderers
- Map version quirks across BUILD derivatives; need test corpus
- Performance on very large maps with many sprites; instancing strategies
- Sloped geometry triangulation stability
- Partial fidelity for engine-specific SE behaviors (beyond editor scope)

**Testing & Tooling**

- Unit tests: parsers (MAP/GRP/ART), serializers, geometry builders
- Visual tests: reference scenes with checksum screenshots (CI)
- Fuzzing for binary parsing (bounds, malformed files)
- Benchmarks: loading time, render FPS, picking latency

**Near-Term Next Steps**

- Implement ART/TILE + palette loaders and a basic tile browser panel
- Add textured sector/wall rendering (no slopes), respect x/y panning/repeats
- Add 2D top-down view, selection, and grid snapping
- Add undo/redo and autosave with a minimal action framework
- Keyboard shortcuts: new/open/save, reset camera, toggle 2D/3D, tile browser
