# What to add from Fab

All of this is free. Get it through the Fab window inside the Unreal Editor (Window > Fab) so it lands in the project directly. Quixel Bridge is not needed and no longer downloads.

## 1. Scanned surfaces (Megascans)

The whole Megascans library, about 23,000 scans, has been free on Fab since 5 November 2026 under Fab's standard licence. Seller page: https://www.fab.com/sellers/Quixel

`data/materials.json` gives a search phrase for every material slot in the kit (the `ms` field). The ones that carry the picture, in the order worth doing them:

| Slot in the kit | Search Fab for | Notes |
|---|---|---|
| `M_Asphalt` | worn asphalt, wet asphalt | Blend with snow using `textures/T_Ground_SnowMask.png` |
| `M_Snow`, `M_Ground_Yard`, `M_Bush_Snow` | fresh snow | "Fresh Snow" (2 × 2 m scan): https://www.fab.com/listings/6b239c80-a0e3-48a4-a9bd-fdbb47ad539e |
| `M_Snow_Ploughed` | dirty snow, slush | |
| `M_Cobble`, `M_Paving_Mosaic` | granite cobblestone | Hackescher Markt and the pavement edges |
| `M_Paving_Slab`, `M_Kerb_Granite` | granite paving slabs, granite kerb | |
| `M_Brick_Red`, `M_Brick_Yellow`, `M_Firewall_Brick`, `M_Viaduct_Brick` | old brick wall | Firewalls want the roughest, most patched one |
| `M_Plaster_*` (8 colours) | painted plaster wall | One surface, tinted per slot with the colour in the table |
| `M_Plaster_Weathered_*` | damaged plaster, stained render | |
| `M_Stucco_Light`, `M_Stone_Sand`, `M_Stone_Granite` | smooth plaster, sandstone, flamed granite | |
| `M_Roof_Tile`, `M_Roof_Slate`, `M_Zinc` | clay roof tiles, slate roof, zinc sheet | |
| `M_Shutter` | roller shutter, corrugated metal | Add graffiti decals |
| `M_Bark` | tree bark | |
| `M_Poster` | torn posters | Or decals over painted metal |

Decals worth pulling for the ground: snow footprints, tyre tracks, dirt paths, leaks and stains, graffiti. Fab's decal category: https://www.fab.com/category/decal/nature-terrain

Every surface in the kit has UVs in metres, so a 2 × 2 m scan needs a tiling of 0.5.

## 2. Cars

**City Sample Vehicles** (Epic Games): 13 driveable vehicles, saloon, coupe, SUV, hatchback, trucks, taxi, bus, delivery van. Licensed for Unreal Engine projects only. https://www.fab.com/listings/2909157b-ddfa-4cef-a925-69dc2467021f

Swap them in at the positions under `props` > `car…` in `layout/street_layout.json`, then put snow on them with the same snow material as the ground.

## 3. People and movement

- **Game Animation Sample** (Epic Games): the motion-matching character with 500+ motion-captured animations. This is the fix for stiff movement. Search Fab for "Game Animation Sample". A community listing of just its animations, retargeted to the UE5 mannequin: https://www.fab.com/listings/259f8545-f820-47b3-8fc1-e8ec5458214d
- **City Sample Crowds** (Epic Games): rigged city people built from MetaHumans, for the market and the street. Unreal Engine projects only.
- **MetaHuman Creator** is built into the editor and works on Mac since 5.7. Use it for the player and the faction bosses.

## 4. Shooter framework

**Lyra Starter Game** (Epic Games, on Fab and in the launcher's Samples tab): weapons, teams, bots, networking, UI. The plan is to take its shooting and replace its look and rules with SCHWARZSTART's, using the tables in `data/`.

## Not from Fab

- Music: ACE-Step 1.5 runs on Apple silicon, or use the free hosted version at acemusic.ai.
- The tram: there is no good free one. The kit's stand-in holds up at a distance; a proper one is a later job.
