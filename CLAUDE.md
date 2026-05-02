# Teachers Hub — Architecture Reference

## What This App Is

Teachers Hub is the **partner school teacher portal** for Eduversal's network. Its users are teaching staff at partner schools:

- **Subject Teachers** — classroom teachers delivering Cambridge curriculum
- **Subject Leaders** — heads of department overseeing subject delivery and cohort progress

Key features: curriculum pacing guides for all Cambridge levels (IGCSE, AS/A-Level, Checkpoint — 11 subjects total), subject leader cohort trackers, teaching competency framework with learning path and evidence portfolio, weekly checklists (role-based), teacher KPI and appraisal results, Cambridge exam calendar, surveys, announcements feed, message board, and resource library.

New users complete a profile setup (school, subjects, classes, sub-role) then require approval from a `central_admin` before accessing the platform. It is a **vanilla HTML/CSS/JS application** (no React, no bundler framework). Pages are plain `.html` files with inline scripts that load Firebase via CDN.

**Deployment:** Vercel (build output in `dist/`).

---

## Monorepo Structure

```
Eduversal Web/                    ← monorepo root (not a deployed app)
├── Academic Hub/                 ← analytics dashboards (Vercel)
├── Central Hub/                  ← admin control panel (Vercel)
│   ├── firestore.rules           ← ⚠️ ONLY Firestore rules file — deploy from here
│   └── firebase.json             ← firebase deploy config
├── Teachers Hub/                 ← THIS app (Vercel)
└── keys/                         ← service account JSON keys (gitignored)
```

Each app has its **own GitHub repository** and its **own deployment target**, but all three share the single Firebase backend `centralhub-8727b`.

---

## Shared Firebase Backend

**Project ID:** `centralhub-8727b`

| Field                | Value                                      |
|----------------------|--------------------------------------------|
| authDomain           | centralhub-8727b.firebaseapp.com           |
| projectId            | centralhub-8727b                           |
| storageBucket        | centralhub-8727b.firebasestorage.app       |
| messagingSenderId    | 244951050014                               |
| apiKey / appId       | gitignored — see Firebase Console          |

**SDK:** Firebase modular v10 (`10.7.1`), loaded from the CDN:
```
https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js
https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js
https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js
```
Do NOT use the compat SDK (`firebase/app`, `firebase.firestore()` namespace style). Always use modular imports.

---

## Firebase Config Pattern

**`firebase-config.js`** (gitignored) sets `window.ENV` at page load:
```js
window.ENV = {
  FIREBASE_API_KEY: "...",
  FIREBASE_AUTH_DOMAIN: "centralhub-8727b.firebaseapp.com",
  // ...
};
```

**Local development:** HTML pages include `<script src="firebase-config.js"></script>` plus an inline fallback:
```html
<script>
  if (!window.ENV) window.ENV = { FIREBASE_API_KEY: "...", ... };
</script>
```

**Production (Vercel):** `build.js` replaces `__FIREBASE_*__` placeholders embedded in each HTML file and strips the `<script src="firebase-config.js">` tag entirely. The `firebase-config.js` file is NOT deployed.

**Template:** `firebase-config.example.js` — copy to `firebase-config.js` and fill in the two secrets.

---

## Auth Pattern

Every protected page loads `auth-guard.js` as a module:
```html
<script type="module" src="auth-guard.js"></script>
```

`auth-guard.js` (modular SDK v10):
1. Hides `document.body` immediately (prevents flash of content).
2. Initialises Firebase (guards against double-init with `getApps()`).
3. Listens on `onAuthStateChanged`. If no user → redirects to `/login`.
4. Fetches (or creates) Firestore profile. If missing, creates it and assigns `role_teachershub: 'teachers_user'` + `approval_status_teachershub: 'pending'` automatically.
5. **Domain check** — Google SSO users must have an email from `window.TEACHERS_ALLOWED_DOMAINS` (15 school domains). Email/password accounts bypass this check. Fails → `/login?error=domain`.
6. Role check — `role_teachershub` must be in `['teachers_admin', 'teachers_user']`. Fails → `/login?error=access`.
7. Name prompt if `displayName` is missing.
8. **Profile setup prompt** — shown until `school`, `subjects`, `classes`, and `th_sub_roles` are all filled. Returns all four fields; saved with `setDoc` merge.
9. **Approval check** — if `approval_status_teachershub !== 'approved'` (and not `teachers_admin`) → redirect to `/waiting`. `waiting.html` polls every 30s and redirects on approval.
10. Exposes globals and dispatches `authReady`.

