# Record the demo

Install project dependencies (`npm ci`) and Chromium (`npx playwright install chromium`). The command uses `npx tsx`, which downloads tsx on first use; run it once while online before recording at the venue. Install ffmpeg to produce H.264 MP4s; otherwise the command keeps usable WebMs. Videos have no audio.

Start the app in another terminal with `npm run dev`, then run:

```sh
npm run record
# Equivalent:
npx tsx scripts/record-demo.ts --base http://localhost:3000
```

The default is local. Once all pages are deployed, explicitly target the deployment:

```sh
npm run record -- --base https://blindspot-sable.vercel.app
```

Record one segment with `--only demo`, `--only tour`, or `--only live`. For local selector checks, run demo and live separately. The live segment creates a real session and saves six human-authored recycling ideas; it needs working session/AI credentials and deliberately concentrates ideas to trigger a question. No mock responses are injected. Use a working local environment for a venue-independent recording.

All captures use headless Chromium, a 1920×1080 viewport and video size, and device scale factor 1. Each segment uses a fresh browser context. The recorder waits for rendered UI and successful API responses; short pauses hold human actions and end cards for the viewer.

| Segment | Typical duration | Completion signal |
| --- | --- | --- |
| demo | About 90 seconds + 4-second hold | Visible `[data-tour="wrap-up"]` ledger |
| tour | 16 chapters at the app's autoplay pace + 4-second hold | Visible “That's the tour” in main |
| live | About 30–60 seconds plus API latency | Six saved stickies, visible question, Lens view, empty-corner hover held for 4 seconds |

Autoplay completion has a 120-second limit. Live waits up to 60 seconds for lenses and 120 seconds for a question. A stalled segment exits unsuccessfully, retains a `-partial.webm`, and continues attempting the remaining segments. A tour HTTP 404 prints a warning and skips the segment. Other navigation failures are errors.

Outputs are under `out/video/<timestamp>/`: `demo.webm`, `tour.webm`, `live.webm`, matching MP4s when ffmpeg is present, and `manifest.json` with statuses, approximate wall-clock durations, paths and errors. Successful segments are concatenated in demo → tour → live order to `out/video/blindspot-demo.mp4`. With `--only`, this contains the selected segment. A failed run writes its successful segments to `<timestamp>/incomplete-demo.mp4` and leaves any earlier submission video intact. Check the current manifest before submitting. WebMs remain available after conversion. The existing `/out/` gitignore rule excludes these artifacts; no ignore change is required.
