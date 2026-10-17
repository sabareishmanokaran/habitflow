# HabitFlow – Habit Tracker PWA

A mobile-first habit tracker that installs on **Android and iPhone** from the browser and works offline.
No build step and no dependencies: plain HTML, CSS and JavaScript modules.

## Features
- **Welcome & profile**: name, age, sex; the app greets you by name and counts your days on HabitFlow
- **Dashboard** with four sections:
  - **To Do / Improve**: yes/no habits or amount goals (steps, water, minutes)
  - **Not To Do**: things you avoid, with a clean-time timer, milestones, slip log, pattern
    insights and an **SOS urge screen**
  - **Reduce**: daily limits (sugar, TV, junk food)
- **Swipe right** to complete a habit for the day. For Not To Do it's a **bedtime check-in**,
  checked against the device clock (from your bedtime until 4 AM, not after a slip)
- **Built-in timer** for timed habits (no-phone time, reading, TV, meditation): it runs until you
  touch the screen, then offers Stop (save the time) or Continue
- **Friends**: share a day card (image + link) and add friends from their links. Totals only, no
  habit names, and no server: the snapshot travels inside the link
- Streaks with rest days, history heatmaps, stats (tap the days counter), light/dark theme,
  backup export/import
- Private: all data stays on the device (localStorage)

## Single-file version
`python tools/build-standalone.py` writes `dist/habitflow.html`, one self-contained file with
everything inlined.

## Run locally
Either of these works:
```bash
python -m http.server 5173
```
```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Then open http://localhost:5173

## Put it on your phone
Phones need the app served over **HTTPS**. Deploy the folder as a static site (all free):
- **Netlify Drop**: drag this folder onto https://app.netlify.com/drop
- **GitHub Pages**: push to a repo → Settings → Pages
- **Cloudflare Pages / Vercel**: import the folder as a static site

Then open the URL on your phone:
- **iPhone**: Safari → Share → *Add to Home Screen*
- **Android**: Chrome → ⋮ → *Install app*

## Project layout
```
index.html             app shell + tab bar
css/app.css            design tokens, light/dark, components
js/logic.js            pure date, streak, stats and quit-timer logic
js/store.js            localStorage persistence, export/import
js/app.js              router, screens, sheets, events
sw.js                  service worker (offline)
manifest.webmanifest   install metadata
icons/                 app icons (regenerate with tools/make-icons.ps1)
```

When you change files, bump `CACHE` in `sw.js` so installed copies update.

## Roadmap ideas
- Reminders via Web Push (needs a small backend; iOS supports push only for installed PWAs)
- Cloud sync / accounts (e.g. Supabase)
- Mood and sleep check-ins with correlation insights
- AI weekly coach
