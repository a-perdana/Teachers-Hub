# Teachers Hub — Architecture Reference

## What This App Is

Teachers Hub is a tool suite for Eduversal's teachers, academic coordinators, and central administrators. It provides pacing guides (IGCSE subjects), an announcements feed, a message board, and a resource library. It is a **vanilla HTML/CSS/JS application** (no React, no bundler framework). Pages are plain `.html` files with inline scripts that load Firebase via CDN.

**Deployment:** Vercel (build output in `dist/`).

---

## Monorepo Structure

```
Eduversal Web/                    ← monorepo root (not a deployed app)
├── Academic Hub/                 ← analytics dashboards (Vercel)
├── CentralHub/                   ← admin control panel (Vercel)
│   ├── firestore.rules           ← ⚠️ ONLY Firestore rules file — deploy from here
│   └── firebase.json             ← firebase deploy config
├── Teachers Hub/                 ← THIS app (Vercel)
├── migrate-auth-and-firestore.js ← one-time migration script
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
3. Listens on `onAuthStateChanged`. If no user → redirects to `index.html`.
4. Fetches (or creates) Firestore profile. If missing, creates it and assigns `role_teachershub: 'teachers_user'` automatically.
5. **Domain check** — Google SSO users must have an email from `window.TEACHERS_ALLOWED_DOMAINS` (15 school domains). Email/password accounts bypass this check. Fails → `index.html?error=domain`.
6. Role check — `role_teachershub` must be in `['teachers_admin', 'teachers_user']`. Fails → `index.html?error=access`.
7. Name prompt if `displayName` is missing.
8. Exposes globals and dispatches `authReady`.

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

Each platform has its own Firestore role field. Teachers Hub uses `role_teachershub`.

| Field              | Values                                          |
|--------------------|-------------------------------------------------|
| `role_teachershub` | `'teachers_user'` (default) \| `'teachers_admin'` |

**Teachers Hub allowed roles:** `['teachers_user', 'teachers_admin']`

First login automatically assigns `teachers_user` via `setDoc` with `{ merge: true }`. No manual intervention needed for basic access. `teachers_admin` must be set manually via CentralHub's `console.html`.

**isAdmin check pattern (pacing pages map this to internal `'coord'` state):**
```js
const isAdmin = profile?.role_teachershub === 'teachers_admin';
```

Legacy migration: if `role_teachershub` is absent on an existing user doc, `auth-guard.js` derives the role from the old `role` field and writes the new field.

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
| `igcse_syllabus/{docId}` | Syllabus reference items indexed by objective code (e.g. C1.1). Loaded once at startup. | read-only here |
| `userProgress/{uid}`    | Per-teacher pacing progress. Each teacher writes only their own doc. Fields: `statuses`, `statuses_<class>` maps keyed by `ci-ti`. | owner (teacher) |

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
1. Reads each `.html` source file.
2. Replaces `__FIREBASE_*__` placeholders with Vercel environment variables.
3. Strips the `<script src="firebase-config.js"></script>` tag.
4. Writes output files into `dist/` with the same filenames (no slug renaming for Teachers Hub).
5. Copies `auth-guard.js` into `dist/`.

### Vercel environment variables required:
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

### Pages built:
| File                        | Purpose                                |
|-----------------------------|----------------------------------------|
| `index.html`                | Login / home (no auth guard)           |
| `announcements.html`        | Announcements feed                     |
| `messageboard.html`         | Message board                          |
| `library.html`              | Resource library                       |
| `pacing-hub.html`           | IGCSE pacing guide hub                 |
| `igcse-math-pacing.html`    | Maths pacing guide                     |
| `igcse-physics-pacing.html` | Physics pacing guide                   |
| `igcse-chemistry-pacing.html`| Chemistry pacing guide                |
| `igcse-biology-pacing.html` | Biology pacing guide                   |

---

## Key Files

| File                         | Purpose                                                    |
|------------------------------|------------------------------------------------------------|
| `auth-guard.js`              | Auth + role gate for protected pages (modular SDK v10)     |
| `build.js`                   | Vercel build script — placeholder replacement              |
| `firebase-config.js`         | Local dev config (gitignored)                              |
| `firebase-config.example.js` | Template for firebase-config.js                            |
| `vercel.json`                | Vercel deployment config (build cmd, output dir)           |
| `seedFirestore.js`           | One-time seed script for initial Firestore data            |
| `dist/`                      | Build output (not committed)                               |

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