**Allowed domains** are defined centrally in `auth-guard.js` as `window.TEACHERS_ALLOWED_DOMAINS` (15 entries: 14 partner school `.sch.id` domains + `eduversal.org`). Individual pages reference this via `const allowedDomains = window.TEACHERS_ALLOWED_DOMAINS` — do NOT redefine the list inline.

**`index.html`** (login page) handles auth inline and does NOT use `auth-guard.js`. It has its own copy of the domain list for the login-time check.

**Globals exposed after `authReady`:**
| Global               | Value                                |
|----------------------|--------------------------------------|
| `window.firebaseApp` | FirebaseApp instance                 |
| `window.auth`        | Auth instance                        |
| `window.db`          | Firestore instance                   |
| `window.currentUser` | firebase.User object                 |
| `window.userProfile` | Firestore `users/{uid}` document     |

**Listening for auth in page scripts:**
```js
document.addEventListener('authReady', ({ detail: { user, profile } }) => {
  // safe to use window.db, window.currentUser, window.userProfile here
});
```

---

## Role System

Teachers Hub uses `role_teachershub` as the primary access field. **The legacy `role` field is no longer read** — `auth-guard.js` uses only `role_teachershub`.

| Field              | Values                                            |
|--------------------|---------------------------------------------------|
| `role_teachershub` | `'teachers_user'` (default) \| `'teachers_admin'` |
| `th_sub_roles[]`   | `'subject_teacher'`, `'subject_leader'`           |
| `approval_status_teachershub` | `'pending'` (default) \| `'approved'` \| `'rejected'` |

**Teachers Hub allowed roles:** `['teachers_user', 'teachers_admin']`

First login automatically assigns `teachers_user` + `approval_status_teachershub: 'pending'` via `setDoc` with `{ merge: true }`. Users must fill the profile prompt (school/subjects/classes/th_sub_roles) then wait on `waiting.html` until a `central_admin` sets `approval_status_teachershub: 'approved'` in `console.html`. `teachers_admin` bypasses the approval check entirely.

**Sub-roles (`th_sub_roles[]`)** are set in `console.html` and control:
- `weekly-checklist.html` — Subject Leader tab is shown only if `th_sub_roles.includes('subject_leader')`. Users without this sub-role see only the Subject Teacher tab (no tab bar). Admins always see both tabs.
- `index.html` dashboard — categories with a `visible_to[]` field are filtered: `subject_leader` sub-role shows subject_leader categories, otherwise `subject_teacher`. Categories with empty `visible_to` are shown to everyone.

A user can have both `subject_teacher` and `subject_leader` in the array simultaneously.

**isAdmin check pattern (pacing pages map this to internal `'coord'` state):**
```js
const isAdmin = profile?.role_teachershub === 'teachers_admin';
```

**weekly-checklist.html Firestore IDs** follow the pattern `${ACADEMIC_YEAR}_w${week}_${currentPlatform}` where `currentPlatform` is `'teachers'` or `'subject_leader'`.

---

## Firestore Collections

