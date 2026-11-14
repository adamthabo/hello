# SCHWARZSTART · Berlin

A third-person cover shooter set in a frozen, blacked-out Berlin Mitte, playable in any browser on phone or desktop, with real online multiplayer. One Cloudflare Worker serves the game and runs the match server: every match room is a Durable Object that owns everyone's health, armour, kills, scores and respawns.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/adamthabo/hello/tree/schwarzstart/schwarzstart)

## Deploy

Press the button above, sign in to Cloudflare (the free plan works), keep the defaults and deploy. Cloudflare copies this folder into a new repository on your GitHub, creates the Durable Object, and redeploys on every push to that repository. The game then lives at `https://schwarzstart.<your-subdomain>.workers.dev`.

From a terminal instead: `npm install` then `npx wrangler deploy` in this folder.

## Playing with friends

1. Open the game, pick a mode on the title screen and type a room code (any word). Everyone who picks the same mode and room code is in the same match.
2. Or, once you are in, open the menu and press **Einladen** to send an invite link (`…/#duell/yourroom`).
3. Pick a name on the title screen; it shows over your head and in the kill feed.

| Mode | Players | What happens |
| --- | --- | --- |
| Kampagne | 1 | The full single-player campaign, saved on your device |
| Frei | up to 16 | Your own campaign with your friends visible in the same streets; no friendly damage |
| Duell | 2 | One against one around the Nikolaikirche, first to 7 kills, 6 minutes |
| Kiezkampf 4v4 | up to 8 | Two teams around Hackescher Markt, first team to 40, 10 minutes |
| Kiezkampf 4v4v4 | up to 12 | Three teams, first to 40 |
| Sperrzone | up to 16 | Everyone can shoot everyone, plus elite Garde units. Loot is contaminated until a drone lifts it out; it then lands in your campaign stash. Shooting someone who has not shot you makes you rogue for a minute, red on everyone's map |
| Kaltstart | up to 6 | Survival: one pistol, cold and hunger, fire barrels for warmth, depots for supplies, one fuse for the Fernsehturm transmitter, one life |

## How the netcode works

- Clients send their position and stance 15 times a second; the room streams everyone back 15 times a second and each client smooths and extrapolates the others.
- You shoot at other players where you see them; your client reports the hit and the server applies it if it is plausible (alive, in range, not spawn-protected, not a teammate, at most ~22 hits a second). Health, armour, regeneration, med kits, kills, scores, respawns (5 s) and match phases are decided on the server.
- PvP damage is normalised: base weapon damage, no gear or crits, the same 100 health and 150 armour for everyone.
- Computer-controlled enemies in Frei, Sperrzone and Kaltstart are simulated on each player's own device and are not shared between players.

## Files

- `worker.js` — the Worker (serves the game, `/server.json`, and `/ws` WebSockets) and the `Room` Durable Object
- `wrangler.jsonc` — Worker name, static assets, Durable Object binding and migration
- `public/` — the game itself (three.js, plain ES modules, no build step)

Local test: `npx wrangler dev`, then open `http://localhost:8787` in two browser windows.

Built with Claude. An original game; the map is hand-drawn from memory, not survey data. Photo-scanned materials from Poly Haven and ambientCG (CC0).
