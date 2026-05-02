# Teachers Hub — Folder Map

Quick reference for "what lives where" in this repo. The codebase is a vanilla
HTML/JS app — every page is a top-level `.html` file in the repo root. This doc
groups them by feature so you can find what you need without scanning a flat list.

For build/auth/deploy details see [CLAUDE.md](../CLAUDE.md).

---

## 1. Pacing Pages (curriculum guides for teachers)

**Templates** (kept in root, generated into 11 subject pages by `build.js`):

| Template                           | Generates                                                                 |
|------------------------------------|---------------------------------------------------------------------------|
| `igcse-pacing-template.html`       | 4 pages: igcse-{math, biology, chemistry, physics}-pacing                 |
| `checkpoint-pacing-template.html`  | 3 pages: checkpoint-{math, english, science}-pacing                       |
| `as-alevel-pacing-template.html`   | 4 pages: as-alevel-{math, biology, chemistry, physics}-pacing             |

The actual `igcse-math-pacing.html` etc. **do not exist on disk** — `build.js`
synthesises them in memory from the templates + per-subject config blocks
(`IGCSE_SUBJECTS`, `CHECKPOINT_SUBJECTS`, `ASALEVEL_SUBJECTS`) and writes them
straight into `dist/`.

**Shared pacing engine** (in `partials/`):
- `pacing-shared.css` / `pacing-shared.js` — utility helpers, exam countdown,
  syllabus filter, diagnostic tags, GLH projection. Injected via build-time
  placeholders (`<!-- PACING_SHARED_CSS -->`, `<!-- PACING_SHARED_JS -->`).
- `pacing-page.css` — full page layout (sidebar, chapter blocks, modals).
- `pacing-schedule.js` — week scheduling logic.
- `pacing-week-timeline.js` — weekly timeline view.

## 2. Tracker Pages (subject leader cohort views)

| Template               | Generates                                              |
|------------------------|--------------------------------------------------------|
| `tracker-template.html`| 11 pages: one tracker per pacing subject (`*-tracker`) |

**Shared tracker engine** (in `partials/`):
- `pacing-tracker-core.css` / `pacing-tracker-core.js` — access check, data
  loading, render functions for all 11 trackers.

## 3. Appraisal & KPI

| File                              | Route                          |
|-----------------------------------|--------------------------------|
| `teacher-self-appraisal.html`     | `/teacher-self-appraisal`      |
| `teacher-self-assessment.html`    | `/teacher-self-assessment`     |
| `teacher-appraisal-results.html`  | `/teacher-appraisal-results`   |
| `teacher-kpi-results.html`        | `/teacher-kpi-results`         |
| `surveys.html`                    | `/surveys`                     |

**Reference data** in `resources/`:
- `appraisal-framework-v2.json` — appraisal rubric (also lives in Academic Hub
  — keep both in sync, see monorepo CLAUDE.md).
- `appraisal-levels.json`, `walkthrough-rubric.json`.

## 4. Competency Framework

| File                          | Route                    |
|-------------------------------|--------------------------|
| `competency-framework.html`   | `/competency-framework`  |
| `learning-path.html`          | `/learning-path`         |
| `my-portfolio.html`           | `/my-portfolio`          |
| `my-certificates.html`        | `/my-certificates`       |

Domain IDs: `smc`, `lcp`, `afl`, `icp`, `pie`, `cce`. See CLAUDE.md for ID
conventions.

## 5. Communication & Daily Use

| File                       | Route                 |
|----------------------------|-----------------------|
| `announcements.html`       | `/announcements`      |
| `messageboard.html`        | `/messageboard`       |
| `library.html`             | `/library`            |
| `weekly-checklist.html`    | `/weekly-checklist`   |
| `cambridge-calendar.html`  | `/cambridge-calendar` |
| `orientation.html`         | `/orientation`        |

## 6. Auth & Profile

| File                  | Route        | Notes                                           |
|-----------------------|--------------|-------------------------------------------------|
| `index.html`          | `/`          | Login / home (handles auth inline, no guard)    |
| `login.html`          | `/login`     | Login page                                      |
| `waiting.html`        | `/waiting`   | Approval-pending (polls Firestore every 30s)    |
| `settings.html`       | `/settings`  | User settings                                   |
| `auth-guard.js`       | —            | Module guard included by every protected page   |

---

## Supporting Files

| Path                            | Purpose                                                    |
|---------------------------------|------------------------------------------------------------|
| `build.js`                      | Vercel build — `ROUTES` map, template generation, link rewrites |
| `vercel.json`, `package.json`   | Deploy config                                              |
| `base.css`, `tokens.css`        | Design system (DM Sans, CSS variables, components)         |
| `firebase-config.js` (gitignored) | Local Firebase secrets                                   |
| `firebase-config.example.js`    | Template for the above                                     |
| `partials/navbar.html`, `navbar.js` | Shared light-theme navbar                              |
| `partials/firebase-env.html`    | `__FIREBASE_*__` placeholder block injected via `<!-- FIREBASE_ENV -->` |
| `interactive/`                  | Standalone HTML tools (no auth) — IGCSE math topic explorers |
| `images/`                       | Static images (e.g. `Cambridge_Calendar.png`)              |
| `keys/`                         | Service account JSON (gitignored)                          |
| `scripts/`                      | One-off Node scripts: `seed-orientation.js`, `fix-orientation-videos.js`, `update-orientation-links.js`. Run with `node scripts/<name>.js`. They expect `../../keys/centralhub-service-account.json` (i.e. monorepo root `keys/`). |
| `dist/`                         | Build output (gitignored, regenerated)                     |
| `node_modules/`                 | npm deps (gitignored)                                      |

---

## Why Not Folder-Per-Feature?

Tempting, but `build.js` reads each source file by flat filename
(`fs.readFileSync(path.join(__dirname, filename))`) and `LINK_REWRITES` rewrites
relative `href="foo.html"` patterns. Moving HTML pages into subfolders breaks
both. A real folder restructure means rewriting `build.js`'s `ROUTES` map +
all link rewrites + the navbar partial + retesting Vercel deploy. Not worth it
mid-curriculum-seed; revisit once the syllabus / scheme-of-work seeding work
settles down.
