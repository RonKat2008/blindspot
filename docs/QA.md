# Production visual QA

Sweep of https://blindspot-sable.vercel.app on 2026-10-17. Viewports 375×812 and 1440×900. Screenshots: `out/qa/` (gitignored; regenerate with `E2E_BASE_URL=https://blindspot-sable.vercel.app npx playwright test tests/e2e/visual-sweep.spec.ts --project=chromium --trace off`).

Page-level horizontal overflow (`scrollWidth > innerWidth`) was clean on every route. Clipping below is inside overflow-hidden rows.

## Prioritized issues

1. **`/why` — judgment log is a blank timeline (375 and 1440).** After “Seven calls the AI couldn't make for us.” the page is ~4,000px of empty cream with only a vertical rule. Full page is 5320px at 375 and 3674px at 1440. The origin story is still the placeholder `[Your story: when you noticed AI narrowing your team's ideas]`. Screenshots: `out/qa/why-375.png`, `out/qa/why-1440.png`.

2. **`/` — hero then thousands of pixels of empty scroll (375 and 1440).** Content is the header, headline, CTAs, and one board card; the rest of a 5902px (375) / 4710px (1440) page is blank until a hairline and the footer. Screenshots: `out/qa/home-375.png`, `out/qa/home-1440.png`.

3. **Lens chips clip off the right edge at 375.** On `/demo` and `/s/<id>` the second chip is cut to “individual ↔ …” and later lenses never appear. No page-level scrollbar. Screenshots: `out/qa/demo-375.png`, `out/qa/s-c3eb20d6-9a30-423e-89cf-6a56f5859657-375.png`.

4. **`/insights` column captions collide at 1440.** Under Onboarding / Retention / Pricing the date line reads as overlapping fragments (“you 09ep 26”, “you 03Oct 8”, “you 0%”). Screenshot: `out/qa/insights-1440.png`. Guest load also logs a console 401 (filtered `/api/me`); the page itself renders the example team.

5. **Mobile header crowds at 375** on `/boards`, `/login`, `/invite/<id>`, and the 404. “Blind Spot” wraps to two lines and “Sign in” wraps inside its pill, jammed against “New board” and the menu. Screenshots: `out/qa/boards-375.png`, `out/qa/login-375.png`, `out/qa/qa-missing-route-375.png`.

6. **`/tour` chapter rail clips at 375.** Pills run off after “06” with no visible scroll affordance. Same first frame for `/tour` and `/tour?mode=guided`. Screenshots: `out/qa/tour-375.png`, `out/qa/tour-mode-guided-375.png`.

7. **`/ambient/<id>` prompt is truncated** at both widths (“How might we make campus life bett…”). Screenshot: `out/qa/ambient-c3eb20d6-9a30-423e-89cf-6a56f5859657-375.png`.

8. **Guest `/s/<id>` calls `POST /api/sessions/<id>/seen` and gets 401**, which shows up as a console error at both widths. The empty board and coach card still render. Screenshot: `out/qa/s-c3eb20d6-9a30-423e-89cf-6a56f5859657-375.png`.

## Looked fine

`/new`, `/pitch`, `/join/<id>`, `/demo` at 1440, `/insights` body at 375 (heatmap and chart readable), and the designed 404 (`/qa-missing-route`, HTTP 404). No broken images.