| Collection              | Purpose                                      | Write access         |
|-------------------------|----------------------------------------------|----------------------|
| `users/{uid}`           | User profiles (uid, email, displayName, photoURL, role, createdAt) | owner or central_admin |
| `schools/{schoolId}`    | Partner school records                       | central_admin        |
| `staff/{staffId}`       | Staff records                                | central_admin        |
| `announcements/{annId}` | Platform-wide announcements                  | central_admin        |
| `central_documents/{docId}` | CentralHub-managed documents            | central_admin        |
| `topics/{topicId}`      | Message board topics                         | any authorised user  |
| `topics/{topicId}/replies/{replyId}` | Message board replies           | any authorised user  |
| `calendar_settings/current` | **Read-only here.** Academic year config set by Central Hub: `academicYearStart`, `totalTeachingWeeks`, `terms[]`. Loaded at startup via `loadCalendarSettings()` to drive pace alerts. Never write to this from Teachers Hub. | central_admin (write) |
| `calendar_events/{docId}` | **Read-only here.** Academic calendar events. Pacing pages read `category === 'Public Holiday'` entries to build `HOLIDAY_RANGES` for teaching-day calculations. | central_admin (write) |
| `math_pacing/year9-10`  | IGCSE math pacing structure: `chapters[]`, `classes[]`, `objPrefixes[]`. Written by CH admin, read here via `onSnapshot`. | central_admin (write) |
| `biology_pacing/year9-10` | IGCSE biology pacing — same structure as math_pacing. | central_admin (write) |
| `chemistry_pacing/year9-10` | IGCSE chemistry pacing — same structure as math_pacing. | central_admin (write) |
| `physics_pacing/year9-10` | IGCSE physics pacing — same structure as math_pacing. | central_admin (write) |
| `cambridge_syllabus/{docId}` | Syllabus reference items indexed by objective code (e.g. C1.1). Doc ID format `{subjectCode}_{code}`. Loaded once at startup into `window.syllabusIndex`. | read-only here |
| `cambridge_scheme_of_work/{docId}` | Scheme-of-work content per ref code (teaching activities, resources, SDG links). Doc ID format `{subjectCode}_{code}` (same as `cambridge_syllabus`). **Lazy-fetched per code** when the Teaching Guide tab on the objectives modal opens; results cached in `window._sowCache`. Read-only here; managed via monorepo-root seed scripts. **IGCSE Math 0580 + Lower Secondary Math 0862 (Stages 7-8-9, 179 entries) + AS & A Level Mathematics 9709 (38 entries across Pure 1/2/3, Mechanics, Probability & Statistics 1/2) seeded.** Biology/chemistry/physics (IGCSE & AS) + Checkpoint English (0861) + Checkpoint Science (0893) not yet — UI gracefully shows "No teaching guide available yet" when a doc is missing. The 0862 + 9709 schema also includes `commonMisconceptions[]` and `keyVocabulary[]` fields rendered by the Checkpoint and AS/A-Level templates' Teaching Guide tabs. | read-only here |
| `userProgress/{uid}`    | Per-teacher pacing progress. Each teacher writes only their own doc. Fields: `statuses`, `statuses_<class>` maps keyed by `ci-ti`. | owner (teacher) |
| `user_competencies/{uid}` | Teacher competency progress. Fields: `earned` (map of compId → `{level, date}`), `matDone` (map of matId → bool). Written by the owner, read by `learning-path.html` and `competency-framework.html`. | owner (teacher) |
| `competency_evidence/{docId}` | Evidence submissions for competency level certification. Fields: `uid`, `platform` (`'teachers'`), `compId`, `compName`, `domain`, `level`, `description`, `fileUrl`, `fileName`, `status` (`'pending'`\|`'approved'`\|`'rejected'`), `reviewerNote`, `createdAt`, `updatedAt`. Written by teacher (create), reviewed by `teachers_admin` via competency-admin in Central Hub. | owner (create), central_admin (review) |

**Timestamp field:** always `createdAt` (serverTimestamp). Do not use `timestamp` — that was the legacy name.

**Firestore rules** live **exclusively** in `CentralHub/firestore.rules` — the single source of truth for all three apps.

⚠️ **Always deploy rules from the `CentralHub/` directory:**
```bash
cd "Eduversal Web/CentralHub"
firebase deploy --only firestore:rules --project centralhub-8727b
```
Teachers Hub does NOT have its own `firestore.rules`. Never create one — it would overwrite the shared rules with an outdated version.

---

## Build & Deployment

**Platform:** Vercel
**Build command:** `node build.js`
**Output directory:** `dist/`

### What `build.js` does:
1. Reads each `.html` source file listed in the `ROUTES` map.
2. Replaces `__FIREBASE_*__` placeholders with Vercel environment variables.
3. Strips the `<script src="firebase-config.js"></script>` tag.
4. Rewrites internal `.html` href links to clean URL paths via `LINK_REWRITES`.
5. Writes output files into `dist/<slug>/index.html` (clean URL structure). `index.html` goes to `dist/index.html`.
6. Copies `auth-guard.js`, `base.css`, `partials/` (navbar.html, navbar.js, pacing-shared.js), and other assets into `dist/`.

### Vercel environment variables required:
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

