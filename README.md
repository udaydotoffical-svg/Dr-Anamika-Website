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
src/components/         one file per section (Hero, Trust, Principles, Services, Story, Care, Doctor, Hours, Reviews, Faq, Visit, Footer)
src/three/HeroScene.jsx hero: open vial of white pills, floating cap, drifting globules
src/components/Logo.jsx the clinic emblem (stethoscope V + winged caduceus); paths in src/lib/logo.js
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

## Booking and the Desk app

Booking has two modes, chosen automatically:

- **Live booking (recommended)**: patients pick a real free time; Dr. Anamika confirms from **Avighna Desk** (`/desk`),
  a private page she saves to her iPhone home screen (Face ID sign-in, alerts, one-tap pre-written replies).
  Needs the free database and a passphrase: see **[SETUP.md](SETUP.md)**.
- **Simple request form (fallback)**: used until live booking is switched on, or if it is ever down. It sends the
  request by email form (`VITE_BOOKING_ENDPOINT`), WhatsApp (`VITE_CLINIC_WHATSAPP`) or the Google listing.

```
shared/schedule.js     clinic hours + slot rules, used by the site, the API and the Desk
api/public/[action].js public booking API (slots, book, status, cancel, .ics)
api/desk/[action].js   the doctor's API (passphrase / Face ID, requests, calendar, time off, settings, alerts)
api/_lib/              storage (Upstash Redis or a local file), booking engine with anti-double-booking locks
src/desk/              the Desk app
src/components/SlotBooking.jsx, MyBooking.jsx   the website side
dev-server.mjs         local stand-in for the API (npm run api)
api/_lib/turnstile.js  Cloudflare bot check (opt-in)
test/                  backend, Desk, website and bot-check tests
```

## Fill these in before going live

| What | Where | If empty |
|---|---|---|
| Clinic phone / WhatsApp | `VITE_CLINIC_PHONE`, `VITE_CLINIC_WHATSAPP` (Vercel env vars) | Call / book buttons open the Google listing |
| Booking inbox | `VITE_BOOKING_ENDPOINT` | WhatsApp or Google fallback (see above) |
| Dr. Anamika's photo | put the file in `public/`, set `clinic.doctorPhoto: '/dr-anamika.jpg'` in `src/content.js` | the clinic emblem shows instead |
| Patient reviews | `testimonials` in `src/content.js` (real Google reviews, with permission) | only the 5.0 ★ / 21 reviews card shows |
| Rating / count | `clinic.rating`, `clinic.reviewCount` | update when Google changes |
| Services, conditions, FAQ wording | `services`, `care`, `conditions`, `faqs` in `src/content.js` | have the doctor read them once |

Credentials shown on the site (B.H.M.S., Reg. No. 6745) come from the clinic's own signboard.
Emergency numbers: **112** is India's national emergency number, **108** is Gujarat's free ambulance service.

## Performance and accessibility

- Phones get fewer particles, a lower pixel ratio and no antialiasing; the scene drops resolution further if frames dip.
- 3D canvases stop rendering when scrolled off screen.
- No WebGL → a static SVG of the vial. `prefers-reduced-motion` → no smooth scroll, no auto-rotation, no marquee.
- Fonts: Fraunces and Manrope (SIL OFL 1.1) via Fontsource, bundled locally, no Google Fonts request.
