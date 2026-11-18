# Live Culture: working notes

Live Culture is a published Claude artifact: three worlds to play in (Paint, Earth, Mix; Paint was called Smoke until 15 Nov), with one band playing under all of them
(since 15 Nov in one of five modes: funky, African, bluesy, acid, dub; African is the band),
and the same page served live from the owner's own Cloudflare Worker, where it reads every source as it changes and the Earth has one
more layer, live cameras. It was rebuilt from nothing on 9 Nov 2026 after the owner said he hated the previous version, reshaped
the same evening after his first look, three times more on 10 Nov, on 12 Nov and on 13 Nov (his words are under "Hard rules").

Artifact: https://claude.ai/artifact/PCzaFJH2vjXe4Kv8KK4Xic (publish to this URL only; never make a second artifact)

## Hard rules (from the owner, in his words where quoted; do not bend them)

1. **No horns. No saxophone. No trumpet-like, blown, bowed or held sound of any kind. Nothing loud. No harp.**
   "I HATE the loud trumpet noises and I don't know how many times I've told you that." Earlier: "remove the annoying horn
   sounds you've added when you touch the screen", and no "whiny synth sounds". And of the first rebuild: "Harp is stupid."
   The saxophone samples are deleted from the artifact. The band's horn stem is out of the page (kept only as
   `dev/archive/band-horns-stem.mp3` in case he ever asks for it back; do not bring it back otherwise). The harp world (Loom)
   and its plucked-string voice are deleted; do not bring back a harp or anything harp-like.
   Everything a hand plays is struck and dies away. No tone is made by an oscillator.
   `node tools/t_levels.js` must print `LEVELS PASSED` before any publish that touches sound: nothing a hand can play, not
   even ten fingers hammering every voice at once, may come out as loud as the band. See "Sound levels" below.
2. **The band is his.** Nine recorded stems, their gains `SG`, the mixer chain, the master `OUTG=.3`, the loop, the build-up
   from two players to nine with the electric guitar last, and "on with the first touch": exactly as on the original site
   (he listened and said "make it exactly the same"). Every world has all nine. Since 13 Nov (evening) who plays, and what more, is
   set in Mix and goes on playing in every world; elsewhere there is only the music button. Nothing ever changes a level.
   Since 15 Nov (rule 21) the music has five modes: African is this band exactly (the nine at their levels, their mixer chain, the
   build-up); the other four are bands of their own, and his band's players can join any of them from Mix.
   Since 18 Nov (rule 27) Beat plays its classic beats at their own tempi, and while it is open the band rests: its level is held at
   nothing there (it goes on playing silently, in time) and is whole again the moment Beat is left.
3. **Nothing about him.** No name, no biography, no photos of his, no project categories, no links to his sites. Pictures are
   made here, are public data (NASA, the star catalogue), or are the viewer's own photo, which never leaves the device.
4. **No tiles, no grids of image blocks.** He prefers the electronic look (thin light on black, condensed type, small mono
   readouts). An organic restyle (serif type, pebble buttons) was tried once and rejected: do not retry it.
5. **Few controls, each with its name, and no writing at the top** (since 15 Nov, 22:59: "Remove the writing on the top": the words
   at the top of a world appear only when a tap asks for them: a war zone, a place, a fire, a storm or a camera read; a game's round,
   time and score are drawn in its tank). Before that it said "and one plain line saying what a world is": This rule first said "no words of
   instruction" and left a ghost finger to show what to do. His fourth look (10 Nov, 11:15) overruled that: "I have no idea what
   any of that first page does. Makes no sense." So every tool carries its name (Paint: hand, wall, fan, drain, play;
   in a game the hand and again), and the readout of a world opens with one plain line of what it is and what a finger does there
   (Paint's was "real smoke, worked out as it moves: push it with a finger, tap for a drop" until 15 Nov, 20:39, when he asked for it
   to go: "Remove the real smoke, worked out as it moves; text at the top": outside a game Paint has no words over it but what is built); a round's readout is three lines: what to do, what
   there is to place (or how the smoke is doing), what the piece in hand does. Then facts (counts, places, times). Keep the words few
   and plain: no paragraphs, no pop-ups, no tour. The ghost finger still shows the first touch.
   **The music is one small on/off button, at the top right of every world.** Of the old switch and the Band world he said (10 Nov)
   "I don't particularly like the music interface", and asked on his portfolio site for little track circles; so for three days
   there was a note and nine circles, one a player, along the bottom. On 13 Nov (evening) he asked for "a small music on off button"
   and for the music set in Mix to play on everywhere (rule 15): the circles are gone. The button is a note, lit while the music can
   be heard and struck through while it cannot; it never moves by itself and is never lit over silence.
6. **It must work on his iPhone,** in the Claude app. Test at phone size; keep per-frame work bounded; respect the governor `QL`.
7. **Never the "↗" arrow** (or any external-link icon) on anything.
8. **Never publish a broken page.** `sh tools/check.sh all` must end with `ALL CHECKS PASSED`.
9. **Real data must be something that moves and that a hand can play with, never a readout.** Of the first rebuild (a week of
   earthquakes as dots and a score, the planets, the space station) he said: "The live data is useless, give me something else,
   like live video feeds", "universe is meh", "Can you give me live satellite data?", and "Smoke is cool" (his word for the
   fluid world, which is why it was called Smoke; since 15 Nov, at his word, Paint). So: the satellites are a swarm (since 15 Nov flying,
   a minute a second), the lightning flashes, the wars glow and beat (until 15 Nov the wind was smoke).
   Do not add a feed that only shows numbers or dots.
10. **What his second look (10 Nov) settled.** "Wind - interesting but the interaction of fingers makes it less interesting": no
   drawing in Wind; a finger turns the Earth and a tap reads a place. "More weather would could be interesting if it was done really
   well": weather is added only when it is real and well made (so far the fires and the tropical storms; clouds and rain wait for the
   hosted version, which can reach the sources). "The first blob part make no sense": the world of glowing organisms (Bloom) is
   gone; its code is kept as `dev/archive/world-bloom.js` in case he meant only its opening flashes. "Make the satellite selection
   bring up more data on each satellite. Real data": a tapped satellite brings up its record, every line of it published fact.
   "Simulate for now, but prepare for cloudfare deployment. Find more live feeds and def give me live video feeds from interesting
   places": the artifact keeps its snapshot; the hosted version (below) is where live video and live data go.
11. **What his third look (10 Nov, 09:50) settled:** "Nah, needs to be more realistic. The satellites should be in real time. The
   wind should have more layers, rain, sun, clouds. Real time. That's the most important part. The smoke is cool, but more effects in
   that section. Much more interesting and interactively cool. Like video games, building systems, puzzles, etc." So: Orbit opens on
   the present, second for second, and nothing winds it by itself (the hint turns the Earth instead); Wind has layers he can switch
   (wind, clouds, rain, sun), the clouds and the rain only in the hosted version (they cannot reach the artifact); Smoke is a machine
   to build in (walls, fans, drains, smoke that rises, whirlpools) with puzzles, each of which brings more of the band in (seven
   puzzles at first; five since noon on 10 Nov, when only five passed the test of not solving themselves). Real time is the hosted version: say so plainly rather than dressing up the snapshot.

12. **What his fourth look (10 Nov, 11:15 to 13:05) settled.** "I have no idea what any of that first page does. Makes no sense":
   rule 5 changed (names on the tools, one plain line saying what a world is). Then "More more more!!!! ... I want the satellites
   animated in orbit. I want many many more videos. I want just more better." Asked whether Orbit should open sped up or in real
   time, he chose "Real time, flowing trails": the satellites stay where they are this second, each with a trail of its last
   minutes along which light runs; the ×60 chip still flies them. The Live world went from 10 cameras to 29.

13. **What his fifth look (12 Nov, 20:11) settled.** "Make this so much better!! The smoke game needs to be better the videos need to
   be better, the weather needs to be better." Asked what better meant, he chose: for Smoke, "Lots of levels" (20+ levels that get
   harder, stars for using fewer pieces, new parts unlocked as you go); for the videos all four of "Every camera plays", "Full-screen
   video", "Better places", "Many more cameras" (browsable by theme); for the weather all four of "Live clouds and rain", "Zoom into any
   place", "Dramatic storms", "More layers, like Windy"; and he uses the artifact and the site "Both equally". So: Smoke is a game of 24
   levels in six chapters (a new piece each: wall, fan, prism, drain, tunnel, then all together) with stars; Live fills the screen, has
   86 cameras in eight themes and a map, and the Worker finds each camera's stream by search when its address has changed; Wind has the
   weather model's own layers (the jet streams, temperature, pressure, waves), clouds and rain that drift with the wind, a card for any
   place tapped (the weather now and for three days, and the rain radar), and storms seen up close. The artifact cannot reach weather
   services or video, so the layers, the card's forecast and radar, and the cameras are on the site only; say so plainly.

14. **What his sixth look (13 Nov, 11:40) settled.** "Some is good, I like the videos and I like the weather, but is it real? Put them
   all on the same globe as satélites and make that just a layer. Make a music dj mixer page with pitch control hundreds of other
   samples and ability to abeloton live the music and make it way more fun and interactive. And then make the smoke game clearer and
   work better. The game should also be harder and more fun." Asked, he chose for the mixer all four of "Clip grid, like Ableton", "Two
   decks and a crossfader", "Drum pads", "Effects to sweep"; of the smoke game he said "Too much smoke makes filling the holes too easy";
   for harder, "Tougher puzzles", "Moving parts", "Limited smoke"; for the cameras, "Window over the globe". So: Wind and Orbit are one
   world, Earth, where the weather, the satellites and (on the site) the cameras are layers of one globe, switched along the bottom; a
   camera's ring on the globe opens its window over the Earth; the satellites stay in the present (winding time and the ×60 chip went
   with Orbit's own world). Mix is a new world: the band and a machine of 300 sounds as two decks of
   loops started on the bar, a grid like Ableton Live's clips, each deck with its pitch, nudges and sync, a crossfader, sixteen pads to
   play and record into loops, and effects to sweep. In Smoke a level's smoke waits to be let go and its tank runs dry; a jet carries
   about half the ink it did and a ring fills only with a jet streaming through it; walls turn the water along them; a source sweeps
   and rings drift; the 24 levels are new and every ring was placed where the measured smoke goes. His question "is
   it real" was answered: the site's data is real and as fresh as each source (listed under "Live data"); the artifact's is a snapshot.

15. **What his seventh look (13 Nov, 19:11) settled.** "Don't understand, explain the game. Brain? It's too complicated and you
   shouldn't see the levels, you should just change the levels so each time it's a different set up. The mixer is Brice but make it
   less options and more like ly to result in good sounds, like abelton . Player. And make it extend into the glove and game
   screens." Asked what to keep of the mixer he chose "Clip grid"; asked what plays on the Earth and in Smoke, "Just the audio remains
   playing. There is always a small music on off button". So: Smoke's game has no map, no level numbers and no stars; play starts a
   round, a set-up of its own each time (one of the 24, never the one just played, mirrored left for right half the time), the first
   round the simplest, a little harder for every two rounds won, the next round coming by itself after a win; three plain lines say
   what to do. The rings and the jets now show their colours (they never had: see `cpre` in `11-drift.js`). Mix is only a grid of
   loops, the band's and a machine's, with no knobs: everything is in the band's time and key, the band's four ways to play keep its
   chords lined up, the machine's bass follows them, the two basses never play at once. What is set in Mix plays on in every world;
   outside Mix the only control of the music is the small on/off button at the top right, and the nine circles are gone.
16. **What his eighth look (13 Nov, 22:31) settled.** "You do really need to improve this. The game is awful and the map hard to use
   and impossible to make good sounds with those noises change like everything make it so much better". Asked, he chose for Smoke
   "Push the smoke" ("No pieces to place. Smoke pours out and you push it with your finger into glowing rings before it fades. Short
   rounds, a score, faster each round."); by the map he meant the Earth globe ("Turning it, tapping satellites, cameras and the
   layers."); for Mix "Real loops, big buttons" ("Keep tap-a-loop, but every loop is a real instrument written to fit the band, laid
   out as a list of instruments with big buttons instead of the small grid."). So: Smoke's game is that and nothing else (no pieces,
   no set-ups, no release: the 24 set-ups and their tools are gone). Mix is a list: the band's nine, then ten real instruments,
   recorded (public domain), each with two loops written on the band's own beat and chords, every button big, one stop; the sounds
   made on the device are gone from it. The Earth has three short lines, a row of names of what is happening now that fly it there,
   + and − buttons, its layers in a list of their own said in plain words, and keeps still while something is being read.
