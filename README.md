# Avighna Classical Homeopathy · website

One-page site for **Dr. Anamika’s Avighna Classical Homeopathy Clinic**, Tarsali, Vadodara.
React 19 + Vite, Three.js through React Three Fiber, Motion for animation, Lenis for smooth scroll.

The hero is a 3D homeopathy vial built in code (`src/three/models.js`): a clear glass vial packed with
white globules, its knurled screw cap floating off the neck and pills drifting out of the mouth.
There are no model files to download, so the 3D chunk is just three.js itself (≈270 KB gzipped) and
it loads after the page text.

Palette: `#086288` deep · `#4D8DBA` mid · `#97D7FF` sky · `#FFEFC4` cream (tokens at the top of `src/styles.css`).

```
src/content.js          ALL text, hours, phone, links. Edit this file, not the components.
src/App.jsx             section order, smooth scroll
src/components/         one file per section (Hero, Principles, Story, Care, Doctor, Hours, Reviews, Faq, Visit, Footer)
src/three/HeroScene.jsx hero: open vial of white pills, floating cap, drifting globules
src/three/StoryScene.jsx "Your first visit": globules re-form for each step (many symptoms → whole picture → one remedy → follow-ups)
src/lib/time.js         live open/closed status in clinic time (IST), whatever timezone the visitor is in
src/styles.css          design tokens at the top, then one block per section
```

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Deploy on Vercel

1. <https://vercel.com/new> → import this repo.
2. Vercel detects Vite. Leave the build settings as they are (Root Directory stays empty) and deploy.
3. Add the clinic’s domain under Settings → Domains.

## Fill these in before going live

All in `src/content.js`. Anything left empty is hidden or falls back gracefully, so nothing fake shows.

| What | Field | If empty |
|---|---|---|
| Clinic phone | `clinic.phone` (e.g. `'919876543210'`) | “Call” buttons open the Google listing, which has the number |
| WhatsApp number | `clinic.whatsapp` | Booking form copies the request and opens the Google listing |
| Dr. Anamika’s photo | put the file in `public/`, set `clinic.doctorPhoto: '/dr-anamika.jpg'` | a botanical illustration shows instead |
| Qualifications | `clinic.qualifications` (e.g. `'BHMS'`) | not shown |
| Patient reviews | `testimonials` (real Google reviews, with permission) | only the 5.0 ★ / 21 reviews card shows |
| Rating / count | `clinic.rating`, `clinic.reviewCount` | update when Google changes |

Also check the conditions listed under **Care** (`care`, `conditions`) match what the doctor actually treats.

With a WhatsApp number set, the **Request a consultation** form opens WhatsApp with a ready message
(name, day, session, concern). Hours, today’s row, “Open now / Closed · opens 5:30 pm” and the
“Over for today” slots all come from `hours` in the same file.

## Performance and accessibility

- Phones get fewer particles, a lower pixel ratio and no antialiasing; the scene drops resolution further if frames dip.
- 3D canvases stop rendering when scrolled off screen.
- No WebGL → a static SVG of the vial. `prefers-reduced-motion` → no smooth scroll, no auto-rotation, no marquee.
- Fonts: Fraunces and Manrope (SIL OFL 1.1) via Fontsource, bundled locally, no Google Fonts request.
