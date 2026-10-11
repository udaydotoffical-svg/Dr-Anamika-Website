# Switching on live booking and the Desk app

Two things are built into this repo:

- **The website** (`/`): patients pick a real free time from the clinic's calendar.
- **Avighna Desk** (`/desk`): a private page Dr. Anamika saves to her iPhone home screen. New requests
  show up there; she taps **Confirm** and one more tap opens her own WhatsApp/Messages with the reply
  already written for that one patient.

Until you finish the steps below the website keeps working with its simple request form, so nothing
breaks while you set up. Do this once, about 15 minutes. You do the setup; she only uses the app.

## 1. Deploy the site on Vercel
<https://vercel.com/new> → import `Dr-Anamika-Website`. Leave the build settings alone. Deploy.

## 2. Add the database (free)
In the Vercel project: **Storage → Create Database → Upstash Redis → Free**, connect it to this
project. Vercel adds two variables for you (`KV_REST_API_URL` and `KV_REST_API_TOKEN`). That is where
bookings are kept. No code or accounts beyond that.

## 3. Add the settings
Project → **Settings → Environment Variables**, add these, then **Redeploy**:

| Name | Value |
|---|---|
| `DESK_PASSPHRASE` | **Required.** A long passphrase only she knows, at least 10 characters. Four random words works well, e.g. `copper-lantern-river-monsoon`. This is what keeps strangers out of the Desk. Do not reuse a password. |
| `DESK_ORIGIN` | Recommended. The address the app is used at, e.g. `https://avighna-clinic.in`. Face ID is tied to one web address, so pin it once you have the final one. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | For "new booking" alerts. Make them by running `npx web-push generate-vapid-keys` on any computer. Optional. |
| `VAPID_SUBJECT` | `mailto:` plus the clinic's email, e.g. `mailto:clinic@example.com`. Needed with the keys above. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Strongly recommended. Cloudflare's free bot check on the booking form (see below). Set both or neither. |
| `CLINIC_ADDRESS` | Optional. Address printed in patients' calendar files. |
| `VITE_CLINIC_PHONE` | Optional. Clinic number as `919876543210`. Turns on Call buttons. |

## 4. Hand it to Dr. Anamika (on her iPhone)
Order matters: an app saved to the Home Screen keeps its own sign-in, separate from Safari.
1. Open `https://your-site/desk` in **Safari**.
2. Tap the **Share** button, then **Add to Home Screen**.
3. Close Safari. Open **Avighna Desk** from her **home screen** and sign in there with the passphrase.
4. Inside the app: **Settings → Set up Face ID**. After that she unlocks it with her face. The passphrase
   is only a backup.
5. **Settings → Turn on alerts** (needs iOS 16.4 or newer, and only works from the Home Screen app).
   Without alerts the app still works; it refreshes by itself every 30 seconds while open.

## Stop fake bookings (Cloudflare Turnstile, free, 5 minutes)
Without this, a bot could fill the calendar with fake requests. Turnstile is Cloudflare's invisible
"are you a robot?" check. Real patients almost never see it.
1. Make a free account at <https://dash.cloudflare.com> (turn on two-step login). Open **Turnstile → Add widget**.
2. Name it `Avighna booking`, add the clinic's web address (and the `.vercel.app` one if you use it), choose
   **Managed**, and create it.
3. Copy the **Site Key** into `TURNSTILE_SITE_KEY` and the **Secret Key** into `TURNSTILE_SECRET_KEY` in
   Vercel, then redeploy.
Once both are set, a booking without a valid check is refused, even if Cloudflare is down (it never lets
unchecked bookings through). If a patient's ad-blocker stops the check loading, the form tells them to
turn it off or phone the clinic. Leave both empty and the site works as before, just without the check.

## How "is this really her?" is handled
- Nothing on `/desk` shows until she signs in. Anyone else sees only the sign-in box.
- She signs in with the passphrase, or with **Face ID**, which is stored on her phone and cannot be
  copied or guessed. After Face ID is set up she never needs to type it.
- Five wrong passphrase tries lock that device out for 15 minutes, and there is a global lock too.
- Sign-in cookies are private to the browser, last 30 days, and are tied to the site.
- **Lost phone, or someone knows the passphrase?** Change `DESK_PASSPHRASE` in Vercel and redeploy.
  In the app, **Settings → Sign out on all devices** instantly ends every session.

## What is stored, and for how long
Name, mobile number, visit type, time, and the optional note a patient types. Patients are told not to
write medical details in the note. Records are deleted automatically after about 13 months. The
patient's own booking page (`/my?ref=...`) shows only their first name. This is general guidance, not
legal advice: if the clinic wants a formal privacy notice, have it reviewed.

## Day to day
- A new request arrives as **Needs reply**. Tap it, then **Confirm** or **Decline**. A message to the
  patient is pre-written; she taps WhatsApp or Messages and presses send. It goes to that one patient only.
- **Calendar → Add appointment** for people who phone or walk in. **Time off** blocks days or hours so
  the website stops offering them. **Settings** changes visit lengths, how far ahead people can book, and
  whether bookings are confirmed automatically (off by default, so she stays in control).
- Patients can cancel from their private link; the time becomes free again at once.

## Trying it on your own computer
```bash
npm install
npm run api        # terminal 1: local booking service (stores data in .data/dev.json)
npm run dev        # terminal 2: the site at http://localhost:5173 (Desk at /desk/)
# dev passphrase: "dev passphrase 123"
```
Tests: `npm run test:api` (booking rules, races, sign-in), `npm run test:turnstile`, and after `npm run build`: `npm run test:desk`, `npm run test:site`, `npm run test:bot`.