17. **What his ninth look (14 Nov, 00:57) settled.** He looked at the site before rule 16's changes were out: "Kinda sucks game sucks
   music not fun world can't zoom in close enough not enough. Videos doesn't see to really be working fix it". So, on top of rule 16:
   the push game is easier to play and gives nothing for doing nothing (measured with a finger played by the test: pushing alone could
   not bend a vent's stream far enough, or keep it bent, to fill a ring; so a finger now takes the stream of the vent it lands
   nearest and the vent turns its stream to follow the finger, which still pushes the water and carries the smoke it moves through;
   the smoke is let out at the top of the tank so no haze fills a ring; the first rings are bigger); Mix opens with "jam: a new mix" (one tap, a new set of instruments with the band, every one written to fit); the Earth
   comes much closer (on the site 48 times, with NASA's 500-metre picture of the ground coming in for the part in view; in the artifact
   8 times); a camera's window is the width of the phone and at least 200 pixels high (YouTube's player will not play smaller), above
   everything so a tap on the picture reaches the player itself, with west, east and close over it, and "live cameras" under the
   globe opens one at once. Whether the streams play on his phone could not be seen from here: ask what he sees.
18. **What his tenth look (14 Nov, 11:18) settled.** "Layers menu is in the way, game is getting better. Needs more. Get rid of tunnel
   prism and things that don't do anything! Can't see because menu item of layers in the way". So: the layers are a short list of
   two columns of switches, and while it is open the globe is made small enough to stay whole above it (a switch shows what it does
   at once; the words of the one last switched, with its time, at the top of the list); the kinds of camera show only while a camera
   is open. Smoke's tools are the hand, the wall, the fan and the drain (no prism, no tunnel). The game has more: from round 2 gold
   rings worth three that fade if not filled in nine seconds; rings filled within four seconds of each other count double, treble,
   up to five times (a combo, its points rising from the ring); a drain in the tank from round 5, a current across it from round 7,
   two rings at once from round 8, one of the two going slowly round a loop from round 9 (17 Nov: its way drawn faintly, the dots
   moving the way it goes; a finger that follows it fills it); each round says what it brings.
