// End-to-end test of the public website's live booking, the patient's /my page, and the fallback.
// Needs: `npm run build` first. Run: node test/site.e2e.mjs [outDir for screenshots]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { addDays, nowParts } from '../shared/schedule.js'
const { chromium } = createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright')

const PASS = 'correct horse battery'
const out = process.argv[2]
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sitee2e-'))
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? '  ✓' : '  ✗ FAIL'} ${m}`) }
const BASE = 'http://localhost:4173'

const api = spawn(process.execPath, ['dev-server.mjs'], { env: { ...process.env, API_PORT: '8787', DESK_PASSPHRASE: PASS, DESK_ORIGIN: BASE, DESK_DEV_STORE: path.join(tmp, 's.json') }, stdio: ['ignore', 'pipe', 'inherit'] })
const prev = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => api.stdout.on('data', (d) => String(d).includes('api on') && r()))
await new Promise((r) => setTimeout(r, 2500))

const pub = (p, body) => fetch(`${BASE}/api/public/${p}`, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.3.3.' + Math.floor(Math.random() * 250) }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json())

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const open = async (vp, hash = '/') => {
  const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 800, hasTouch: vp.width < 800 })
  const page = await ctx.newPage(); page.setDefaultTimeout(40000)
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()))
  await page.goto(BASE + hash, { waitUntil: 'load' })
  await page.waitForSelector('.loader', { state: 'detached', timeout: 40000 }).catch(() => {})
  return { ctx, page, errs }
}
const toBooking = async (page) => { await page.evaluate(() => document.getElementById('visit').scrollIntoView()); await page.waitForTimeout(1800) }

console.log('1. live booking card (desktop)')
{
  const { ctx, page, errs } = await open({ width: 1440, height: 900 })
  await toBooking(page)
  await page.waitForSelector('.days-scroll')
  ok((await page.locator('.days-scroll .day').count()) === 15, 'shows today + 14 days')
  ok((await page.locator('.time-grid .tm').count()) > 0, 'shows real free times')
  ok(/60 min/.test(await page.locator('.type').first().textContent()), 'visit types show how long they take')
  await page.click('button[type=submit]')
  ok((await page.locator('.book .err').count()) >= 3, 'submitting empty asks for time, name and number')
  await page.locator('.type:has-text("Counselling")').click()
  await page.waitForSelector('.time-grid .tm')
  await page.click('.seg button:has-text("Online")')
  await page.waitForTimeout(800)
  const times = await page.locator('.time-grid .tm').allTextContents()
  ok(times.length > 0 && times.every((t) => /am|pm/.test(t)) && !times.some((t) => /^(5|6|7|8)/.test(t.trim()) && /pm/.test(t)), 'online shows only the 9–1 daytime slots')
  await page.click('.seg button:has-text("In clinic")')
  await page.waitForTimeout(600)
  const dayBtn = page.locator('.days-scroll .day:not(:disabled)').nth(1)
  await dayBtn.click()
  await page.waitForSelector('.time-grid .tm')
  await page.locator('.time-grid .tm').first().click()
  ok(/Counselling/.test(await page.locator('.picked').textContent()), 'chosen visit, day and time are summarised')
  await page.fill('input[autocomplete=name]', 'Asha Patel')
  await page.fill('input[type=tel]', '98765 43210')
  await page.fill('textarea', 'Stress at work')
  if (out) await page.screenshot({ path: path.join(out, 'site-1-booking.png') })
  await page.click('button[type=submit]')
  await page.waitForSelector('.book-done')
  ok(/Request sent/.test(await page.locator('.book-done h3').textContent()), 'request is sent; waits for the doctor to confirm')
  const mine = await page.locator('.book-done a:has-text("See or cancel")').getAttribute('href')
  ok(/^\/my\?ref=/.test(mine), 'patient gets a private link')
  ok((await page.locator('.book-done a:has-text("calendar")').getAttribute('href')).startsWith('/api/public/ics?ref='), 'and an add-to-calendar file')
  if (out) await page.screenshot({ path: path.join(out, 'site-2-success.png') })
  ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs[0] : ''))

  console.log('2. the patient page (/my)')
  await page.goto(BASE + mine)
  await page.waitForSelector('.my-card h1:has-text("Waiting")')
  ok(/Counselling/.test(await page.locator('.done-sum').textContent()) && /Asha/.test(await page.locator('.done-sum').textContent()), 'shows the booking, first name only')
  ok(!/9876/.test(await page.content()), "the patient's phone number is not on the page")
  if (out) await page.screenshot({ path: path.join(out, 'site-3-my.png') })
  const ref = new URL(page.url()).searchParams.get('ref')
  page.once('dialog', (d) => d.accept())
  await page.click('button:has-text("Cancel appointment")')
  await page.waitForSelector('.my-card h1:has-text("Cancelled")')
  ok(true, 'patient can cancel on their own')
  ok((await page.locator('a:has-text("Book another time")').count()) === 1, 'and is offered another booking')
  ok((await pub(`status?ref=${ref}`)).cancelledBy === 'patient', 'server records that the patient cancelled')
  await page.goto(BASE + '/my?ref=garbage')
  await page.waitForSelector('.my-card h1:has-text("could not find")')
  ok(true, 'a wrong link shows a friendly message, not an error')
  await ctx.close()
}

console.log('3. someone else takes the slot while you are choosing')
{
  const { ctx, page } = await open({ width: 1440, height: 900 })
  await toBooking(page)
  await page.waitForSelector('.time-grid .tm')
  await page.locator('.time-grid .tm').first().click()
  // work out which slot is selected via the API: the first free one for the default day
  const dayInfo = (await pub('availability?type=new&mode=clinic')).days.find((d) => d.free > 0)
  const first = (await pub(`slots?date=${dayInfo.date}&type=new&mode=clinic`)).slots[0]
  await pub('book', { name: 'Someone Else', phone: '9111122222', type: 'new', mode: 'clinic', date: dayInfo.date, start: first })
  await page.fill('input[autocomplete=name]', 'Latecomer')
  await page.fill('input[type=tel]', '9333344444')
  await page.click('button[type=submit]')
  await page.waitForSelector('.book .err:has-text("just taken")')
  ok(true, 'a friendly "that time was just taken" message appears')
  await page.waitForTimeout(1000)
  ok((await page.locator('.book-done').count()) === 0, 'no double booking, form stays open')
  const left = await pub(`slots?date=${dayInfo.date}&type=new&mode=clinic`)
  ok(!left.slots.includes(first), 'the taken time is no longer offered')
  await ctx.close()
}

console.log('4. phone layout of the booking card and /my')
{
  for (const w of [280, 320, 390]) {
    const { ctx, page } = await open({ width: w, height: 800 })
    await toBooking(page)
    await page.waitForSelector('.days-scroll')
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(over <= 1, `no sideways scrolling at ${w}px with the live booking card`)
    const clipped = await page.evaluate(() => [...document.querySelectorAll('.book .type, .book .tm, .book .btn, .book input')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length)
    ok(clipped === 0, `nothing in the booking card is cut off at ${w}px`)
    if (out && w === 390) await page.screenshot({ path: path.join(out, 'site-4-mobile-booking.png') })
    await ctx.close()
  }
  const { ctx, page } = await open({ width: 360, height: 740 }, '/my?ref=nope')
  await page.waitForSelector('.my-card')
  ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, '/my fits a 360px phone')
  await ctx.close()
}

console.log('5. fallback: booking service switched off')
{
  api.kill()
  await new Promise((r) => setTimeout(r, 800))
  const { ctx, page, errs } = await open({ width: 1440, height: 900 })
  await toBooking(page)
  await page.waitForSelector('.book form, form.book')
  ok((await page.locator('.days-scroll').count()) === 0, 'live calendar is not shown when the service is down')
  ok((await page.locator('form.book .seg').count()) === 1 && /Book an appointment/.test(await page.locator('.book-head h3').textContent()), 'the simple request form is shown instead')
  await page.fill('.fields .field:nth-of-type(1) input', 'Fallback Fran')
  await page.fill('input[type=tel]', '9876543210')
  await page.click('button[type=submit]')
  await page.waitForSelector('.book-done')
  ok(true, 'the fallback form still completes')
  ok(errs.length === 0, 'no console errors' + (errs.length ? ': ' + errs[0] : ''))
  await ctx.close()
}

await browser.close()
prev.kill()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
