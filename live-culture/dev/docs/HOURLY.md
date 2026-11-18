# The hourly runs

On 16 Nov 2026 at 21:18 (New York) the owner wrote: "Work on this hourly it's getting better and better". Every hour a run makes
one real improvement, tests it the whole way, and ships it to both places he looks: the artifact (in the Claude app on his iPhone)
and his site (`live-culture.adamthabo.workers.dev`, deployed by Cloudflare on every push to `main` of `adamthabo/live-culture`).
Nobody answers questions during a run: decide, write down what you decided, carry on.

## 0. How the hours keep coming

The runs happen in the conversation where he asked, one turn an hour: each turn **first** schedules the next with a one-shot
message an hour later (`send_later`, `initiation: "human_request"`, the same text), then does its work. A message that falls due
while a turn is still working waits for it, so two runs never overlap, and he sees each hour's work in that chat. If he says stop,
cancel the pending message (`delete_trigger` with its id) and schedule no more. (The artifact's database cannot hold a lock: it is
shared publicly, and its data can then only be changed from its own page.)

## 1. Set up

**In the session that set this up**, everything is in place: the source in `/home/claude/hello/_work/lc2` (`src/`, `tools/`,
`docs/`, `build.py`, the build in `app/` and `hosted/`), the Worker in `/home/claude/hello/_work/cf/live-culture`, the stand-in
site's pictures in `/home/claude/hello/_work/testdata`, the two repositories in `/home/claude/live-culture` and
`/home/claude/hello`; `sh /home/claude/hello/_work/stage_pub.sh` stages the artifact's files in `lc2/_pub`, and
`sh /home/claude/hello/_work/sync_repos.sh` copies everything into both repositories. Start the servers if they are down:
`cd lc2 && nohup sh tools/serve.sh >/tmp/serve.log 2>&1 &` (8757) and `nohup node tools/hostmock.mjs >/tmp/hostmock.log 2>&1 &` (8758).

