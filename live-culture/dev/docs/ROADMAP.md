# Roadmap

Nothing here is promised or scheduled. These are the next things worth doing, most useful first. Ask the owner before any of them
changes how the page sounds.

1. **The hosted version (asked for on 10 Nov: "prepare for cloudfare deployment ... def give me live video feeds from interesting
   places").** The same page served from his own Cloudflare Worker: live video from interesting places, the data read live every few
   minutes, weather done properly. In `adamthabo/hello`, folder `live-culture/`; one tap on Cloudflare's deploy button from him.
   Never push into the repository of his trading app for this.
2. **Hear it and hold it.** The two things no machine test covers: every voice by ear, and every world on a real iPhone
   (frame rate in Wind and Orbit above all, the first touch starting the band with the ring switch on silent, whether a first stroke
   leaves the sound waiting for a tap as expected, the card's size).
3. **Weather done really well** (his words: "More weather would could be interesting if it was done really well"). In the hosted
   version: the real clouds (EUMETSAT's world cloud map from the geostationary satellites, every three hours), rain (NASA IMERG,
   half-hourly), the temperature of the air and the sea. Not possible in the artifact unless a GitHub mirror of them turns up.
4. **Keep the artifact's data fresh.** Only if he asks: a scheduled task that runs the refresh in README.md. The wind changes every
   6 hours; four runs a day is about what his plan can spare (a night of hourly runs once hit his limit).
5. **More in Orbit.** The hundred brightest objects (mostly spent rocket stages, not in the active list); a ring on the ground under
   a chosen satellite; the Moon at its true place far out; passes over a place he names.
6. **Video as ink.** A clip from his camera roll through the file picker (allowed in the artifact) playing as the ink in Smoke.
7. **Record a loop.** Save one four-bar loop of a world as video (the `downloads` capability takes mp4 and webm).
