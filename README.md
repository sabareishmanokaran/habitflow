# HabitFlow – Habit Tracker PWA

A mobile-first habit tracker that installs on **Android and iPhone** from the browser and works offline.
No build step and no dependencies: plain HTML, CSS and JavaScript modules.

## Features
- **Build habits** (yes/no): daily, specific weekdays, or X times per week
- **Measure goals** (water, steps, minutes) with a +/− stepper and a progress bar
- **Quit / de-addiction**: live clean-time timer, milestones, money saved, slip log with triggers,
  pattern insights (top triggers, time of day), and an **SOS urge screen** (breathing guide,
  10-minute delay timer, your own reasons)
- Streaks with **skip/rest days** that don't break them, a GitHub-style history heatmap, and editable past days with notes
- Stats: 30-day completion, a 14-day trend, best weekdays, and per-habit rates
- Light/dark theme, JSON backup export/import, archive/restore
- Private: all data stays on the device (localStorage)

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