**In a fresh session:**
1. Get both repositories with push access (the `add_repo` tool, `access: "push"`, then the clone command it gives):
   `adamthabo/live-culture` (the source of truth: the page's source in `dev/`, the site in `public/` and `worker.js`) and
   `adamthabo/hello` (a mirror in its `live-culture/` folder: the Deploy button in the site's README points there). A shallow clone
   (`--depth 1`) of `hello` is enough. Never touch anything else in `hello` (its `edge-desk/` folder is another project), and never
   push to `adamthabo/edge-desk`.
2. `cd live-culture/dev && sh tools/fresh.sh`: puts the page's pictures, sounds, data and fonts where the build and the tests look,
   installs the tools' two packages, fetches the stand-in site's sources from their GitHub mirrors (`tools/feed.py`), fetches
   DeepStateMap's latest front, builds, packs the site and starts both servers (8757: the page; 8758: the stand-in site). It ends
   `FRESH OK` (about half a minute on 16 Nov).

## 2. Read before you change anything

- `dev/docs/README.md`: "Hard rules" (every numbered rule; they are his words and decisions, the newest last), then "What the page
  is", "Architecture" and "Hosted version". The CHANGELOG's "For the owner" entries say what he asked for and when.
- `dev/docs/ROADMAP.md`, and this file's backlog and log (below).
- If you have a tool that searches the owner's past chats, search for "Live Culture" since the last log line's time: anything new
  he has said about it comes first, before the backlog.

## 3. Choose one thing

Take, in this order: anything a previous run logged as broken; then anything new from the owner; then the first backlog item not
marked done. One thing, done properly and seen working, beats three half-done. Size it to build in about fifteen minutes: the tests
take most of the hour.

### Never, in a run

- Break rule 1 (no horns, saxophone, trumpet-like, blown, bowed or held sound, nothing loud, no harp) or take his band's nine stems
  out. Since 17 Nov, 16:59 (README rule 24) the music itself is open: new instruments, loops, modes, mixes and levels are fine, with
  `t_levels.js` passing.
- Put up words nobody asked for: since rule 24 words may go anywhere, but only when something the person did asks for them.
- Bring back what he took away: the wind, Smoke's name or its explanation, undo, a row of controls that scrolls sideways, knobs,
  decks, pads, tiles.
- Take away anything he asked for, or add controls beyond the few named ones (every new control needs a name, a reason and room on a
  390-wide phone).
- Put anything about him on the page or the site; use the "↗" arrow or any external-link icon; add an outside resource the artifact's
  rules refuse.
- Create, change or delete scheduled tasks (this one included), change who can see the artifact, or message anyone.
- Touch any other artifact (above all "A. Thabo") or any other repository.
- Publish or push anything red.

## 4. Make it, then look at it

Work in `dev/src/` (and `worker.js` for the site's sources). Look at what you made: screenshots at 390×844 and at 390×750 (the
artifact's height in the Claude app on an iPhone), read with your image viewer. Add or change tests for what you changed, in the
tests that already cover that world.

## 5. Test, the whole way (about forty minutes)

1. `sh tools/check.sh all` must end `ALL CHECKS PASSED` (it includes `t_levels.js`, which must print `LEVELS PASSED`).
2. `sh tools/pack_hosted.sh`; restart the stand-in site (`pkill -f "node tools/hostmock.mjs"; node tools/hostmock.mjs &`);
   `node tools/t_hosted.js` must end `HOSTED OK`.
3. The bytes the artifact will serve: `app/published.html` = the skeleton (`SK` in `build.py`) + `app/index.html` + `</body></html>`,
   then `node tools/t_published.js` must end `PUBLISHED OK`; delete `app/published.html`.

If something fails and you cannot fix it within the hour, ship nothing: put the source back as it was, log what failed, stop.

## 6. Ship

(In the session that set this up, first `sh /home/claude/hello/_work/sync_repos.sh`, which copies the source, the packed site and
the Worker into both repositories, and `sh /home/claude/hello/_work/stage_pub.sh`, which stages the artifact's files in `lc2/_pub`;
then the steps below in `/home/claude/live-culture` and `/home/claude/hello`.)

1. **Site.** In `live-culture/`: `git add -A` (the `.gitignore` keeps the build, the fetched data and the screenshots out), commit
   with a plain one-line message and the attribution lines your session gives, `git pull --rebase`, `git push origin main`. If the
   rebase conflicts, abort it, ship nothing, log it. Then wait for Cloudflare's check run on the commit:
   `gh api repos/adamthabo/live-culture/commits/<sha>/check-runs` until "Workers Builds: live-culture" is `completed success`.
2. **Mirror.** Copy `dev/`, `public/`, `worker.js`, `wrangler.toml`, `package.json`, `README.md` into `hello/live-culture/`
   (rsync with `--delete` for `dev/` and `public/`, leaving out what `.gitignore` names), commit, push.
3. **Artifact** (slug `b3d5b676-6ebb-4b17-9c42-d1edec6aeebd`; it is shared publicly, so every publish passes `shared_live: "public"` and
   `artifact_title: "Live Culture"`). List its files (`list_files`) and compare their sha256 with yours: `index.html` is
   `dev/app/index.html`; `dev/README.md`, `dev/CHANGELOG.md`, `dev/ROADMAP.md`, `dev/REFERENCES.md`, `dev/HOURLY.md` are
   `dev/docs/*`; `dev/src/*`, `dev/tools/*`, `dev/build.py` are themselves; `data/*.json` are `dev/app/data/*`. Publish only those
   that differ, in one `publish_files` call (mode `patch`, absolute paths, `base_version` = the version listed). A `.sh` file goes by
   `edit_version` with `path` (publish_files refuses it); a new `.py` cannot go at all (it lives in the repositories only). Never
   publish `app/local.html`, `app/_fonts`, `app/_check.js`, `shots/`, `data/live/`, `testdata/`, `raw/`, `wav/` or any test photo.
   If the publish is refused because the version moved, list again and retry once. Then list again and check the hashes match.
   **If the publish waits for an approval** (since the night of 16 Nov a publish asks the owner first) and he is not there to give it,
   do not ask again every hour through the night: ship to the site and the repositories, say in the log that the artifact is behind,
   and publish everything that has gathered in the first run after 08:00 New York time or as soon as he writes. One publish brings the
   artifact up to date. (17 Nov: by day too the approval closed unanswered three times running when a message of his arrived. When
   the last try closed so, do not ask again until he says to publish: the site and the repositories carry each run meanwhile.)

## 7. Write it down

- `dev/docs/CHANGELOG.md`, at the top of "For the owner": the date and hour (New York) and one or two plain sentences of what he
  will see or feel, in his terms (no file names). Under the technical part: what changed, in which files, how it was tested.
- This file's log (below): one line, newest last: `<date hour> <what> (backlog item n done)` or why nothing shipped.
- Publish the docs with the rest (they are part of the same commit and the same publish).
- End with two or three plain sentences for the owner: what changed and where to look.

## Backlog (one a run, top first; mark each done in the log)

1. **The Claude app's height.** Every world at 390×750 and 375×667: read the screenshots, fix anything cut off, overlapping or hard
   to tap (the zoom buttons, the camera window, the cards, Paint's tank and tools, the worlds' rail).
2. **Fewer lenses when far.** With the whole Earth in view the cameras' lenses crowd and hide each other: show the fourteen most worth
   seeing spread over the globe, more as he comes closer; every shown lens still opens its camera at the first tap.
3. **The satellites, more fun** (his words, 15 Nov: "Even just the satellites moving is more fun"): the space stations and the
   telescopes as their own small marks with a short glowing trail; following one when tapped, as now, and letting go with a tap.
4. **Storms that turn.** Each storm's spiral turning with its winds, faster for stronger storms, its track behind it when the data has one.
5. **The front line alive.** The war zones' front drawn as a slowly marching line, and the blackouts dimming and brightening slowly,
   so both read at a glance on a phone.
6. **Fires up close.** Coming close, the biggest fires flicker as small flames rather than dots.
7. **Mix with the beat.** The buttons that are playing pulse with the bar (light only, the sound untouched), the mode's colour
   faintly over the screen.
8. **Paint's rounds.** A ring that drifts slowly in the later rounds (ROADMAP 2), tuned with `t_smoke.js` so a bot still fills it.
9. **Smooth on a phone.** Measure each world's frame time headless (`t_fps.js`, `t_cpu.js`), find the costliest drawing in the
   busiest (the Earth with every layer on) and make it cheaper without changing what it looks like.
10. **No flaky tests.** Run the whole suite twice; make any test that failed once robust (as `t_lock.js` and `t_published.js` were
    on 16 Nov), never by loosening what it checks.

After the backlog: take the most visible flaw you can find in screenshots of every world at both sizes, and fix it. Since 17 Nov,
16:59 (rule 24) the music and prompted words are open as well: a run may make the music sound better (how the loops sit together,
a new struck instrument, a mode that grooves harder) or let what a tap answers say more. Never pad the page with features he did
not ask for.

## Log

- 2026-11-16 21:30: set up (this file, `tools/fresh.sh`, `.gitignore`, `dev/fonts/`, `dev/testdata/` in the repository); a
  fresh clone set itself up with `fresh.sh` and passed `test_astro.js`, `t_first.js` and `t_hosted.js`. First run: 22:36 (one-shot scheduled message trig_01TqYMnTS23rkNCyz71Vhf7q; each run schedules the next).
- 2026-11-16 22:36: the card takes its touches (its YouTube button had never worked for a finger), the site's kinds of camera fit one
  row, the zoom steps aside for a tall card, the words give way to a card that reaches them, tonight's data (backlog item 1 done).
- 2026-11-16 23:38: fewer lenses, spread out, when the Earth is far (backlog item 2 done); a tap timed from when the page takes it
  (the site test's camera tap had failed three times running on a slow frame). The first run's artifact publish had waited for an
  approval that never came; it goes with this one.
- 2026-11-17 01:49: the space stations and the telescopes as marks with trails (backlog item 3 done). The artifact's publish of
  runs 1 and 2 waited for an approval again at 00:56 and was closed unanswered: the artifact is behind the site by runs 1 to 3; the
  first run after 08:00 publishes them together.
- 2026-11-17 02:51: a storm's wheel by its strength (backlog item 4 done but for the track behind it: no data has one this week);
  the tests found taps taken by the wrong thing (a Starlink for Tiangong's mark, a telescope for a storm): fixed, so the run went on
  into the 03:52 hour, shipped at 04:2x. Artifact still behind (runs 1 to 4), for the morning.
- 2026-11-17 05:07: the front marches, the blackouts breathe (backlog item 5 done). Artifact still behind (runs 1 to 5).
- 2026-11-17 06:10: the big fires as flames up close (backlog item 6 done). Artifact still behind (runs 1 to 6); 08:00 is next.
- 2026-11-17 07:14: Mix with the beat (backlog item 7 done). Artifact still behind (runs 1 to 7): the 08:15 run publishes them.
- 2026-11-17 08:20: the artifact caught up: runs 1 to 7 published together as 1794923329-2956 (his approval came at 08:48), hashes
  checked. No new piece this hour: the publish took it.
- 2026-11-17 09:21: Paint's later rounds: from round 9 one of the two rings goes slowly round a loop (9 to 11 s a lap, its way
  drawn faintly), kept in bounds, off its vent's column and off the wall; a following finger fills it in one push (backlog item 8
  done). Also: a quick tap on a wall is timed by `held()`, as the lenses are. The first full run failed (the finger was dealt a wall
  between the vent and the loop), so the test now deals round 9 until the loop's vent reaches it straight. The second failed in
  `t_lock.js` (the hint's first tap counted late on a slow page): now counted from the page's own frames, and the hint's tap can no
  longer fall between two slow frames. Shipped after the third. This run ran long: the 10:22 run's message waited for it.
- 2026-11-17 10:22, 11:30, 12:39, 13:41: no new piece. Run 9 was still testing at 10:22 and shipped to the site at 11:46 (commit
  2a9e778, Workers Builds success); its artifact publish was asked twice (12:40, 13:42) and each time the approval closed
  unanswered when a message arrived. The artifact is behind from run 9: publish everything gathered when he can approve.
- 2026-11-17 14:43: how hard each world works a phone, measured (backlog item 9 done): the page's own work is under 1% of a frame
  with every Earth layer on; the rest is the GPU, which the governor already meets; nothing changed in the drawing. `t_cpu.js` and
  `t_fps.js` read the number of worlds again. The suite failed on the round-9 finger (3 pushes, nothing): the loop could sit over
  another colour's stream. Fixed in the game (an outer colour, off every column) and the finger now tried in a calm tank.
- 2026-11-17 16:24: the run of 14:43 shipped to the site (commit 5649353, Workers Builds success): the looping ring kept off every
  stream, the finger tried in a calm tank, `t_cpu.js` and `t_fps.js` fixed. Its artifact publish (runs 9 and 10 together) closed
  unanswered again when a message arrived: the third time. No more asking each hour: the artifact waits until he says to publish.
- 2026-11-17 16:52: no flaky tests (backlog item 10 done): the whole suite three times on the shipped code: passed; failed once in
  `t_play.js` (Mix's dub waiting for the bar, read from outside too late), made robust with a watch in the page; passed.
- 2026-11-17 17:54: he switched this chat to Auto ("Ok you're on auto!"): publishes no longer wait for an approval, so the
  artifact catches up with this run. He asked for drastic, fun music (a metronome-like view of the beat broken down; wild,
  good-sounding, melodic sounds played in time for experimenting) and for Paint slower and more viscous: the next runs' work.
- 2026-11-17 16:59: he opened the music and prompted words to the runs (README rule 24; the never-list above and the scheduled
  message changed with it). The A. Thabo artifact, Edge Desk and the green suite stay.
- 2026-11-17 17:54: Paint thick and slow while painting freely (his 17:54 ask): a viscosity pass, more damping, fewer curls, slower
  time and rising; the game's water untouched. Next: the music (a metronome view of the beat; wild, melodic sounds played in time).
- 2026-11-17 18:57: Beat, a fourth world (his 17:54 ask): the bar as a metronome's face with what plays broken down inside, eight
  rings of pitch outside to put notes on in five sounds, dice and clear; `t_beat.js` in the suite; the loudness test measures it.
- 2026-11-17 19:44: his look at Beat ("not interactive"; world buttons off the music pages; videos he thought he had uploaded never
  arrived: asked again): Beat's rings and middle answer a touch, the music comes on with a touch, notes heard in time; the worlds
  tucked behind a handle in Mix and Beat (README rule 26).
- 2026-11-17 21:02: a ring held in Beat: a mode's instrument to its other loop (the classic beats' busier ones), a band player alone
  and back; a tap as before (no new word from him since 19:44; his videos still not here).
- 2026-11-17 22:04: a finger kept on Beat's rings plays its pitch on every sixteenth (two at most), the loudness test measuring it.