19. **What his eleventh look (14 Nov, 15:24) settled.** "I don't understand the layers. It doesn't make any sense why that's there.
   They hardly work. Make that go away so you can see the whole globe and all the gameplay." So the Earth has nothing to switch: no
   "layers" button, no list. Everything there is data for is always on the globe (the wind as smoke, the clouds and the rain where
   served live, the Sun, the satellites, the aurora, the lightning, the fires, the storms, on the site the cameras); the weather
   model's temperature, pressure and waves are read out where a place is tapped, and are no longer drawn over the globe (nor the jet
   streams, which are no longer fetched). The words at the top are short enough for one line of a phone each (three, four on the site),
   and on a phone held upright the globe is kept whole under them, with room for four lines; when a place read takes more lines it
   glides to stay whole (a hint's ghost reading does not move it). The game's words are three lines of a phone, clear of the tank
   (the combo is said on the score's line). (That night he asked for the switches back: rule 20.)
20. **What his twelfth look (14 Nov, 22:13) settled.** "On the earth there should be videos, that's the best part!!! And be able to
   take on and off layers. The weather is pretty lame. Make it so much better! Doesn't noa have live weather?!" So: (a) the videos are
   on the Earth itself, each camera a small picture on a stem over where it is (on the site the stream's own picture, renewed every five
   minutes, a red mark on those on the air; in the artifact, where no outside picture or video may be shown, a dark tile with the play
   mark whose card opens the stream on YouTube). (b) The layers are back as a row of buttons under the globe, never a list or a sheet:
   each a picture over a word, lit while it shows, and each must be seen to work the moment it is pressed (the words at the top say what
   it shows; a point layer turns the Earth to the most of it; a layer of colour puts its scale over the row; one layer of colour at a
   time). A layer with nothing to show has no button. The choice is kept on the device. (c) The weather is live where it can be: on the
   site the "live view" is NOAA's GOES-19 and GOES-18 pictures of now laid on the globe (every ten minutes), and the model's fields are its
   forecast for the hour nearest now, never an analysis hours old; the wind is coloured by its speed the way Windy does it. The words
   say "now" only when what is shown is for this hour. The artifact cannot reach any of this (its page may fetch nothing from outside):
   its weather is the snapshot published with it, refreshed by `tools/feed.py` and `tools/gen_live.py`.
21. **What his thirteenth look (15 Nov, 16:34) settled.** "put the videos accessible right on the page, if possible. Change their icons
   on the globe. The mix is good! Make it able to also cycle through sounds or modes. another layer to change globally. five modes.
   funky, African, bluesy, acid, dub". So: (a) **five modes** of the music (`16-modes.js`), chosen in Mix (five buttons over the band)
   or from the button beside the note at the top of every world (its name; a tap: the next mode), on the next bar, kept on the device
   (`lc-mode`), the page opening in it. A mode is the whole music: its band, its room and echo, and the voice of every touch in Smoke
   and on the Earth. African is the band as before (rule 2). Funky, bluesy, acid and dub are bands of recordings (the Fluid R3 soundfont,
   MIT, as MuseScore ships it, plus Mix's own piano, shaker and hand drums), every one struck or plucked and dying away, written to the
   band's time and its two chords so his band's players can join; "jam" draws on the mode's own instruments; a mode's bass and the
   band's never play together. Acid has no oscillator: it is a picked bass string through a resonant filter that closes after each note
   (and, over eight bars, opens and shuts as a hand turns the knob); the 808 drums are recordings. Every mode is measured under the band
   with its touches on top (`t_levels.js`): a mode's band and its touches share a ceiling of their own, and a touch in a mode lands on
   the next sixteenth, one a sixteenth. (b) **The cameras' icons**: a lens of thin light on a stem with the sign of its kind drawn in it,
   in its kind's colour, a red dot on those on the air (site), names when few or close; no pictures of the streams on the Earth any more.
   (Since 17 Nov, the second hourly run: the smaller the globe the fewer lenses and the further apart, eight or nine on a phone's whole
   Earth and up to fourteen close up, so they no longer crowd it; the rest stay rings and a tap still finds them.)
   (c) **Videos one tap away**: the videos button opens a camera at once, playing in its window on the site; in the artifact its card
   (a Claude artifact may not play or embed any outside video: said plainly to him).
22. **What his fourteenth look (15 Nov, 20:39) settled.** "music is great! I love it, maybe see if you can make it all fit on one page.
   Remove the real smoke, worked out as it moves; text at the top. and remove the word smoke. Aren't free and hand the snake thing? Call
   it paint, not smoke. on the earth mode, we need something to be different. I don't know, its too bring. Even just the satleinetes
   moving is more fun, videos is def good, forget wind. Storms and fires are good. War zones and blacked out zones is good. Gaza, North
   Korea, Moscow, Beijing, etc.. major cities live is fun..." So: (a) **Mix fits one screen of a phone** (390 by 844 and 360 by 640
   measured; since 23:20, rule 23, any screen at all): the five modes, the band's nine in two rows, the mode's
   instruments as cards in two columns (each its name over its two loops), a new mix and stop side by side at the foot; its readout
   one line. (b) **Paint** (the world called Smoke): the name, the word "smoke" gone from everything shown, no words over the paint
   outside a game, and "free" folded into the hand (in a game the hand ends it). (c) **The Earth**: no wind layer (the wind is still read
   where a place is tapped, and still carries the clouds); the satellites fly at sixty times their speed, a minute a second (a satellite
   tapped brings the present back, so its card is of now; let go, they speed up again; since 17 Nov the space stations, gold, and the
   telescopes in low orbit, violet, are marks of their own with a short glowing trail, and a tap takes them first; since 17 Nov a
   storm's wheel is bigger and turns faster the stronger it is, white with two arms, amber with three from 119 km/h, red and ringed
   from 178; since 17 Nov too the front's dashes march along it and the places cut off dim and brighten slowly, about six seconds a
   breath, their dashed edges crawling; and close up the biggest fires burn as small swaying flames over their glow); two new layers
   after the videos, **war zones**
   (each war with more than a thousand dead this year by Wikipedia's count, red where its fighting is, brighter the more it has killed,
   beating slowly; the ground Russia holds in Ukraine from DeepStateMap's daily map, its edge, the front, drawn bright) and
   **blackouts** (the places cut off: no open internet, North Korea; the internet switched off, from the Internet Society's Pulse;
   no power, Gaza, Cuba, Ukraine under the strikes on its grid; the big services blocked, China, Russia, Iran, Myanmar, Uganda, Togo):
   the land goes dark there; on the site also the countries where IODA saw the internet drop in the last day). Each zone's facts were
   checked against today's news and sources before drawing (the reply to him gave them); a tap reads them with their source and date.
   (d) **Sixteen more city cameras**: Moscow, Beijing, Shanghai, Kyiv, Jerusalem, Tel Aviv, Gaza, Beirut, Mecca, Cairo, Tehran, Taipei,
   Mumbai, Bangkok, Havana, Berlin (102 in all), found by the Worker's search of what is live now. (e) Twenty minutes after this round
   was published he added "Remove the writing on the top": no world has words at the top any more until a tap asks for them (rule 5);
   the Earth's globe and Paint's tank take the room; a round of the game says what it asks in big words in the tank as it opens (and,
   in round 1 or when it brings something new, how to play it), and the score and the best are in the tank's corners.
23. **What his fifteenth look (15 Nov, 23:20) settled.** "Almost. The list of buttons on the globe hardly work. Make everything work.
   And also make the music buttons always on the page, fit." So: (a) **every layer's button is on the screen at once**: the row had
   run off the side of a phone and had to be slid along (two of the artifact's seven and eight of the site's thirteen were off the
   screen); now they wrap into as few rows as fit, the rows even and centred (the artifact's seven in four and three, the site's
   thirteen in five, five and three on a phone), never narrower than 58 px, their words whole. Never go back to a row that scrolls.
   (b) **Every button shows what it did**: a layer switched on turns the Earth to the most of it (as before) and, for two seconds,
   rings go out from each of its fires, flashes or storms in view, or the war zones and the aurora glow brighter; the fires and the
   lightning, specks until then, are drawn bigger the closer the Earth comes. A real tap on each button is tested: it switches its
   layer, a second switches it back. (c) **Mix always fits**: each button is as tall as lets the whole of Mix fit between the top and
   the worlds, whatever the screen (46 px at most, 24 at least, the gaps and letters with it). The page in the Claude app has less
   height than the phone: at 390 by 750 the old Mix had run under the worlds. Where the buttons would be lower than 30, the headings go
   and each instrument's name stands beside its loops; a phone on its side puts the instruments beside the modes and the band.
   Measured: 390 by 844, 750, 700, 660, 600; 375 by 560; 360 by 520; 320 by 480; 844 by 390; 667 by 375; 1280 by 800.
24. **What he opened on 17 Nov, 16:59** (to the hourly runs): "You can change how music sounds, you can do whatever you want with
   writing, (though only what is prompted ... I want you [quite] untethered." So from then on: (a) **the music may change**: new
   instruments, loops, modes, mixes and levels, in Mix and in the modes; rule 1 stays (he has asked for it too often to read it as
   lifted: no horns, saxophone, trumpet-like, blown, bowed or held sound, nothing loud, `LEVELS PASSED` still, no harp), and his
   band's nine recorded stems stay in the page (rule 2: how they are mixed may change, the recordings are his). (b) **Words may go
   anywhere, when prompted**: a world may say more than rule 5 allowed, at the top or elsewhere, as long as something the person
   did asked for them (a tap, a round, a choice in Mix); never standing text that nobody asked for. (c) What keeps his other work safe
   and the site whole stays: the "A. Thabo" artifact and Edge Desk are never touched, and nothing red is published or pushed.
25. **What he asked on 17 Nov, 17:54** ("Ok you're on auto!"): "Make some drastic fun changes to the music ... I like the graphics
   and beat breakdown ... you get from the view of the metronome like that. But also love the ability to make wildest different good
   sounding noises for beautiful melodic timed sound making and experimenting. Also slow down the paint. Make it more viscous." So:
   (a) Paint, painting freely, is thick and slow (`PV` in `11-drift.js`; the game keeps its own water). (b) **Beat**, a fourth world:
   the bar as a metronome's face, what plays broken down round it, notes of your own put on it in five sounds bent out of real
   instruments, played on the band's sixteenths (`17-beat.js`). He switched the chat to Auto: publishes no longer wait.
26. **What his look at Beat (17 Nov, 19:44) settled.** "Yeah but it's not interactive. And I like the classic beats I provided you,
   especially the more interesting ones, did y watch the videos I uploaded? And remove but[tons] when they are not necessary on the
   screen (world buttons on music pages)." No videos or beats had reached the chat (he was asked to attach them again, zipped).
   So: (a) Beat's inside answers a touch: a tap on an instrument's ring takes it out of the beat or brings it back, a tap in the
   middle brings in the next mode's beat (funky, African, bluesy, acid, dub: the classic beats) on the bar; a touch with the music
   off turns it on; a note put down sounds on the next sixteenth. (b) In Mix and Beat the worlds' buttons are tucked behind a small
   handle named "worlds" (a dot for each world); a tap brings them up for a few seconds over the bottom of the screen.
27. **What his seven videos (17 Nov, 22:20) settled.** The beats he meant are a series of short videos (the TikTok account superxeim,
   "la geometría de los ritmos"): each beat drawn on a circle of its steps, its main instrument a red shape joining the steps it plays
   on, the second a white shape inside, the third ticks outside, a hand sweeping round, and under it a grid of steps, one row an
   instrument, with its name, where it is from, its steps and its tempo. Seven videos, 37 beats with three repeats: 34 beats, read
   frame by frame (the grid's cells for the steps, the step counter's speed against each video's tempo for how long a step is). So
   Beat is that (`17-beat.js`): the 34, in six parts of the world (USA; Cuba and Latin America; Brazil; Africa; jazz and blues; Asia),
   drawn as the videos draw them, each played on recorded drums at its own tempo while the band rests (its level held at nothing in
   Beat, back on leaving: `hushSet`; how the band is mixed may change, rule 24, and its stems stay in the page); a finger changes any
   beat (the ring, the grid, a row's name), the five sounds play notes on the rings of pitch inside, and a beat's name, origin and
   tempo appear when it is chosen. Where a video gives only the timeline (son and rumba clave, tresillo, habanera, shiko, soukous,
   gahu), a shaker on the eighths and a low drum on 1 and 9 go under it.
28. **What he asked on 18 Nov, 00:50 (and 01:35).** "Theres too many confusing menu items at the bottom. Fix it and make it make a
   lot of good design sense. Ux. I like clear windows, pairing [painting] without anything on the screen. Make the pairing [painting]
   more fun so you can creat with it too, not always changing", then "you haven't resolved the navigation menu items at the bottom".
   So: (a) **no worlds along the bottom any more**, in any world: the world's name at the top left is a button (a small chevron beside
   it) that opens one menu: the four worlds, each with a line of what it is, then what this world can do (Paint: colour, mirror, start
   over, your photo, build with a wall, a fan or a drain, play the game; Beat: the notes' five sounds, make a melody, the beat as it was;
   saving a picture where the viewer can take one). A touch anywhere else closes it and does nothing else; Escape too. (b) **The bottom
   keeps only what a world is played with**: nothing in Paint (a chip only while building, "wall · done", or in a game, "again" and
   "stop"), the Earth's layers (rule 20), nothing in Mix, Beat's beat: back, its name (a tap shows where it is from), next. The photo
   button moved from the top into Paint's menu; the mode and the note stay at the top right. (c) **Paint is a still water to make
   pictures in**: what is painted stays (it no longer rises or fades), the water settles a second after the finger lifts, nothing
   paints by itself once a hand has (the band paints, fading, only until then, and the hint shows only before the first stroke); each
   touch takes the next of six colours (or one chosen), a finger kept still grows a drop, a tap is a drop, the menu mirrors every
   stroke two, four or six ways and starts over. Thick and slow as rule 25 asked; the game keeps its own water.
29. **What he asked on 18 Nov, 02:04.** "Oh and ALL satélites have to be accessible to link and know what they are." So every
   satellite on the Earth can be tapped, over the Earth's face as well as in the dark round it (until then only the stations and the
   few the sound follows could be over the face, where a tap read the place). A tap takes the nearest within reach of the finger, and
   its card says what it is: its name; what kind of satellite (internet, navigation, geostationary, Earth-watching, a space station,
   communications, military, wreckage, a rocket stage), whether it works and whose it is; its record as before. When more than one was
   within reach (over the face a few dozen are, at every point), "‹ 2 of 30 here ›" at the top steps through them, nearest first, thirty
   at most. At the bottom, "more on N2YO" opens its page there in a new tab (every object in the public catalogue has one: what it is,
   where it is on a live map, its passes; no arrow on the link, rule 7), and after a tap on the face "the place below" reads the place
   under the finger, which a tap on the face no longer does by itself while the satellites are shown (with them off it does, as
   before). Marks that stay where they are still come before the swarm: a camera, and over the face a storm's wheel, a fire, a small
   war's or blackout's ring. A cross puts the card away. (The 13:39 run, his "know what they are" again) under its kind the card says
   in one plain sentence what it is for, where its name or its kind tells it for sure (`whatIs`, `WHAT` in `13-orbit.js`): the
   internet constellations, the navigation systems, the phone and message networks, the weather and picture-taking fleets, the
   stations and the ships that visit them, the telescopes; by kind the geostationary, the wreckage, the rocket stages, the
   military. Nothing is said where nothing is known. The kind line calls the telescopes and the visiting ships what they are.
   (The 14:40 run) On the Earth the chosen one's ring and name are drawn last, over everything (`layer.top`), and the names of the
   wars and the places cut off keep clear of them (`layer.box`), as they keep clear of each other.
30. **What he asked on 18 Nov, 06:04.** "Still menu issues, why is this so hard? There are only four pages. Each has its own menu
   items. Don't put them on other sections!" Rule 28's one menu held two jobs at once: the four pages, and under them this page's
   things (and "save a picture" on every page). So **two menus, each with one job**: the page's name at the top left opens the four
   pages and nothing else; the round button beside it (three sliders), only on the pages with more than their screen shows (Paint and
   Beat), opens that page's own menu, the page's name as its title, with that page's things and nothing else. Saving a picture is
   Paint's, in Paint's menu only. The Earth's layers stay along its bottom and all of Mix on its screen: they have no menu button.
   The mode's button and the note stay at the top right of every page, as rule 21 has them (his "another layer to change
   globally"); told so, in case that is what he meant.
31. **What he asked on 18 Nov, 11:31.** "Tie the music to the map. The various rhythms of the world. Also, give me access to
   localized weather. Give me different brushes and pens and pencils and make the first art page a fun sketchbook that you can do
   anything with. Paint, drew write. And then it can convert to text, give you a quick image". Three parts, the sketchbook first.
   **Paint is a sketchbook**: its own menu has, as the tool, the paint (in the water, as before), a pen, a pencil, a marker and an
   eraser, and for the four a size (fine, medium, bold). They draw on a sheet over the water (`#sk`), crisp and still: the pen finer
   when fast, like a nib; the pencil paler, in grainy passes; the marker broad and soft-coloured; the eraser rubs out the sheet and
   lifts the paint under it. The colours are the paint's, the mirror mirrors them, start over clears the sheet with the water, the
   game puts the sheet away, a new size of the screen carries it from the middle (as the water is carried), and a saved picture has
   it. The round button for Paint's menu shows the tool in hand. **Asking Claude**, in Paint's menu under "ask claude", only where
   the viewer's own Claude can look at a picture (in the Claude app; the artifact declares `sample` with images): "to text" sends
   the sheet's ink, dark on white, to the quick model and shows what is written, to copy or to "type it on the page" (set in the
   page's display type where the writing was, the handwriting gone); "quick image" sends the page as it looks and Claude draws it
   again as one SVG, shown as it is drawn, kept to drawing (no scripts, foreign content, embedded images, links, styles, animation
   or handlers; shown as an image), to "put it on the page" (the water and the sheet cleared, the picture over the screen, to draw
   on). The viewer's own usage pays, and their first use asks them to allow it; on the site and outside the app the row is not
   there. **The music follows the map** (the 17:49 run): on the Earth, with the music on, the band is joined by the rhythm of the
   part of the world in view. The place nearest the middle of the globe, within 2,600 km, chooses from the beats of Beat's 34 that
   come from there (`PLACES` in `17-beat.js`: Chicago's house and shuffle, New York's boom bap, swing, salsa and Jersey club,
   Georgia's trap and funk, Memphis's rock, New Orleans's second line, Cuba's son, rumba, habanera and tresillo, the Dominican
   Republic's merengue, bachata and dembow, Colombia's cumbia, Venezuela's joropo, Rio's samba, bossa nova and funk carioca, Bahia's
   samba-reggae, Ghana's gahu and three against four, Nigeria's shiko and bembé, Congo's soukous, the malfuf of Egypt and the
   Levant, North India's teentaal, Mumbai's keherwa, South China's dong dong qiang, Java's lancaran: 33, all but the jazz waltz,
   whose nine steps in three do not fit the band's bar). Each plays on the band's own time and swing (its sixteenths, or its eighths
   where the beat is slow, or triplets for a beat in twelve, whichever is nearest the beat's own speed), only its two upper rows (the
   main instrument and the second; the ticks would crowd the band's own shaker and bells), half as loud as on Beat. A new place's
   beat comes in at the bar; where a place has more than one, the next comes every eight bars. Over the seas, and where none of the 34
   comes from (Europe, Japan, Australia), the band plays alone. As the globe turns by itself the rhythms go by; turned by a hand, it
   names the beat that comes in and its place for a moment ("Son Clave · Cuba"), but never over a place's reading, a card or a
   flight to a place a finger asked for, and a reading a finger asks for shows at once over any passing line. **Local weather**
   (the 20:02 run): the Earth has its own menu now (the button beside its name, as Paint and Beat have): a town or city typed (any of
   Natural Earth's 7,342 populated places at 1:10 million, `CITIES.find` in `09-cities.js`: the names it begins with first, then a
   word of them, the bigger first, accents and capitals no matter; until now the 1:50 million list of 1,251, which had no Providence),
   and on the site "where I am" (the phone asked once). The Earth flies there, comes close and reads it as a tap would: on the site
   its card has the weather now, the next day, three days and the last hour of rain radar; in the artifact, which can reach no
   weather service and cannot know where the phone is (no such capability), the reading has the town, its sun and its wind (the
   wind from the published snapshot), and the menu says "go to a town or city" rather than promise weather. Keys typed into the
   box are the box's (a "2" opens no page, a space starts no music).

32. **What he said on 18 Nov, 16:06.** "Nope not quite. The menu items for art materials need to be accessible at the top, just the
   marker, brush, pen, etc. the world is not connected to beats and the menu items are still small and fussy and busy and wrongly
   placed on the ring page". So: **Paint's art materials along its top**, big (58 tall, a picture over a word), always there while it
   paints and put away for the game: the brush (the paint in the water; until now called the paint), the pen, the pencil, the marker
   and the eraser, the one in hand lit in the colour it paints. Nothing else is up there; the sizes, the colours, the mirror, start
   over, the photo, asking Claude, the pieces and the game stay in Paint's own menu. **Beat has no menu of its own**: under its grid
   the notes' five sounds as big dots of their colours over their names, and under them the beat's row: a melody made up on it,
   back, its name, next, the beat as it was. **The beats on the world**: with the music on the Earth marks each place a beat comes
   from with a small red ring of steps; the one playing is larger, flashes on its main instrument's strokes and is named; a tap on
   another's mark flies there and its beat comes in at the bar; a tap on the one playing opens it on Beat. On Beat a red chip at the
   top right names the beat's place ("Chicago"); a tap turns the Earth to it and plays the beat there. (Asked in the reply to say if
   "the world is not connected to beats" meant something else.)

## What the page is

One screen. The world fills it edge to edge; top left its name, which opens the four pages (since 18 Nov, rule 30: nothing else),
and beside it on Paint and Beat a round button for that page's own menu, and the words a tap asks for; top right the mode's name (since 15 Nov: a tap, the next mode; not in Beat, where
the band rests), then the music button (a note: lit while the music plays, struck through while it does not); along the bottom only
what a world is played with: nothing in Paint (a chip while building or in a game), the Earth's row of layers (each a picture over a
word, lit while it shows; the scale of the layer of colour over it; on the site, while a camera is open, the cameras' kinds above it),
nothing in Mix, Beat's back, name and next; in the Earth two round buttons at the right of the globe, + and −. (The worlds were a row
along the bottom until 18 Nov, tucked behind a handle in Mix and Beat from 17 Nov, 19:44, rule 26.) The band starts with the first
touch anywhere. In Mix its list of instruments fills the middle, and what is set there plays on in every world.

**The first touch on an iPhone.** iOS starts no sound on a stroke, only on a plain tap (a touch that lifts where it landed; this is
how WebKit has behaved since iOS 9, and it could not be tried here). So a first touch that is a stroke asks for the music and gets
silence. Until a tap comes, the note stays unlit (nothing can be heard), every touch tries again, and a ghost finger taps the middle
of the world (`tapCue` in `20-ui.js`); Paint's own hint opens with a tap for the same reason. If four taps do not free the sound
the page stops asking. `node tools/t_lock.js` plays such a phone.

| World | What it is | Hands | Its own sound |
|---|---|---|---|
| Paint | (Smoke until 15 Nov, rule 22; no words over it outside a game; since 18 Nov, rule 28, nothing on the screen but the paint, its tools in the menu) a real fluid (GPU stable fluids), thick, and since 18 Nov still: what is painted stays where it is put (until then the ink rose like smoke and faded; since the 10:33 run of 18 Nov through a new size of the screen too, the phone turned or the app giving the page more or less height: the picture is carried over to the new water, each point where it was on the screen measured from the middle, `rsm` in `size()`), each touch the next of six colours or one chosen, a finger kept still grows a drop, the menu mirrors strokes two, four or six ways and starts over; a photo becomes the ink and remembers itself. A machine to build in: walls stop the water and the ink, fans push it (and breathe ink), drains swallow it (the prism and the tunnel went on 14 Nov, rule 18). And a game (since 13 Nov, night, his choice "Push the smoke"): nothing to place. In a tank of fixed shape a vent at the foot pours coloured smoke up; a glowing ring of the same colour waits somewhere the smoke does not go by itself (off the vent's column, in the upper two thirds, never where the last one was); a finger pushes the water (it leaves no ink, so only the vents' smoke counts) and the ring fills while its own colour streams through it, then gives way to the next. A round asks for so many rings in so many seconds: round 1 three in 32 seconds, each round two seconds less (down to 18) and every two rounds a ring more (up to eight), the rings a little smaller; a second vent and colour from round 3 (a ring wants its own colour: the other spoils it), a third from round 5, the ring drifting from round 4, a wall in the way from round 6. A round won: a burst of light, a rising chord, and two seconds later the next; time up ends the game with its score, and the best is kept (`lc.smoke.best`). Since 14 Nov (rule 17): a finger takes the stream of the vent it comes down nearest to, and the vent turns its stream towards the finger wherever it goes (never down into the floor); so a ring is filled by touching its colour's stream just above the vent and drawing it into the ring (a second colour from round 3 makes which vent a finger starts at matter). A moving finger also pushes the water and carries the smoke under it, and the smoke near a finger keeps to it a little; the top of the tank lets the smoke out; the first rings are a quarter bigger. Measured as a 60-frame phone: a ring filled in 2 to 4.5 seconds each, rounds 1 and 3; nobody touching, none. Since 14 Nov, 11:18 (rule 18) more: from round 2 every fourth ring is gold (worth three, a timer round it, gone after nine seconds if not filled); rings filled within four seconds of the last count double, treble, up to five times, the points rising from the ring; a drain sits in the tank from round 5 (between two vents' columns, under the rings: it swallows the smoke that comes near), a current crosses it from round 7 (a band where the water is pushed one way, shown by drifting chevrons), and from round 8 there are two rings at once, of two colours, a filled one replaced and the other left; each round's big words and second line say what it brings. Measured: nobody touching fills none in round 8 either. A time bar runs along the top of the tank (red for the last five seconds), the rings got are dots under it, and the big words say the round, what it asks, and how it ended | the tools along the bottom, each named: the hand (drag: push, ink; tap: a drop; stay: a spring), wall (drag: a straight wall whose ends join others; tap one: away), fan (drag: where and which way), drain (tap), play (a game); in a game only the hand (back to painting freely, with what was built before; since 15 Nov it is what "free" was) and again (a new game); a finger takes the nearest vent's stream and steers it (and pushes the water as it moves); a tap blows the smoke away from it; two fingers turning: a whirlpool, closing: pull the water in, opening: throw it out | glass notes, nine rows; a thump for a wall, a kalimba note for a fan, glass for a prism, a bowl for a drain and two for a tunnel; in a game the recorded marimba and vibraphone of Mix (glass until they have loaded): a chord as a round starts, a rising one for each ring, the vibraphone for a round won and for time up |
| Earth | one globe, its layers each a button under it (since 14 Nov, night, rule 20; since 15 Nov, 23:20, rule 23, all on the screen at once, in as few even rows as fit), lit while the layer shows, the choice kept on the device: videos, war zones, blackouts, satellites, live view (site), storms (while one turns), fires, lightning, rain (site), clouds (site), temperature (site), waves (site), pressure (site), aurora; on first: all but temperature, waves and pressure. (The wind went on 15 Nov, rule 22: "forget wind"; it is still read where a place is tapped, and the clouds and the rain still drift on it.) The war zones (since 15 Nov, `12-zones.js`): the twenty wars with more than a thousand dead in 2026 by Wikipedia's list of ongoing armed conflicts, each where its fighting is (a whole country, or the provinces of its fighting: Darfur and Kordofan, North and South Kivu, south Lebanon, Gaza, northwest Pakistan, Cameroon's three), red on the Earth itself, brighter the more it has killed (the log of its dead), hatched and beating slowly, a thin red edge; the ground Russia holds in Ukraine (DeepStateMap) a deeper orange with its edge, the front, bright; a place too small to see from afar (Gaza) a red ring that beats. The blackouts: the land of a place cut off goes dark (82% for no open internet or the internet cut, about 66% and flickering for no power, 36% for blocked services), a dashed grey edge, its name and what it is cut off from. Each tapped: the war, its dead this year, the latest dated line and its source; or what the place is cut off from, since when and by whose account. The facts are a snapshot checked by hand (`tools/gen_zones.py`, `data/zones.json`); on the site the front is DeepStateMap's of the day and IODA's outages of the last day are added. The live view (site): NOAA's GOES-19 and GOES-18 full-disk GeoColor pictures (a new one every ten minutes; true colour by day, the clouds by their warmth and the cities' lights by night), each laid back onto the ball through its satellite's own fixed grid wherever it sees the ground within about 75 degrees of straight down (the Americas, the Atlantic, the eastern Pacific), the two blended where both see; the cloud map (EUMETSAT, every three hours) and the rain (NASA IMERG) elsewhere. The model's temperature (blue cold to red hot), waves (deep blue to white and pink) and isobars every 4 hPa with the highs and lows named, from NOAA's GFS: its forecast for the hour nearest now, read from GRIB2 on the device; one colour at a time with its scale over the row and the coasts drawn over it (the temperature and the waves take each other's place). The clouds and the rain drift with the real wind. The globe (Blue Marble, city lights, the real day/night line); the strongest fires of the last day (NASA FIRMS) as embers; the tropical storms turning now, by name; the aurora where NOAA expects it; the last half hour's lightning as the GOES satellites saw it (since the 12:37 run of 18 Nov a dense storm is violet dust counted into cells and separate flashes, a flash passed over while a young one glows within its size, so thousands in one storm no longer add up to a white hole over the map). The satellites: every working satellite (about 15,900) and four wreckage clouds (about 2,700 pieces), each solved from its published orbit by the graphics chip every frame; since 15 Nov (rule 22) flying at sixty times their speed, a minute a second, each with a trail of its last six minutes of flight along which light runs (one tapped brings the present back; two days ahead they come back to now and set off again); dimmed a little over the weather; with their layer off, the stars stay. The cameras (both versions since 14 Nov, night): each of 102 live cameras is (since 15 Nov) a lens of thin light on a stem over where it is, the sign of its kind drawn in it (a paw, a volcano, a rocket or for NOAA's pictures the whole Earth, a skyline, waves, a crescent moon and a star, mountains, a plane, a train or a ship) in its kind's colour, bigger as the Earth comes closer (at most fourteen, the one open, those on the air and those facing squarely first, the rest small rings); on the site a red dot and a ring pulsing at its foot on those on the air; when six or fewer show, or the Earth is close, each carries its place's name, placed clear of the others and of the words at the top. No words at the top (since 15 Nov, 22:59) until something is read: a place, a fire, a storm, a war or a place cut off, or a camera open; the globe whole under them (it glides when a reading comes) | one finger: turn the Earth (it coasts; left alone it turns slowly by itself, but not while a place or a satellite is being read, nor when it is close); + and − (two round buttons at the right of the globe): closer, further (since 14 Nov down to 48 times closer on the site, where NASA's Blue Marble at 500 m a pixel comes in for the part in view once the Earth holds still, and 8 times in the artifact); a layer's button: on or off (on, the words say what it shows; storms, fires, lightning and aurora turn the Earth to the most of each, come close and read it; videos open a camera at once (since 15 Nov: on the site the one on the air nearest the middle plays in its window; in the artifact its card); satellites to the space station; the live view to the Americas when the Earth faces away from them); tap a place: its name (the nearest town), wind, the Sun's height, the hour by the Sun, the aurora, lightning near, and where served live the model's temperature, pressure and waves there and a card: the weather now and for three days (Open-Meteo) and the last hour of rain radar (RainViewer); tap a storm: the Earth turns to it and comes close; tap a fire: what is known of it; tap a war zone or a place cut off (or a small one's ring): what is known of it, with its source and date (war zones switched on turn the Earth to the deadliest war, blackouts to North Korea); tap a satellite (since 18 Nov, rule 29, any one: within 26 pixels in the dark round the Earth, within 20 over its face, where a few dozen are within reach of every point): its card, which says what it is, steps through the others that were within reach, links to its page on N2YO and, after a tap on the face, offers the place below (while the satellites are shown a tap on the face takes a satellite, not the place); tap a camera's lens: on the site its window opens over the Earth and the Earth turns to the camera (the width of a phone and at least 200 pixels high, at the foot of the stage, over everything so a tap on the picture reaches the player; over it west and east, the next camera that way in the theme, "youtube" (the stream on YouTube, should the player not play here; "noaa" for a satellite's picture) and close); in the artifact its card: what and where it is, its hour by the Sun, and "watch it live on YouTube" (the channel's live page, else YouTube's search for it among live streams); two fingers: slide to turn, pinch to come closer or travel out to the geostationary ring | glass notes by latitude, and one for a layer switched (higher on, lower off); a soft shaker tick for each lightning flash while the lightning shows (the half hour replayed over sixteen bars); glass when the two space stations and a dozen Earth-watching satellites cross between sunlight and shadow; a bowl note when a camera comes on |
| Mix | all on one screen of a phone (since 15 Nov, 20:39, rule 22; since 23:20, rule 23, of any screen: the buttons as tall as fits, a short screen without the headings and with each name beside its loops, a wide one in two columns; since 17 Nov what plays glows up on each beat, the mode's colour faintly behind, light only): the five modes; the band's nine in two rows; the mode's instruments as cards in two columns, each its name over its two loops; "jam: a new mix" and "stop" side by side at the foot; the readout one line. A list (since 13 Nov, night, his choice "Real loops, big buttons"): since 15 Nov first the five modes (rule 21; under the band the list is the mode's own instruments: funky a kit with ghost notes, slap or fingered bass, clavinet through a wah, muted guitar, electric piano, tambourine or cowbell, congas; bluesy a shuffle on brushes and ride, upright bass walking or a boogie, piano comping or licks, guitar licks bent into their notes or a shuffle, electric piano, tambourine or claps; acid the 808's drums, the acid line squelching or rolling, house piano, shaker or tambourine; dub one drop or steppers, a deep or rockers bass, the skank single or double, piano skank or melody, electric piano echoes or chords, hand drums or shaker, echo throws or splashes; African's ten as below), then the band, its nine players as nine buttons (each its whole recording, in or out on the next bar), then "play along": ten instruments, each a row with its name and two big buttons, its two loops: congas, bongos, shaker, cajon, claps, marimba, xylophone, vibes (vibraphone), piano, glock (glockenspiel; its second loop is on tubular chimes). Every sound is a recording of a real instrument (the Versilian Community Sample Library, VCSL, public domain under CC0: hand drums, shakers, claves, woodblock, agogo, struck mallet instruments, piano), every one struck and dying away. The loops are written for the band: on its grid (104 beats a minute, its swing, four bars) and on its chords, read off the stems: two bars of E minor 7 (E G B D), then two of A7 (A C sharp E G), so E dorian; checked by measuring the notes in each bar of every loop. A note is a recording played a little faster or slower to reach its pitch (never more than a few semitones from a recorded one); the hands are humanised a little (a few milliseconds and a few per cent, never on the beat). What is set here plays on in every world | "jam: a new mix" (since 14 Nov, at the top): a new set of instruments on the next bar, a drum, often a shaker or the claps, one or two tuned ones, each on one of its loops (and the first three of the band if none of it plays); tap a loop: in on the next bar (blinking while it waits; tap it again: called off); tap the loop that plays: out at the bar; the other loop of an instrument: takes over on the bar; "stop": all the instruments out at the bar, the band left as it is | the band's own stems at the band's own levels; the instruments under the toys' ceiling, never louder than the band (measured: `t_levels.js`). The first time Mix is opened it takes the band over from its usual loops where they are, without a gap, and keeps it |
| Beat | (since 17 Nov, 22:20, rule 27: his seven videos; since 18 Nov, rule 28, along the bottom only back, the beat's name and next, the notes' sounds, the melody and reset in the menu) the geometry of rhythm: 34 classic beats, each a circle of its steps (16, 12, 9 or 8) with its main instrument a red shape on the ring, the second a white shape inside, the third ticks outside, a hand sweeping round with a red trail and each corner flaring as it is played; under it the same beat as a grid of steps, a row an instrument, the step being played lit through every row, the step's number and a dot for each beat of its part of the world. A beat's name in a red-numbered box, the line the video gives for it, and where it is from, its steps and tempo appear when it is chosen or the middle is tapped, and go after five seconds. Played on recorded drums (`kit`, `k808`, `drums`, `small`, and the tuned banks for basses, the cuatro, the gamelan and the gong) at the beat's own tempo; the band rests while Beat is open (`hushSet`), and the mode's button is gone there. Below: back, the beat's name, next. | a tap on the ring: the main instrument's stroke on that step, or away; one dragged along the ring moves it; a tap on the grid: any instrument's stroke, or away (drawn along, the same for each step crossed); a tap on a row's name: that instrument out or back; inside the ring, eight rings of pitch: a tap a note (a second, away; drawn, a melody), a finger kept still plays its pitch on every step; the middle: the beat's name; the music off: a touch turns it on | the beat's own drums on its own clock, the notes in five sounds (`MIX.beatv`), all through Beat's own bus (`MODELIM`'s ceiling, its own echo); kept on the device (`lc.beat2`) |
**The satellite card** (`cardBuild`, `cardLive` in `13-orbit.js`, shown in the Earth): name; kind, status and owner; catalogue number and international
designator; launch date and site and years up; perigee and apogee, tilt and period (from the element set); where it is over now, its
height and speed, sunlit or in shadow (worked out every quarter second); radar cross-section and standard brightness; radio downlinks
(SatNOGS); the epoch of its element set and how long ago that was. The catalogue part comes from `data/satinfo.json` (published next
to the page, about 570 KB, read at the first tap; 20 bytes an object, layout in `tools/gen_live.py`). On a wide or a turned screen
the card stands at the right and the Earth moves over; on a phone it lies above the bottom row and the Earth moves up. The card takes
the touches that land on it (until 17 Nov it took none, so its cross and its "watch it live on YouTube" passed a finger through to the
globe); when it is tall enough to reach the words at the top it stands in for them, and the zoom buttons step aside while it covers
their place. Since 18 Nov (rule 29) the satellite's card has a cross; when more than one satellite was within reach of the finger,
"‹ 2 of 30 here ›" at its top steps through them (`HERE`, `hereI`, `nearList`, `step`); at its foot "more on N2YO"
(`https://www.n2yo.com/satellite/?s=<catalogue number>`, a new tab) and, after a tap on the face, "the place below" (the Earth's
`below`, which reads the place as if it were tapped where it is now, turning the Earth to it if it has gone round the back). The card
element is shared: `dataset.k` says whose it is (`sat`, `place`, `cam`), and each puts it away only while it is still its own.
Since 18 Nov (the 09:32 run) the Earth makes room above a satellite's card on a phone held upright, as it does above the place's and
the camera's (`geo` counts it while `ORBIT.layer.sel()` holds one; the card's height is watched every frame, `cardHt`, so stepping
or the record arriving moves the Earth too), and the chosen one's name beside its ring never runs off the screen: on the right, else
on the left, else over the ring, a name wider than the screen shortened with an ellipsis.

Deep links: `#paint #earth #mix #beat` (old links still land: `#smoke`, `#drift`, `#bloom`, `#loom` and `#band` on Paint, `#wind`, `#orbit` and
`#live` on the Earth). Keys: 1-4 worlds, space music, arrows in the Earth. Kept in the viewer's own browser (`localStorage`), and
nothing else: Paint's best score (`lc.smoke.best`: its old name kept, so no best score is lost), the mode (`lc-mode`), the Earth's layers (`lc-earth-layers`) and Beat's beat, its changes, the notes and their sound (`lc.beat2`; the notes of `lc.beat`, Beat's first version, are taken over once). (`lc.smoke.wins`, `lc.smoke.stars` and `lc.mix.pads`, from 13 Nov's rounds,
levels and pads, are no longer read.)

## Live data: what is live, what is a snapshot

- **Worked out on the device every frame from its clock, never stale:** where every satellite is (each orbit is carried forward
  from its published elements with the Earth's bulge turning it: the J2 secular terms, the same sums as before, within 15 km of
  SGP4 after a week for the space station), the Sun's overhead point and so the day/night line, the Moon, the turning of the stars.
- **A snapshot that goes stale unless refreshed:** the orbits themselves (good for days; a week-old set is still right to the eye),
  the wind (NOAA issues it every 6 hours), the aurora (changes over minutes to hours), the lightning (the last 30 minutes before
  it was fetched), the fires (the last 24 hours), the storms. The page cannot reach the internet (the artifact sandbox blocks every
  fetch to another host). It reads `data/live.json`, published next to the page, and watches one small document in its own store,
  `feeds/stamp` (`db` capability; everyone may read, only the owner and editors may write): `{sats, wind, aurora, strikes, fires,
  storms}` as times. When a stamp is newer than what the page has, it fetches that one document (`feeds/<kind>`) and it takes over
  at once, in every open copy. The readouts always show the data's own time. (The store has never been written: the page runs on
  the published file. Two old documents, `feeds/quakes` and `feeds/iss`, are left over from the first rebuild and unused.)
