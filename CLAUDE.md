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
4. Fetches `users/{uid}` from Firestore. If missing, creates a profile stub with no role.
5. Role-checks against `ALLOWED_ROLES`. If not allowed → signs out and redirects to `index.html?error=access`.
6. Exposes globals and dispatches `authReady`.

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

**`index.html`** handles login inline — it does NOT use `auth-guard.js`.

---

## Role System

Roles are stored in Firestore at `users/{uid}.role` (string field).

| Role                  | Description                          | CentralHub | Academic Hub | Teachers Hub |
|-----------------------|--------------------------------------|:----------:|:------------:|:------------:|
| `central_admin`       | Super-admin, created manually only   | ✓          | ✓            | ✓            |
| `academic_coordinator`| Academic management staff            | ✗          | ✓            | ✓            |
| `teacher`             | Classroom teacher                    | ✗          | ✗            | ✓            |

**Teachers Hub allowed roles:** `['central_admin', 'academic_coordinator', 'teacher']` — the most permissive app, all platform roles can access it.

`central_admin` accounts are created **manually** in the Firebase Console (email/password), never via self-registration. New users who sign in for the first time get a Firestore profile with **no role**; a `central_admin` must assign a role before they can access protected pages.

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