### Pages built (ROUTES map → clean URL):
| File                           | Clean URL                    | Purpose                                          |
|--------------------------------|------------------------------|--------------------------------------------------|
| `index.html`                   | `/`                          | Login / home (no auth guard)                     |
| `waiting.html`                 | `/waiting`                   | Approval pending page (polls Firestore every 30s)|
| `announcements.html`           | `/announcements`             | Announcements feed                               |
| `messageboard.html`            | `/messageboard`              | Message board                                    |
| `library.html`                 | `/library`                   | Resource library                                 |
| `weekly-checklist.html`        | `/weekly-checklist`          | Weekly teacher checklist (tabs by th_sub_roles)  |
| `cambridge-calendar.html`      | `/cambridge-calendar`        | Cambridge exam calendar                          |
| `surveys.html`                 | `/surveys`                   | Survey responses                                 |
| `teacher-self-assessment.html` | `/teacher-self-assessment`   | Teacher self-assessment form                     |
| `teacher-kpi-results.html`     | `/teacher-kpi-results`       | Teacher KPI results view                         |
| `igcse-math-pacing.html`       | `/igcse-math`                | IGCSE Maths pacing guide                         |
| `igcse-physics-pacing.html`    | `/igcse-physics`             | IGCSE Physics pacing guide                       |
| `igcse-chemistry-pacing.html`  | `/igcse-chemistry`           | IGCSE Chemistry pacing guide                     |
| `igcse-biology-pacing.html`    | `/igcse-biology`             | IGCSE Biology pacing guide                       |
| `checkpoint-math-pacing.html`  | `/checkpoint-math`           | Checkpoint Maths pacing guide                    |
| `checkpoint-english-pacing.html`| `/checkpoint-english`       | Checkpoint English pacing guide                  |
| `checkpoint-science-pacing.html`| `/checkpoint-science`       | Checkpoint Science pacing guide                  |
| `as-alevel-math-pacing.html`    | `/as-alevel-math`             | AS/A-Level Maths pacing guide                    |
| `as-alevel-biology-pacing.html` | `/as-alevel-biology`          | AS/A-Level Biology pacing guide                  |
| `as-alevel-chemistry-pacing.html`| `/as-alevel-chemistry`       | AS/A-Level Chemistry pacing guide                |
| `as-alevel-physics-pacing.html` | `/as-alevel-physics`          | AS/A-Level Physics pacing guide                  |
| `competency-framework.html`    | `/competency-framework`      | Teaching Competency Framework — 6 domains        |
| `learning-path.html`           | `/learning-path`             | Learning Path — materials & progress per competency |
| `my-portfolio.html`            | `/my-portfolio`              | Evidence portfolio — submit & review evidence    |
| `my-certificates.html`         | `/my-certificates`           | My earned competency certificates                |
| `igcse-math-tracker.html`      | `/igcse-math-tracker`        | Subject Leader tracker — IGCSE Math              |
| *(+ other tracker pages)*      |                              | Subject Leader trackers for all subjects         |

---

## Key Files

| File                         | Purpose                                                    |
|------------------------------|------------------------------------------------------------|
| `auth-guard.js`              | Auth + role gate for protected pages (modular SDK v10)     |
| `build.js`                   | Vercel build script — ROUTES map, placeholder replacement, link rewrites, copies assets |
| `base.css`                   | Shared design system (DM Sans, CSS variables, components)  |
| `partials/navbar.html`       | Shared navbar HTML partial (light theme)                   |
| `partials/navbar.js`         | Navbar init (`initNavbar()`), badge logic (`setupNavBadges()`), feedback button |
| `partials/pacing-shared.js`  | Shared JS for all pacing pages — injected via `<!-- PACING_SHARED_JS -->`. Contains: utility helpers (`escHtml`, `safeUrl`, `allTopics`, `parseObjCodes`, `showToast`), constants (`PAGE_SIZE`, `PACE_LABELS`, `DIAG_LABELS`), exam countdown, syllabus filter, diagnostic tags, coord notes, actual hours, variance report, GLH projection |
| `partials/pacing-page.css`   | Shared CSS for all 11 pacing pages — linked via `<link>`. Each page keeps only a minimal `:root` block with `--accent`, `--accent-2`, `--accent-dark` and semantic color variables |
| `partials/pacing-tracker-core.js` | Shared ES module for all 11 tracker pages — access check, data loading, all render functions |
| `partials/pacing-tracker-core.css` | Shared CSS for all 11 tracker pages |
| `firebase-config.js`         | Local dev config (gitignored)                              |
| `firebase-config.example.js` | Template for firebase-config.js                            |
| `vercel.json`                | Vercel deployment config (build cmd, output dir)           |
| `dist/`                      | Build output (not committed)                               |
| `scripts/`                   | One-off Node scripts (Firebase Admin SDK). Currently: `seed-orientation.js`, `fix-orientation-videos.js`, `update-orientation-links.js`. Run from repo root: `node scripts/<name>.js`. They expect the service account at `../../keys/centralhub-service-account.json` (monorepo-root `keys/`). Not part of the build. |
| `docs/STRUCTURE.md`          | Folder map — groups root HTML pages into 6 functional clusters (Pacing, Tracker, Appraisal, Competency, Communication, Auth). Read this first when orienting in the repo. |