- **The war zones and the places cut off** (`data/zones.json`, 15 Nov): a snapshot of how things stood on the day it was made, each
  fact checked by hand against its source (the year's dead by Wikipedia's list of ongoing armed conflicts; the shutdowns Internet
  Society Pulse lists as ongoing; the latest line of each from the news agencies, dated), the ground Russia holds from DeepStateMap's
  map of that day. To renew it: fetch the Natural Earth files and the day's DeepState file from GitHub (`raw.githubusercontent.com/
  nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson`, `ne_50m_admin_0_map_subunits.geojson`,
  `ne_10m_admin_1_states_provinces.geojson` saved as `ne_10m_admin_1.geojson`; `cyterat/deepstate-map-data/main/data/
  deepstatemap_data_<yyyymmdd>.geojson` saved as `deepstate.geojson`) into a folder of their own, check every line of `WAR` and
  `DARK` in `tools/gen_zones.py` against today's sources (a war that has ended goes; Pulse's ongoing list changes), set `ASOF`, and run
  `python3 -I tools/gen_zones.py <that folder> app/data/zones.json` (needs `pip install shapely`). On the site the front is the day's
  (the Worker reads DeepStateMap's daily copy every three hours) and IODA's outages of the last day are added (every quarter hour).
- **The freshest orbit of each satellite.** The mirrors' big "active" lists are refreshed at different rates (one was two weeks old
  on 10 Nov while its Starlink list was hours old), so `feed.py` fetches every group from four mirrors and `gen_live.py` keeps, for
  each satellite, the element set measured last, wherever it is, and leaves out anything the catalogue says has come down. On
  10 Nov about four in five orbits were under a day old; the space station's under a day.
- **Not possible inside the artifact at all:** live video (the sandbox blocks every outside image, video and frame) and the phone's
  camera, microphone and tilt (this account has no capability for them). He asked for live video feeds from interesting places and
  said "prepare for cloudfare deployment": see "Hosted version".

### Where the data comes from (the session shell reaches only GitHub, so each is a public GitHub mirror kept fresh by its owner's job)

| What | Source | Mirror (raw.githubusercontent.com) | Mirror refreshes |
|---|---|---|---|
| orbits | CelesTrak element sets | `satvisorcom/satvisor-data` `master/celestrak/tle/<group>.tle` (52 groups); `astrion-tech/celestrak-mirror` `main/tle/<group>.tle` (8 groups); `ztimson/satellites` `master/satellites.tle` and `PeanutButte7/satellite-globe-proxy` `main/snapshots/active.tle` (the whole active list) | hours to two weeks, by group |
| catalogue | CelesTrak SATCAT | `astrion-tech/celestrak-mirror` `main/satcat/satcat.csv` (6.8 MB) | daily |
| radio | SatNOGS DB transmitters | `satvisorcom/satvisor-data` `master/catalog/satnogs.json` | daily |
| brightness | standard magnitudes (McCants' list and others, as gathered by satvisor) | `satvisorcom/satvisor-data` `master/catalog/stdmag.json` | rarely |
| wind | NOAA GFS 10 m wind, 1 degree | `aaronyooht/wingmate-wind-data` `master/docs/wind-global-1deg.json` | each 6-hourly run |
| aurora | NOAA SWPC OVATION | `GefeiSHEN/NOAA-Aurora-Archive` `main/OVATION/latest.json` then the path it names | every few minutes |
| lightning | NOAA GOES-16/18 GLM | `Meteoscience1/lightning-strikes-data` `main/recent_strikes.json` | every 10 minutes |
| fires | NASA FIRMS (MODIS on Terra and Aqua, VIIRS on NOAA-20 and -21): the strongest 400 of the last 24 hours, over 150 MW | `juvenile454/planetary-lens-live-data` `main/data/fire-hotspots-v2.json` | every 15 minutes |
| storms | NOAA National Hurricane Center (present strength); GDACS, EC JRC and UN OCHA (the rest of the world; its figure is the highest wind reached so far) | `metacog-osint/elements` `main/data/nhc.json`, `gdacs.json`, `health.json` | hourly |

If a mirror dies: `tools/feed.py` keeps the previous file and says so; find another with the GitHub search API
(`https://api.github.com/search/repositories?q=...+pushed:>DATE`), which the shell can reach. `git clone --depth 1 --filter=blob:none
--no-checkout` then `git ls-tree -r --name-only HEAD` lists a repo without downloading it (never `ls-tree -l`: it fetches every blob).

### Refreshing (a few minutes, from any session)

1. Get the source (next section), then in the folder that holds `src/`, `data/`, `tools/`:
   `python3 -I tools/feed.py && python3 -I tools/gen_live.py`
   (`feed.py` checks everything it fetches: checksums on every orbit line, grid sizes, ranges, dates. `gen_live.py` writes
   `app/data/live.json`, `app/data/satinfo.json` and `data/db_<kind>.json` for sats, wind, aurora, strikes, fires, storms and stamp.)
2. Write the store with the `ArtifactData` tool, `url` above, collection `feeds`: `set` each kind from its `data/db_*.json`
   (`file_path`), and **last** `stamp` from `data/db_stamp.json` (the page fetches a document only when the stamp says it is newer,
   so the stamp must not arrive first). `get` a document first to learn its `version` for `if_version` if it already exists.
   `sats` is about 750 KB: send it in a call of its own. No publish is needed; open pages update live. (The catalogue,
   `satinfo.json`, changes slowly and is not in the store: republish it now and then.)
3. If also publishing the page, publish the fresh `app/data/live.json` and `app/data/satinfo.json` as `data/live.json` and `data/satinfo.json`.

The owner has not asked for this to run on a schedule (it was offered on 9 Nov). Do not create a scheduled task for it unless he
says so; he has run out of usage on scheduled work before, so keep any schedule sparse (the wind only changes every 6 hours).

## Getting the source into a fresh session

**Simplest (since 16 Nov): clone the site's repository.** `adamthabo/live-culture` holds everything: the source in `dev/`, the
fonts in `dev/fonts/`, the stand-in site's pictures in `dev/testdata/`, the page's pictures, sounds and data in `public/`. In a
clone, `cd dev && sh tools/fresh.sh` sets it all up, fetches the stand-in site's sources, builds, and starts both servers (it ends
`FRESH OK`). The hourly runs work this way: `docs/HOURLY.md`. The steps below, from the artifact, still work.

1. `Artifact` `list`, `scope: "files"`, `url` above.
2. `Artifact` `read` with `paths`: every path under `dev/` (`dev/archive/` only if you need the old worlds), plus `audio/*`, `img/*`, `snd/*`,
   `data/live.json`, `data/satinfo.json` and `data/zones.json`. They land under a folder `$W`. An artifact no longer takes a new `.py`
   file, so the Python tools added since 12 Nov (`gen_cities.py`, `g2ref.py`, `g2ref2.py`, `mkgfs.py`, `gen_zones.py`, and
   `snd/build_bank.py`, `snd/pitch2.py` with `snd/pitches.json`, `snd/build_modes.py`, `snd/extract.py`, `snd/sf3.py`, which made the
   instruments' files) are only in the repositories' `dev/tools/` (adamthabo/live-culture);
   the ones from before are in both, `build.py` kept up to date in place. The instruments' sounds are `snd/*.mp3` beside the page:
   copy them to `app/snd/` (step 3).
3. Arrange: `cd $W/dev && mkdir -p app/_fonts app/data shots && cp fonts/* app/_fonts/ && cp -r ../audio ../img ../snd app/ && cp ../data/*.json app/data/`
4. `sh tools/check.sh` builds `app/index.html` (the page) and `app/local.html` (the same with a skeleton and the test hook `window.__lc`).
5. Tests need the page served: `sh tools/serve.sh &` (port 8757), and for `test_astro.js` only: `cd tools && npm install`.
6. `sh tools/check.sh all`. Headless Chromium draws with software (about 5-60 frames a second depending on the world): judge looks from
   screenshots in `shots/`, not from speed. `node tools/t_hero.js phone 2 10 2` gives a phone-sharp picture of world 2 after 10 s.
7. After changing Smoke's game, its water or its rings: `node tools/t_smoke.js` plays it as a phone at sixty frames a second does
   (`fixdt`), pushing with touches one move a frame; it is part of `check.sh all` (about twenty minutes here).

## Publishing

`Artifact` publish with `url`, `file_path: $W/dev/app/index.html`, and `files` mapping every changed source to its `dev/...`
path (give `.md`, `.py`, `.sh`, `.html` fragments `contentType: "text/plain"`) and `data/live.json`, `data/satinfo.json` to their
`app/data/` files when the data changed. Files not passed are kept; `null` removes one. Do not pass `icon`.
Omit `capabilities` to keep them (`downloads`, and `db` with rules `[{path:"",read:"view",write:"admin"}]`); if you must restate
them, restate both. Read the artifact once before the first publish of a session or the publish is refused.
Never publish `app/local.html`, `app/_fonts`, `app/_check.js`, `shots/`, `wav/`, `raw/`, `data/live/` or any test photo.

After every publish, check the bytes that were published, not the local build: `Artifact` `read` with `path: "index.html"`, copy
the file it saves to `app/published.html`, then `node tools/t_published.js` (the server running). It opens that page with no test
hook, uses each world the way a person would, and must end with `PUBLISHED OK`. Delete `app/published.html` afterwards. (The
governor is live in this test and the headless browser draws slowly, so Smoke usually reports its coarsest water: not a fault.)

## Architecture (one page, one script, no libraries)

`build.py` joins `src/head.html`, `style.css`, `body.html` and the modules below into `app/index.html`.

- `00-data.js` generated by `tools/gen_data.py`: `STARS_B64` (5,044 stars: RA, Dec, magnitude, colour index) and `BAND_DATA`
  (each player's note onsets and loudness envelope, read off the stems).
- `01-core.js` helpers, the scale (`pent`, E minor pentatonic), the stage `STG` (the part of the screen the chrome leaves free), a small matrix kit,
  and the governor: `QL` 0, 1 or 2 sets how many organisms, how fine the water and the smoke, how many satellites, and how fine the canvas
  (2, 1.5 or 1.25 device pixels a point). It was carried over from the page this one replaced and is worth keeping as it is: it judges
  nothing before the first touch (a framed page can be held to half speed until then), a step down is a two-second trial, and if the step
  bought no speed (a phone in low-power mode runs everything at thirty frames a second) the quality is given back. `tools/t_gov.js` checks all three.
- `02-gl.js` one WebGL1 canvas shared by all worlds: programs, targets, image textures (mipmaps where sizes allow), context loss and return.
- `04-band.js` the band's state: who is in (`ON`), each world's line-up (`SC`), every onset as it sounds (`BD.hits`, `BD.flow`), the sixteenth-note step.
- `03-audio.js` Web Audio: the stems and the original mixer; the touch voices (`SYN`, plain arrays worked out once), their bus, its ceiling
  (`lim` then `post`, see below), `tone()` and `hit()`; the iPhone unlock; `soundLive()` (it can be heard) and `soundHeld()` (asked for, not
  yet allowed); `seqPump` tells the current world about each sixteenth a little ahead of time.
- `05-astro.js` the sky from the clock: Sun, Moon, sidereal time (and, unused now, the planets and a single-satellite propagator that
  `tools/test_astro.js` checks against astronomy-engine and SGP4; `13-orbit.js` uses the same sums for every satellite).
- `08-grib.js` `GRIB`: a reader for GRIB2, the format the weather models are published in (regular latitude/longitude grids; simple
  packing, and complex packing with and without spatial differencing; bitmaps and missing values; several fields in one message, as
  NOAA packs each wind's two parts). `node tools/t_grib.js` checks it against ECMWF's ecCodes on real NOAA files (the reference values
  are made with `pip install eccodes eccodeslib`; the files are pygrib's sample data). `GRIB.at(m, lat, lon)` reads a value at a place.
- `09-cities.js` `CITIES`: Natural Earth's 1,251 populated places (public domain), for "35 km from Boston"; made by `tools/gen_cities.py`.
- `10-camlist.js` `CAMLIST`: the Worker's 86 cameras and their eight themes, written by `node tools/gen_cams.js` from `cf/live-culture/worker.js`
  (run it again whenever a camera is added there), each with a way to watch it on YouTube; the artifact's only list of cameras, and the
  site's until the Worker's own arrives. Since 14 Nov, night, it and `14-live.js` go into both builds.
- `06-live.js` `LIVE`: the six data sets, `liveTake()` (checks and unpacks one; every name that will be shown is cut down to letters,
  digits and a few marks), `liveLoad()` (reads `data/live.json`, then watches the store's stamp); `SATINFO`, `satInfo(id)` the catalogue.
- `07-globe.js` `GLOBE`: the Earth drawn by ray in one fragment shader (day, night lights, relief, sea glint, air), with two optional
  layers: the zones' picture (since 15 Nov, unit 4, `uZone`, `uZoneK`: red the wars, green the ground held in Ukraine, blue how dark a
  place cut off goes, from `ZONES.tex()`; until then this unit held the wind's smoke) and the aurora grid. Since 14 Nov, night: the live view (`GLOBE.geo('e'|'w', canvas)`, units 11 and 12: each
  GOES full-disk picture looked up through the ABI fixed grid, the satellite 6.6107 Earth radii out over 75.2 W or 137.2 W, the scan
  angles out to 0.151872 radians, the Earth an ellipsoid; weighted by how squarely it sees the place), and the layers of colour (`uWx`,
  unit 8, built by `wxBuild`/`wxStep` in `12-wind.js`: red the temperature, green the waves, blue the isobars; `uWindK` the wind's speed
  from the wind's own texture, not used since 15 Nov), each colour taken back through the final curve (`untone`) so it shows as meant, the coasts over them
  where the chip gives derivatives. `GLOBE.at(x,y,g)` gives the latitude and longitude under a finger. Since 14 Nov a close
  picture of part of the Earth (`GLOBE.detail(img, {s,w,n,e})`: texture unit 10, `uDet`, `uDetR`, faded in over 0.6 s and at its
  edges) replaces the whole Earth's day picture inside its box; the Earth (`detTick` in `12-wind.js`, on the site only) asks the
  Worker for one (`/api/detail`) once the view has held still for half a second closer than 2.4 times: a box 1 to 64 degrees a side,
  the smallest that holds the view with a margin, on a grid of a quarter of its side so a small turn reuses it. `ZMAX` is 48 on the
  site and 8 in the artifact (until 14 Nov 3.2 everywhere).
- `12-zones.js` `ZONES` (15 Nov, rule 22): the war zones and the places cut off. `load()` reads `data/zones.json` (and on the site then
  `/api/zones`: the day's front from DeepStateMap and IODA's outages of the last day, merged, again half an hour later); `take()` checks
  every shape and cuts every word down to letters, digits and a few marks; `tex()` paints them once into a 2048 by 1024 picture of the
  Earth unrolled for the globe's shader (red the wars by `k`, the log of the dead; green the ground held; blue the darkness); `draw()`
  draws over the globe the edges (each ring cut at the horizon and closed along it, `ring`), the front, the rings of zones too small to
  see and the names (a war first by its dead; one name for a place both at war and cut off, "UKRAINE · NO POWER"); `pick()` and
  `words()` the tap and its reading. The data: `tools/gen_zones.py` (shapes from Natural Earth, joined and made simpler with shapely;
  the facts in the script, checked by hand each time it is run).
- `11-drift.js` (the world called Paint, Smoke until 15 Nov), `12-wind.js` (the Earth), `16-mix.js` (Mix) the three worlds. Each is an object with any of:
  `enter leave resize down move up hover gesture wheel key seq step tick draw hud ghost gl dbg`. Since 13 Nov the satellites
  (`13-orbit.js`, `ORBIT`) and the cameras (`14-live.js`, `LIVEW`; since 14 Nov, night, in both builds) are not worlds but layers the Earth
  runs (its rows of layers, `LYS`, `LY`, `dockSync`, `dockFit` (every button on the screen, rule 23), `lyTap`, `lyApply`, `lyShow`, `lyPing`/`pingK` (a layer switched on shows itself for two seconds), `colLayer`, `lgdSync` in `12-wind.js`, kept as `lc-earth-layers`
  in the device's storage): each has `layer: {on, off, tick, draw, pick, hud}` (the cameras also `hit`, `up` for their window, `open`, `close`, `flyTo`),
  and the Earth turns them on as it opens (the cameras on the site only) and off as it closes, hands them its globe (`g`) every frame, draws them over its own, and
  offers them a tap first (a camera's ring; then, over the face, a storm's wheel, a fire or a small war's or blackout's ring right
  under the finger; then, since 18 Nov, any satellite within 20 pixels over the face or 26 in the dark, whose card offers the place
  below; then a storm or a fire nearby, a war zone or a place cut off, then the place). Over the weather the satellites are dimmed (`LAY`); on the Earth they fly at sixty times their speed
  (`LAPSE`, `layer.tick`; one chosen glides the clock back to now, `layer.pace()` gives the words). Mix is DOM controls over the canvas (`#mix`, placed under the readout each frame).
  The two worlds taken out on 10 Nov are in `dev/archive/`: `world-bloom.js` (`BLOOM`) and `world-band.js` (`BANDW`). To bring one
  back: put it in `src/` as `10-bloom.js` or `15-band.js`, add it to `mods` in `build.py`, add its row to `WORLDS` in `20-ui.js` (the
  rows that were there are in the v14 source of `20-ui.js` in this artifact's history), and rerun every test.
  Smoke: stable fluids on the GPU (velocity at 128 cells across a phone, ink at 512), buoyancy by the ink's density. Walls are
  drawn into a grid at the water's size (`obs`) that masks the water and the ink (`msk`) and that the advection reads (`uObs`):
  nothing is carried across a wall in one step, or a fast jet jumps a 10-pixel wall; where the way back crosses a wall the place
  keeps what it had (until 13 Nov it took nothing, which ate the smoke of every jet that met a wall). Since 13 Nov the pressure sees
  the walls too (`div`, `prs`, `grad`: a wall's cell takes the pressure of the water against it, and the water beside a wall loses
  only the part of its speed that goes into it), so a jet that meets a wall slides along it instead of stopping dead and spreading.
  Measured on the first level: before, a jet turned by a wall came away with a third of the smoke a straight jet carries. A prism is a pass over the ink (`tint`: inside it
  the ink takes its colour, as bright as it was); a tunnel is a pass that moves the ink in one mouth into the other, place for place
  (`tun`), with a pull at one end and a push out of the other. Rings are measured from the ink read back at 64 across (`readBack`,
  `sample`: density times how close the colour, taken all together, is) and fill by the water's own time at `LP.fk*(match - LP.f0)`.
  The game (since 13 Nov, night: rule 16) is played in a tank of fixed shape (`B`, width 0.64 of its height, fitted into the stage
  under three lines of words, `boardFit`; its places are fractions of the tank, its speeds and sizes scale with it), so it plays the
  same on any screen, with the level water of 13 Nov (`LP`: smoke rises a third as much, it and the water fade sooner, by the
  water's own time, so a phone at thirty frames a second plays it as one at sixty does, only slower). `gmPlan(n)` says what round `n`
  asks (rings, seconds, colours, ring size, drift, a wall); `gmRound` sets it up (`gmPlace`: the tank's walls, the vents along its
  foot as fixed sources pointing up, `VENTX`, `VCOL`, and the wall); `gmClock`, on the water's time, runs the intro (1.8 s), the
  round and the pause after a win (2.2 s); `gmRing` puts a ring (two from round 8) where the smoke does not go by itself (`gmRingNew`: 64 random places scored: off
  its vent's column, away from the last ring, the wall, the drain and the other ring; from round 9 the first of the two goes round
  a loop in an outer vent's colour, each try its own size (160 tries), kept off every vent's column (another colour's smoke spoils
  it) and off the wall all the way round (`wallD`), `LAP` seconds a lap; a drifting
  ring drifts away from the other; `moveParts` places both kinds by the water's time; `gmRingSwap` replaces a filled or faded one); `cupsCheck` fills it as before (the ink read back at 64 across, `sample`:
  density times how close the colour, taken all together, is, `LP.fk*(match - LP.f0)`, per ring radius `c.r`) and `gmRingDone` counts
  it; `gmOver` keeps the best. In a game a finger moves the water a little more widely and leaves no ink (`tick`: `fk`, `fr0`), takes the
  stream of the vent it came down nearest (`GV`) and turns it towards itself (`f.a`, clamped above the floor, 7 a second), carries the
  ink it moves through (`FQ`, the tunnels' `tun` pass) and draws the ink near it in a little (`FM`, the `mag` pass); the top of the
  tank eats ink (`snk` mode 4); a tap is a gust outward (`up`). `gmStart` keeps what was built in free play (`SAVED`) and `gmOff` gives it back. Measured here (as a
  phone at sixty frames a second, `fixdt`): a stream taken just above its vent and drawn into the ring fills it in 2 to 4.5 seconds;
  left alone for a round, none fills (a ring empties again while less than `LP.f0` of its colour is in it).
  The 24 set-ups of 13 Nov and the tools that placed and checked them (`t_design.js`, `t_place.js`, `t_puzzles.js`,
  `place_rings.py`, `set_levels.py`) went with them; they are in this artifact's version 28 (`dev/tools/`), and what was learnt
  making them is in ROADMAP.md's history.
  Wind: the smoke lives in a 1024 x 512 picture of the unrolled Earth (512 x 256 on slower phones); each frame every place takes what the
  real wind is bringing it (semi-Lagrangian, speeded up about 30,000 times), fed by small fixed "fires" that each burn a few seconds,
  by a haze where the wind is strong, and by the real fires (each a point drawn into the picture every frame, `P.pts`). The storms are
  drawn over the globe; a tap goes to the storm's eye or the fire under the finger before the place.
  The satellites (`13-orbit.js`): eight vertices a satellite in one static buffer (its trail in four pieces, from the body to the same body nine minutes
  earlier, light running along it), and the bodies alone in a second (a stride of eight would pass WebGL's 255-byte limit); the vertex shader
  solves Kepler's equation; the angles are brought forward to a new base time every ten hours of shown time so the numbers stay small.
- `15-snd.js` `SND`: the recorded instruments, eight sprite files in `snd/` (since 15 Nov ten more for the modes: `kit` 77 KB, `k808` 42,
  `fbass` 86, `slap` 67, `pbass` 54, `ubass` 40, `clav` 30, `ep` 74, `mgtr` 50, `gtr` 88, from the Fluid R3 soundfont, MIT, by
  `tools/snd/build_modes.py`; a mode's sounds are fetched when it is first chosen, the others a moment later) (`drums` 74 KB, `small` 59, `marimba` 52, `vibes` 100,
  `xylo` 41, `glock` 63, `chimes` 68, `piano` 253: MP3, mono). Each holds its sounds one after another, each in a slot of fixed
  length after 60 ms of silence; the page finds each sound's start by its first loud sample and cuts it into its own buffer
  (`cut`), so the MP3 encoder's delay does not matter. `SND.B` lists each bank's slot and its hits or its notes (the measured pitch of
  each recorded note, in MIDI numbers); `SND.note(bank, midi)` gives the nearest recorded note and the speed that brings it to the
  pitch, `SND.hit(name)` a drum or a shaker. Loaded the first time Mix (or a game in Smoke) asks, and only once. Made from VCSL (CC0,
  github.com/sgossner/VCSL) by `tools/snd/build_bank.py`, after `tools/snd/pitch2.py` measured each note's pitch (VCSL's file names
  are an octave out for the mallets and the piano, and some notes are a little sharp or flat): each note trimmed, its loudness over
  its first quarter second made the same, faded, joined. The kalimbas were tried and dropped: their other tines ring in sympathy, out
  of the key once a note is moved. The made-on-the-device sounds of 13 Nov's machine are in `dev/archive/mix-machine-sounds.js`.
- `16-modes.js` (since 15 Nov): the five modes. `MODES` (the order the button at the top steps through), `MODE` (kept as `lc-mode`),
  `MODEROWS` (each mode's instruments and their loops, written as Mix's are, plus a drum lane's own level `lv` and echo `send`, a note's
  marks `{sl: slide, bd: bend up from so many semitones, fx: echo, ac: accent}`, and `tri`, a shuffle: a beat's second and third
  sixteenths on its triplets), `MODESET` (each mode's band line-up, its instruments on their loops, its room, its echo in sixteenths with
  how much comes back and its filters, and the voice of each kind of touch with its range, level, length and echo), `MODEBUILD`.
- `16-mix.js` `MIX`: the mixer, a list (since 13 Nov, night). Since 15 Nov it plays the modes: every mode's instruments are tracks after
  African's (which keep tracks 9 to 18); a mode comes in on a bar once its sounds are in (`modeSet`, `modeApply`; at once when the music
  has only just begun); the page opening in a mode has the mixer from the first touch (`boot`, then one more instrument every two bars);
  the modes' instruments go into a bus of their own (`mb`) with its own ceiling (`MODELIM` -21 dB, knee 4, ratio 12, its makeup taken
  back by `MODEPOST`, measured by `limCalibrate`), a little of the band's room and the mode's echo; a touch in a mode is the mode's own
  instrument (`voice`), into the same bus, on the next sixteenth and one a sixteenth. `TR` the tracks: the band's nine (`k:'stem'`, each its whole recording)
  and the ten instruments (`k:'row'`), each with two loops in `ROWS`: a loop is written as one string a lane, a character a
  sixteenth (`.` silent, `1` to `9` how hard), or as events `[step, note or notes, how hard, how long]` built bar by bar on the
  chords (`bars`), and is turned once into what sounds on each sixteenth (`at`). One clock, `CK` (`beat(t) = bRef + (t - tRef) *
  BPS`). Every 25 ms `pump` schedules what falls in the next 160 ms (1.2 s while the page is hidden): on a bar, what was asked to
  start or stop (an instrument's loop starts only when its recordings are in); on every sixteenth, its sounds, the odd sixteenths
  late by the band's swing (`SWING`), a few milliseconds of give and a few per cent of loudness (never on the beat), a note held
  for its length and then damped. The first time Mix is opened, `take()` hands the band's usual loops over to the mixer a moment
  ahead, at the very place they had reached on the band's own clock (`AU.t0`, so nothing jumps); from then on `MIXON` is true for
  good: `stemsStart` stands aside, `clockSync` and `seqPump` run on the mixer's clock (whose beat 0 is `AU.t0`, so the pictures and the
  Earth's sixteenths stay on the beat), the band left to itself still builds (`setPlayer` asks `MIX.player` for a player), and leaving
  Mix changes nothing that plays. The music button pauses the sound (the context is suspended) and brings it back where it was. Its
  sound goes through the page's own buses: the band into the band's (at `SG`, with the band's high shelf on the shekere and the agogo),
  each instrument through its own gain and pan into the bus every hand-played sound goes into, with its ceiling, so nothing on Mix
  can come out louder than the band: `t_levels.js` measures it (`MIX.offline` builds it on an offline context). The screen
  (`build`, `uiSync`): a scrolling list under the readout, the band as a grid of nine buttons, then a row an instrument; a button lit
  while its loop plays, blinking while it waits for the bar, dimmed while it stops.
- `17-beat.js` `BEAT` (since 17 Nov; rebuilt on 18 Nov from his videos, rule 27): `RHY`, the 34 beats, each `{id, f: its part of the
  world, n, o: where from, x: the video's line, bpm, N: steps, b: steps a beat (4, 3 or 2, measured off the videos), r: three rows
  [name, sound, steps from 1, {v, g: per step, a: another sound on a step}]}`, the rows top to bottom as the videos' grids (ticks, white,
  red); a sound is a hit (`'kick'`), two at once (`'cbass+bongo'`) or notes of a tuned bank (`'fbass@40'`, a strum `'gtr@52,55,59'`).
  `HG`, `TG` how loud each recording plays, `ROLE` each row, `LV` each beat (measured, so a clave alone is as present as a bass line).
  Its own clock (`BT`: `t0`, step length `60/bpm/b`; `pump` every 25 ms schedules 130 ms ahead; a new beat starts on the next step),
  its own bus (`busOn`: the modes' ceiling `MODELIM` with `MODEPOST`, times `BPOST`, a little of the band's room, an echo for the notes
  on the dotted step); `hushSet(true)` on entering holds the band (`AU.duck`, after the band's bus) and the mixer (`AU.toy`,
  `MIX.hush`) at nothing, `hushSet(false)` on leaving. Notes are `{u: where round the circle 0..1, p: pitch ring, v: sound}` so they
  outlive a change of beat; a finger kept still for a third of a second rolls its pitch on every step, each stroke damping the one
  before (`rollAt`); a tuned row's note damps that row's last on the same instrument (`part`, `LIVE`), and a row filled past its own
  strokes plays lighter (`dens`). `geo()` places the circle, the name over it and the grid under it (beside it on a screen on its side). For the
  tests: `dbg`, `ringAt`, `at`, `cellAt`, `labelAt`, `pick`, `spy` (each stroke as it is given out), `offline` (a beat on an offline
  context, written or with every step on, notes and rolls on top: `t_levels.js`).
- `20-ui.js` the worlds table, pointers (real fingers `PT`, ghost fingers `GP`, a hovering mouse), two-finger gestures, the hints, the
  music button (`swSync`), the photo, saving, keys. A world with `tuck` has its worlds' buttons behind the handle, one with `nomode`
  (Beat) no mode button.
- `21-main.js` the frame loop and start.

Conventions: everything that moves uses `dt`; GLSL ES 1.00 only; `[hidden]` via `el.hidden`; a world's GL state never leaks into the next
(`glAttrOff()` first, blend and scissor switched back off); free what you replace (`glFree`).
Reduced motion: no hints, no band-driven motion, the worlds hold still until touched; the wind moves slowly; the satellites stay in the present.

## Sound levels (measured, not guessed)

The previous version's saxophone was measured at 9 to 12 dB **louder than the whole band** per note, and it played by itself
every loop and again on every touch. That is the failure this section exists to prevent.

- The touch voices share one bus: `toy` gain, a 7.2 kHz low-pass, a compressor used as a ceiling (`TOYLIM`: threshold -27 dB,
  ratio 14), then `post`. A browser's compressor silently adds make-up gain (+13.9 dB at these settings in Chromium);
  `post` takes it back out, and `limCalibrate()` measures the real figure on the device once after load instead of trusting the constant.
- `node tools/t_levels.js` renders the band and the voices through the page's real graph offline and compares loudest half-seconds.
  As published on 10 Nov: one note played as hard as possible sits 7 to 12 dB under the full band (the shaker 21 under);
  the lightning's ticks with fast glass on top sit 6.5 under; ten fingers hammering every voice at once sits 3.4 dB under.
  (The room's echo is random, so runs differ by half a dB or so.)
- `node tools/t_spec.js` shows the same per octave.
- Mix: the instruments (recordings since 13 Nov, night) play into the same bus as the touch voices, each through its own gain
  (`ROWS[].g`), so the same ceiling holds them; the band is its own stems at its own gains (`SG`), exactly as its usual loops.
  `t_levels.js` renders every instrument at once on its busier loop, the same with ten fingers hammering every touch voice on top,
  and each of the twenty loops alone (a lone loop is not held by the ceiling as a full mix is: the compressor lets a hit through
  before it closes; 13 Nov's evening machine had a lone kick loop come out louder than the whole band). Measured on 14 Nov: every
  instrument at once 4.3 dB under the full band, with ten fingers on top 3.4, the loudest loops alone (the marimba's run and the
  xylophone's rolling one) 4.1, the congas' open loop 4.3, the rest further under; ten fingers on the touch voices 3.3 under. (The claps first measured 15.8 under and
  were raised to 1.3.) "Jam" plays a subset of the instruments, so it is held by the same figures.
- Higher notes are played softer (`tilt()`: 3 dB per octave around E4).
- If you change a voice or a gain in `INSTDEF`, rerun both. If you add a voice, it must be struck.
- The modes (15 Nov): each mode's instruments were set by measurement, each alone to a level against the band (drums and bass loudest,
  then chords and lead, then percussion), and they share one ceiling with the mode's touch voices, so that a mode's whole band with ten
  fingers hammering its voices stays under the band. Measured on 15 Nov: every instrument of a mode at once 2.8 to 3.9 dB under the
  full band, with ten fingers on top 2.0 to 2.3 under, the voices alone 4.7 to 5.8 under, the loudest single loop 4.9 under (dub's deep
  bass). The touches in a mode were matched note for note to the voices they stand in for, then set 6 dB lower, and land on the
  mode's sixteenths, one a sixteenth (a dense flurry through a ceiling comes out loud however soft each note is).

- Beat (18 Nov): each of its 34 beats rendered as written at its own tempo through Beat's own bus, every beat brought to about the
  same loudness by `LV`; measured on 18 Nov: 6.0 (Jersey Club, Merengue, Joropo, Lancaran) to 10.0 dB (the shuffle) under the full
  band. The four with the most steps a second (Trap, Merengue, Jersey Club, Samba) with every step of every row on: 2.1 (Samba) to
  5.4 under; the same with the circle full of notes (48, in all five sounds) and two fingers rolling: 2.1 to 4.2 under; each of the
  five sounds alone, full, with two rolls: 4.6 to 6.8 under. (The first measurement had the bells 3.8 dB over the band: an octave
  down, four of their eight pitches were the recording's lowest note played four times slower, so rang as one; and a roll's bells,
  struck on every step at a tempo whose step was a whole number of the bell's periods, piled up in phase. The bells are an octave up
  now, and each stroke of a roll damps the one before.) Since 18 Nov, the seventeenth hourly run, every one of the 34 is also
  measured with every step of every row on: that showed Lancaran filled to +0.2 dB over the band (its vibraphone rows, struck on
  every step and ringing over a second, piled up in tune with themselves). So a tuned row's new note damps that row's last on the
  same instrument (as a gamelan player damps each key as the next is struck, and a bass string stops when plucked again), and a row
  filled past its own strokes (and past eight) plays lighter the fuller it is (`dens`: each stroke sqrt(max(m, 8) / n) as hard, as a
  hand plays a roll lighter than its accents). Measured then: the loudest of the 34 filled 2.6 dB under the band (Funk Carioca),
  with 48 notes and two rolls on top 2.4 under.

Not measurable here and therefore unknown: how it sounds to an ear, and how an iPhone speaker (which drops everything below about 250 Hz) shifts the balance.

## Hosted version (Cloudflare)

In the owner's repository `adamthabo/hello`, folder `live-culture/` (never in `adamthabo/edge-desk`, his trading app). Its README has
the Deploy to Cloudflare button; deploying makes a repository of its own in his GitHub (`live-culture`) from which Cloudflare's
Workers Builds deploys every push, and the page lives at `https://live-culture.adamthabo.workers.dev`. He pressed the button on
10 Nov at 11:12; the first build never reported back and the address showed Cloudflare's "There is nothing here yet" (his words:
"There nothing there yet!", "Yeah, it's empty why"). A push to `adamthabo/live-culture` started a build that deployed at 11:38.
Each build reports to GitHub as the check run "Workers Builds: live-culture" on the pushed commit: that is how to see from here
whether a push went live (`gh api repos/adamthabo/live-culture/commits/<sha>/check-runs`). The session cannot open workers.dev.
A push is now and then not picked up (no check run after a few minutes, 10 Nov 13:51): an empty commit pushed after it starts
the build at once.

- `worker.js`: the page is static (`public/`); the Worker answers only `/api/feed/<name>` (a fixed list of public sources, each with
  mirrors to fall back on, kept in memory for minutes: Cloudflare's cache does nothing on workers.dev; `radar` is RainViewer's list of
  radar pictures), `/api/cams` (the cameras and their themes), `/api/yt/<camera>` and `/api/live?ids=` (which video a camera, or up to
  eight, streams now), `/api/thumb/<video>` (since 14 Nov, night: YouTube's picture of a stream, `mqdefault_live.jpg` else `mqdefault.jpg`,
  kept five minutes, through the Worker so the page's own canvas may draw it), `/api/gfs/<t2m|mslp|wind10|jet|wave>` (one field of
  NOAA's GFS; since 14 Nov, night, the newest ready run's forecast for the three-hourly step nearest now (`gfsRuns`: `fh`, and `x-time`
  the hour it is for), no longer its analysis of six to ten hours before; the page asks for all but `jet`, and takes `wind10` for the wind
  whenever it is newer than the mirrored analysis: the run's index names the
  byte range, which is fetched from NOAA's copy on Amazon's open data, then NOAA's own server; served as GRIB2, read on the device), and
  `/api/wx?lat=&lon=` (Open-Meteo's weather for one place, now and for three days), and since 14 Nov `/api/detail?b=s,w,n,e` (NASA's
  Blue Marble, 500 m a pixel, from NASA GIBS's WMS in plain latitude and longitude, 1024 pixels square, the last 24 kept in memory;
  a WMS that cannot draw answers with XML, which is refused). No keys, no settings, nothing stored. The user
  agent names no one. Free Cloudflare plans allow fifty fetches a request and ten milliseconds of work: the camera lookups share a
  budget of 46 (`B`), and nothing heavy is parsed in the Worker (the GRIB is passed through as bytes).
- How a camera's stream is found (`ytNow`): the video addresses in `v`, each checked on its watch page (on the air, and allowed to be
  played on another site: `"playableInEmbed"`); then the channels in `c` (`/@handle/live`); then a search of what is live now (`s`:
  words, the title it must have, the channel it must come from; looped films posing as cameras, `NOT`, are passed over). The page asks
  for a theme's cameras eight at a time and shows only those on the air; a stream that will not play here (the player's error, or no
  picture in twelve seconds) is passed over for ten minutes.
- The page built with `HOSTED=1` (`build.py` writes `hosted/index.html`; `sh tools/pack_hosted.sh` copies it and the pictures, the
  sounds and the snapshot into the Worker's `public/`). It starts from the published snapshot, then `livePull()` in `06-live.js` reads
  every source through the Worker on its own clock (aurora and lightning every 5 minutes, fires 15, wind, storms and rain 30, clouds
  60, orbits 3 hours), unpacks each raw format itself (`pWind`, `pAurora`, `pStrikes`, `pFires`, `pStorms`, `pTLE`) and takes it only
  when it is newer. The live orbit list is laid over the snapshot (`satsMerge`): each satellite keeps its kind, takes the newer
  element set; satellites launched since join at the end, kinded by name.
- Sources it adds beyond the artifact's: CelesTrak directly (then the mirrors), NOAA SWPC directly, the clouds (EUMETSAT world cloud
  map via clouds.matteason.co.uk, 3-hourly), the rain (NASA IMERG precipitation rate from NASA GIBS WMS, the newest half hour that has
  data, about four hours back), NOAA GOES-19 and GOES-18 full-disk GeoColor pictures, and YouTube streams.
- The cameras are `src/14-live.js` (in the hosted build only): until 13 Nov a world of their own (Live), full screen; since then a
  layer of the Earth (his words: "Put them all on the same globe as satélites and make that just a layer", and he chose "Window over
  the globe"): a ring on the globe for each camera of the theme, and a tapped ring opens the stream in a window over the Earth (at the
  bottom right; a tap on it: across the stage, and back; a swipe across it: the next camera east or west; its cross: closed). The
  cameras are listed in `worker.js` (`CAMS`, sorted west to east as it loads); to add one, copy a line with its theme `t`. 86 cameras in eight themes since 12 Nov (found by web search; none could
  be watched from here). Before that, 29 cameras since 10 Nov, 13:30 (his words: "I want many many more videos"):
  the ISS (Sen), Kilauea, Vancouver, Monterey's sea nettles, Las Vegas, Jackson Hole, Starbase, Churchill's aurora, Satellite Beach,
  Times Square, Maho Beach, Rio's Christ the Redeemer, Amsterdam, Venice, St Peter's, Etna, three African waterholes (Namib, Onguma,
  Hwange), Posio's aurora in Lapland, Singapore, Hong Kong, Sakurajima, Fuji, Shibuya, Sydney, Auckland, and the two GOES pictures.
  Found by web search on 10 Nov; none could be checked from here (the session cannot reach YouTube, workers.dev, or play video): the
  Worker asks YouTube which are on the air and the page passes over the rest. Video ids change when a stream restarts: give a channel
  (`c`, a handle or a UC id) where one is known.
- Testing here: `node tools/hostmock.mjs` (port 8758) runs the real `worker.js` with every upstream played from local files, a few
  made-up YouTube pages (a search, a looped film, a stream that may not be embedded), GFS (pygrib's 2.5-degree GFS sample with an index
  in NOAA's form, and a made-up wave file: `tools/mkgfs.py`), Open-Meteo and RainViewer made up in their shapes; `node tools/t_hosted.js` checks the live reading, the clouds and rain on the globe, the merged orbits, and the
  cameras' layer and window with a stand-in for YouTube's player (and without it). What it cannot check: the real sources' answers from Cloudflare,
  YouTube's player, and the look of the real clouds and rain.
- To update the live copy after a change: build, `sh tools/pack_hosted.sh`, and push the folder's contents to his `live-culture`
  repository (Workers Builds deploys it); keep `hello/live-culture/` the same.
