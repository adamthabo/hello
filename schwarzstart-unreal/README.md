# SCHWARZSTART · Berlin — Oranienburger Straße street kit for Unreal Engine 5.8

One real stretch of Berlin Mitte at winter dusk, built at true scale from the game's own map data and ready to import into Unreal. It is the "look test" from the plan: a small place, done properly, before the game is rebuilt around it.

**The pictures in `previews/` are path-traced stills of this kit made in Blender. They are not Unreal.** They show the models, the layout and the mood being aimed for. In Unreal the flat colours get replaced by scanned surfaces from Fab, which is where the photographic look comes from.

## What is in the street

- Oranienburger Straße from Große Hamburger Straße to Hackescher Markt: 182 m, 22 m between the house fronts, tram tracks down the middle, the Fernsehturm on the axis.
- 53 buildings from the map's lot records (frontage, depth, eaves height, floors, style, seed). 44 lots plus 9 chamfered corners. Four styles: stucco Altbau, stripped Altbau, brick, 1990s stone infill. Windows are real openings with reveals, frames, glass, curtains and a room behind. Cornices, pediments, sills, balconies with railings, rusticated ground floors, shopfronts, roller shutters, house doors, carriage gates, signs with raised lettering, Berlin roofs with firewalls, chimneys and dormers.
- Ground: carriageway, granite kerbs, pavements, the cobbled plaza, yards, park, tram rails, ploughed snow along the kerbs, and a top-down mask of where snow has been driven or walked away.
- Set dressing: the dead tram, snowed-in cars, a barricade (road barriers, sandbags, crates, fire barrels, a work light on a generator), a black market on Hackescher Markt (stalls, strings of bulbs, fire barrels), two light beams into the sky at the mission and the safehouse, street lamps, advertising columns, utility cabinets, bollards, park fence, bare lime trees, snow-covered shrubs, overhead tram wires.
- Backdrop: the S-Bahn viaduct, the Fernsehturm, and block massing for every lot within about 560 m, from the same map.

562,914 triangles in 88 meshes, 111 material slots.

## Files

| Path | What |
|---|---|
| `meshes/SCHWARZSTART_OranienburgerStr.glb` | The whole street, every mesh already in place (35 MB). This is the one file Unreal needs. |
| `meshes/props/*.glb` | The 35 reusable props on their own, each around its own origin. |
| `layout/street_layout.json` | Where everything is, in Unreal centimetres: buildings with their doors, every prop instance, every light, camera bookmarks, player start, sun direction, mesh bounds. |
| `unreal/build_street.py` | Editor script: imports the GLB, builds the level, lights it. |
| `data/materials.json` | Every material slot: colour, roughness, metallic, glow, and what to search for on Fab to replace it. |
| `data/DT_*.json` | The game's rules as tables: weapons, factions, enemy types, rarities, perks, gear, networks. |
| `textures/T_Ground_SnowMask.png` | Top-down snow mask for the whole scene (R snow cover, G slush, B wet bare ground). |
| `previews/*.jpg` | Six stills. |
| `FAB_LIST.md` | The free packs and scans to add. |
| `src/` | The generators (Python, Blender 5.3 as a module). |

## Getting it into Unreal

1. Make a new project in Unreal 5.8: Games > Blank, Blueprint, Desktop, Maximum quality, no starter content. Put this folder inside the project folder, next to the `.uproject`.
2. Tools > Execute Python Script… > `unreal/build_street.py` from this folder. It imports the GLB into `/Game/Schwarzstart/Street`, makes the level `L_OranienburgerStr`, places the 88 meshes, and adds sun, sky, fog, lights, a player start and four cameras.
3. Right-click `Cam_street_west` in the Outliner > Pilot. That is the first still.

If the script trips on the import step: drag the GLB into the Content Browser, keep the defaults, Import All, then run the script again. It skips the import when the meshes are already there. If it reports that meshes are "not where the layout expects them", use File > Import Into Level with the same GLB instead.

Positions are baked into the meshes, so every actor sits at 0, 0, 0 with no rotation. X is east, Y is south, Z is up, and the origin is the middle of the street.

## Mac setup