---

## Pacing Pages — Feature Reference

All 11 pacing pages share a common architecture via `partials/pacing-page.css` (shared CSS) and `partials/pacing-shared.js` (shared JS, build-time injected). Each page defines `window.PACING_CONFIG` and runs `initSubjectConfig()` to populate the topbar from config rather than hardcoded HTML.

**Topic status states:** `pending` → `inprogress` → `done` → `pending` (cycle via checkbox). `revisit` is a 4th state set via the status pill (amber, means needs re-teaching; outside the cycle).

**Per-topic meta shown in topic rows:**
- Planned hours (editable by admin) + Actual hours (editable by all)
- Week number + pace alert badge (overdue / behind / on-track / upcoming)
- Status pill (Pending / In Progress / Done / ↺ Revisit)
- AO badge (AO1 = Knowledge & techniques, AO2 = Analyse & interpret, or both) — auto-inferred from topic text, override via `t.ao` field
- Paper indicator badge (P1+P3 Core / P2+P4 Ext / P1/2/3/4) — derived from syllabus code prefix (C = Core, E = Extended)
- Teacher note + Coordinator note + Diagnostic tag (Weak / Review / Good)
- Resource links

**Bulk actions:** "✓ All Done" button on chapter header (hover to reveal; admin always sees it). Toggles all topics in chapter between done ↔ pending.

**Objectives modal (per topic — opens by clicking a code badge):** two-tab layout, default tab is **Syllabus Detail** (preserves prior behaviour). The **Teaching Guide** tab lazy-fetches `cambridge_scheme_of_work/{prefix}_{code}` per code on the topic, renders learning objectives, teaching activities (with `I`/`E`/`F`/`TWM`/SDG tag badges), common misconceptions, key vocabulary, external resource links, and SDG sustainability links. Tab implementation is duplicated across `igcse-pacing-template.html`, `checkpoint-pacing-template.html` and `as-alevel-pacing-template.html` (`switchObjTab()`, `renderTeachingGuide()`, and `window.fetchSchemeOfWork()` — module-scope, exposed on window because `showObj` is in the regular script block). The Checkpoint and AS/A-Level templates additionally render `commonMisconceptions[]` + `keyVocabulary[]` (0862 + 9709 schema fields). All four IGCSE pacing pages, all three Checkpoint pacing pages, and all four AS/A-Level pacing pages share their respective template — pages whose subject prefix has not been seeded yet (IGCSE biology/chemistry/physics, Checkpoint English/Science, AS/A-Level biology/chemistry/physics) show the tab but render "No teaching guide available yet". Subject-to-prefix wiring lives in `build.js`: `SUBJECT_CONFIG.syllabusPrefix` is set per subject (`'0580'` for IGCSE math, `'0862'` for Checkpoint math, `'9709'` for AS/A-Level math; absent for unseeded subjects).

**Syllabus Detail modal (separate from Objectives modal):** Shows Cambridge learning objectives + notes when a code in the Objectives modal is clicked through. Footer shows all 13 Cambridge command words (Calculate, Construct, Determine, Describe, Explain, Give, Plot, Show(that), Sketch, State, Work out, Write, Write down); words detected in the syllabus entry are highlighted blue.

**Hours Report tab:** GLH projection banner at top — compares total planned hours vs Cambridge's 130 GLH target, plus pace-extrapolated projected total. Below that: per-topic actual vs planned variance table.

**Offline persistence:** `enableIndexedDbPersistence(db)` called on `authReady` — teacher progress cached locally, survives connectivity drops. Fails gracefully on multiple tabs / unsupported browsers.