**Xcode.** Unreal 5.8 needs Xcode 26.0 at least. Epic recommends 26.1.1 and says 26.4 does not work with the engine; their staff give 26.3 as the newest that does. The Mac App Store only offers the newest Xcode, so take 26.1.1 from Apple's developer downloads (developer.apple.com/download/all, free Apple account).

| Your macOS | Xcode to install |
|---|---|
| Sonoma 14.5 to Sequoia 15.5 | Update macOS to Sequoia 15.6 or newer first. Xcode 26 does not run below 15.6. |
| Sequoia 15.6 or newer, or Tahoe 26 | Xcode 26.1.1 |

Open Xcode once after installing so it finishes its own setup, then start Unreal.

**Hardware.** Epic's minimum is 16 GB memory; they recommend an M3 with 32 GB. Lumen runs on any Apple-silicon Mac. Nanite and Virtual Shadow Maps need an M2 or newer and are marked beta on Mac. This kit does not depend on Nanite: the whole street is about half a million triangles.

**Letting Claude drive the editor.** Unreal 5.8 has Epic's own experimental MCP plugin.

1. Edit > Plugins: enable **Model Context Protocol** and **All Toolsets**, restart the editor.
2. In the console (the `` ` `` key): `ModelContextProtocol.StartServer`
3. Then: `ModelContextProtocol.GenerateClientConfig ClaudeCode` — this writes `.mcp.json` into the project folder, pointing at `http://127.0.0.1:8000/mcp`.
4. Open Claude Code in the project folder. Epic's guide: dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor

Not confirmed: whether this plugin works on macOS. Epic's page does not say. If it does not, the fallback is Unreal 5.7 with the UnrealClaude plugin, whose Mac guide was tested on an M4 Max.

## Checked, and not

Checked here:
- The scene GLB re-opens with the same 88 mesh names, 111 materials and 562,914 triangles, and every mesh has UVs.
- Face direction: rendered from ten camera positions with back faces painted red. 0.1 % or less of any frame is red (thin wires and railings). Before the fix, the tram, the cars and a roof parapet strip were inside-out.
- `build_street.py` runs to the end against a stand-in for Unreal's Python module, places 88 meshes and finds every key it reads in the layout file. That tests the script's own logic, not Unreal.
- The six previews were rendered from this exact geometry.

Not checked:
- **Nothing here has been opened in Unreal.** There was no way to reach a Mac from the session that built it.
- The axis mapping assumes Unreal's glTF importer turns glTF (x, y, z) into Unreal (x, z, y) × 100. The script compares each mesh's bounds with the layout and says so if that is wrong.
- Collision. The importer's defaults will apply. Buildings and the ground want simple or per-face collision set after import.
- Frame rate on the Mac.

## Known gaps

- Materials arrive as flat colours with the right names. The scanned surfaces are the next sitting (see `FAB_LIST.md`).
- Cars and the tram are stand-ins good enough from the middle distance. Replace the cars with City Sample Vehicles.
- No people, no animation, no gameplay, no sound. This is the place, not the game.
- Shop names are invented. The street layout follows the game's map, which follows the real street only roughly.
- Courtyards behind the fronts are empty.
- The backdrop is plain block massing with gaps between the lots. It is there for the skyline, not for close-ups.

## Rebuilding the kit

`src/` holds everything: `mb.py` (mesh builder), `facade.py` (buildings), `ground.py` (street surfaces and snow mask), `props.py`, `palette.py` (materials), `assemble.py` (reads the map, places everything), `export_glb.py`, `render.py` and `post.py` (previews), `check_winding.py`. They need Python 3.13 with `bpy` 5.3, `shapely`, `mapbox-earcut`, `numpy`, `scipy`, `OpenEXR`, `Pillow`. Paths inside the scripts point at the machine that built them and at the game's `map.json`; change them at the top of each file.

## What the kit is made of

All geometry was generated by the scripts in `src/` from the game's map data. No third-party models or textures are inside the GLB files. The preview stills use the game's own CC0 ground textures. Sign lettering is Blender's built-in font converted to meshes. The title, factions and names are the game's own; nothing is taken from any existing game.