**`SUBJECT_CONFIG` block** (top of each pacing page) — only this block changes per subject:
```js
const SUBJECT_CONFIG = {
  collection, docId, syllabusPrefix,
  subjectKey, label, code, qualifier, years, accentColor,
  examLocalKey, examPapers,
  hasSyllabusFilter,   // true for IGCSE (shows Core/Extended UI)
  crossSubjects,       // other subjects shown in Weekly View
};
```

---

## Navbar Loading Pattern

All protected pages (except pacing pages which have their own layout) use this pattern:

```js
fetch('partials/navbar.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('navbar-container').innerHTML = html;
    initNavbar();
    if (typeof window._pendingNavbarUpdate === 'function') { window._pendingNavbarUpdate(); window._pendingNavbarUpdate = null; }
    if (typeof window._pendingBadgeSetup === 'function')   { window._pendingBadgeSetup();   window._pendingBadgeSetup   = null; }
    if (typeof window._pendingFeedbackSetup === 'function'){ window._pendingFeedbackSetup(); window._pendingFeedbackSetup= null; }
  });
```

Then in `authReady`:
```js
document.addEventListener('authReady', ({ detail: { user, profile } }) => {
  // Update navbar profile elements (name, avatar)
  const updateNavbarElements = () => { /* set #profileNameShort, #profileAvatar, #profileWrap */ };
  if (document.getElementById('profileNameShort')) updateNavbarElements();
  else window._pendingNavbarUpdate = updateNavbarElements;

  // Set up announcement/message board badge counters
  const doBadgeSetup = () => setupNavBadges(db, { onSnapshot, collection });
  if (document.getElementById('msgBoardBadge')) doBadgeSetup();
  else window._pendingBadgeSetup = doBadgeSetup;
});
```

The `_pending*` callbacks handle the race between navbar fetch completing and `authReady` firing.  
`setupNavBadges` is defined in `partials/navbar.js` — requires `onSnapshot` and `collection` from Firestore imports.

---

## Important Conventions

- **No React, no npm bundler.** All JS runs directly in the browser via CDN ESM imports.
- **Always use modular SDK v10.** Never use the compat namespace (`firebase.firestore()` etc.).
- **`createdAt` not `timestamp`** for all Firestore timestamp fields.
- **`academic_coordinator` not `coordinator`** — the old legacy role name was `coordinator`; it was renamed during the shared-project migration.
- **Never commit `firebase-config.js`.** It is in `.gitignore`.
- **Auth guard goes first.** On protected pages, `auth-guard.js` must be the first `<script type="module">` tag so it hides the body before any content renders.
- **Use `authReady` event** to gate all Firestore reads in page scripts — never call `window.db` before the event fires.
- **`central_documents` collection, not `documents`** — use the renamed collection name when linking to CentralHub documents.
- **`pacing-hub.html` is deleted** — its content was moved to `index.html` cards. Do not recreate it.
- **Shared pacing logic lives in `partials/pacing-shared.js`** — utility helpers (`escHtml`, `safeUrl`, `allTopics`, `parseObjCodes`, `showToast`), constants (`PAGE_SIZE=5`, `PACE_LABELS`, `DIAG_LABELS`), exam countdown, syllabus filter, diagnostic tags, coord notes, actual hours, variance report, GLH projection. Do not duplicate any of these inline in individual pacing pages.
- **Shared pacing CSS lives in `partials/pacing-page.css`** — all layout, sidebar, chapter blocks, table, modals. Each page's `<style>` block contains only `:root` with accent + semantic color variables. Do not add page-level CSS that belongs in the shared file.
- **`<!-- PACING_SHARED_CSS -->` and `<!-- PACING_SHARED_JS -->`** are build-time placeholders in pacing pages — VS Code CSS linter flags the HTML comment inside `<style>` as an error, but browsers handle it correctly. Do not remove these placeholders.
- **Competency framework IDs** — domain IDs: `smc`, `lcp`, `afl`, `icp`, `pie`, `cce`. Competency IDs: `smc-1..4`, `lcp-1..4`, `afl-1..4`, `icp-1..4`, `pie-1..4`, `cce-1..4`. Grounded in Cambridge Teacher Standards 2019 + Permendiknas No.16/2007. Do NOT revert to old IDs (`cur-1`, `asm-1` etc.) — Firestore data uses new IDs.
