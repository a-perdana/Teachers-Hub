# Teachers Hub — Architecture Reference

## What This App Is

Partner school teacher portal. Audiences: **subject_teacher**, **subject_leader**, **interviewer** (careers), **hiring_manager** (careers).

Key features: 11 Cambridge pacing pages (IGCSE / AS-A / Checkpoint × Math/Bio/Chem/Phys/Eng/Sci) + cohort trackers, teaching competency framework with 4-page CPD set, weekly checklists, KPI + Appraisal, Cambridge calendar/standards, induction (Year-1 mentees + mentors), careers + interview scorecard, announcements, message board, library.

**Vanilla HTML/CSS/JS** (no React, no bundler). Pages load Firebase via CDN.

**Deployment:** Vercel (`dist/`).

---

## Shared Firebase Backend

**Project:** `centralhub-8727b` (shared with AH / CH / Research Hub).

**SDK:** Firebase modular v10.7.1, CDN imports. NEVER use compat (`firebase.firestore()`).

**Config pattern:**
- `firebase-config.js` (gitignored) sets `window.ENV.*`
- Local dev: HTML pages include `<script src="firebase-config.js">` + inline fallback
- Production: `build.js` substitutes `__FIREBASE_*__` placeholders from Vercel env vars + strips the script tag

**Firestore rules:** maintained exclusively in `Central Hub/firestore.rules`. NEVER create one here. Deploy from CH:
```bash
cd "Central Hub" && firebase deploy --only firestore:rules --project centralhub-8727b
```

For full schema + collection catalogue, see [`docs/FIRESTORE_SCHEMA.md`](../docs/FIRESTORE_SCHEMA.md) and the root `CLAUDE.md`. This file documents only TH-touching aspects.

---

## Auth Pattern

Every protected page loads `auth-guard.js` as a module FIRST:
```html
<script type="module" src="auth-guard.js"></script>
```

Steps (in order):
1. Hide `document.body` (prevent flash)
2. Init Firebase (guarded against double-init)
3. `onAuthStateChanged` — no user → `/login`
4. Fetch / create `users/{uid}` profile (auto-assigns `role_teachershub: 'teachers_user'` + `approval_status_teachershub: 'pending'`)
5. **Domain check** — Google SSO email must be in `window.TEACHERS_ALLOWED_DOMAINS` (15 entries: 14 partner `.sch.id` + `eduversal.org`). Email/password accounts bypass. Fail → `/login?error=domain`
6. **Role check** — `role_teachershub ∈ ['teachers_admin','teachers_user']`
7. **Name prompt** if `displayName` missing
8. **Profile prompt** — until `school`, `subjects`, `classes`, `th_sub_roles` all filled. School auto-defaults from `partner_schools.domain` matching the email (multi-school domains leave picker empty)
9. **Approval check** — non-admin not yet `approved` → `/waiting`
10. **Page-access gate** + UI gating (see below)
11. Expose globals · dispatch `authReady`

**Globals after `authReady`:** `window.firebaseApp`, `window.auth`, `window.db`, `window.storage`, `window.currentUser`, `window.userProfile`.

`index.html` is the LOGIN page (no auth-guard). `waiting.html` polls every 30s.

---

## Role System

| Field | Values |
|---|---|
| `role_teachershub` | `'teachers_user'` (default) \| `'teachers_admin'` |
| `th_sub_roles[]` | `'subject_teacher'`, `'subject_leader'`, `'interviewer'`, `'hiring_manager'` |
| `approval_status_teachershub` | `'pending'` (default) \| `'approved'` \| `'rejected'` |

Sub-roles are composable. Common combinations: `[subject_teacher, interviewer]`, `[subject_leader, hiring_manager]`.

**isAdmin pattern (pacing pages map this to internal `'coord'`):**
```js
const isAdmin = profile?.role_teachershub === 'teachers_admin';
```

**Sub-roles control:**
- `weekly-checklist.html` tab visibility (`subject_leader` adds a tab; admin sees both)
- `index.html` dashboard category filter (categories with `visible_to[]` filtered to matching sub-role)
- Careers dropdown gated via `page_access_config` (`careers-admin` + `careers-compare` → `hiring_manager`; `interview-scorecard` → `interviewer` or `hiring_manager`)
- `careers-admin.html` query scoping — `hiring_manager` sees only own school via `where('schoolId','==',mySchoolId)` (rule helper `isHiringMgrSameSchool()` enforces same)

`weekly-checklist.html` Firestore IDs: `${ACADEMIC_YEAR}_w${week}_${currentPlatform}` where currentPlatform ∈ `'teachers'` / `'subject_leader'`.

---

## Firestore Collections (TH-touching)

| Collection | Purpose | Write |
|---|---|---|
| `users/{uid}` | Profile | owner / central_admin |
| `partner_schools/{schoolId}` | School directory + `domain` (drives auto-default) + `classes/{classId}` subcollection | central_admin |
| `staff` · `announcements` · `central_documents` | CH-managed | central_admin |
| `topics/{topicId}` + `replies/` | Message board | any auth user |
| `calendar_settings/current` · `calendar_events/{docId}` | **Read-only here.** Drives pace alerts + holiday detection | central_admin |
| `math_pacing/year9-10` · `biology_pacing/year9-10` · `chemistry_pacing/year9-10` · `physics_pacing/year9-10` | IGCSE pacing structure (`chapters[]`, `classes[]`, `objPrefixes[]`). Read via `onSnapshot`. | central_admin |
| `cambridge_syllabus/{subjectCode}_{code}` | Syllabus reference (e.g. `0580_C1.1`). Loaded into `window.syllabusIndex` at startup. | read-only |
| `cambridge_scheme_of_work/{subjectCode}_{code}` | Scheme-of-work content. Lazy-fetched per-code on Teaching Guide tab; cached in `window._sowCache`. **Seeded:** IGCSE Math 0580 + Lower Secondary Math 0862 + AS Math 9709. Others gracefully show "No teaching guide available yet". | read-only |
| `userProgress/{uid}` | Per-teacher pacing progress. Owner-only writes. | owner |
| `competency_framework/teachers` (+ `levels/` subcoll) | TH track of 3-track Cambridge competency. Lazy-fetched on modal open in `learning-path.html`. | central_admin |
| `content_overrides_teachers/{compId}_{lvl}` | Admin reading override. **HTML allowlist sanitiser on save AND render** (`P/BR/STRONG/EM/B/I/U/MARK/UL/OL/LI/H3/H4` only). Closes XSS where compromised admin could inject script into every other teacher's modal. | teachers_admin |
| `user_competencies/{uid}` | TH progress under `earned`; AH leadership under `earned_academic`; CH specialist under `earned_central` | owner per platform |
| `competency_evidence/{docId}` | TH submissions with `platform: 'teachers'`. Storage: `competency_evidence/teachers/{uid}/{ts}_{filename}` (≤25 MB). | owner create / central_admin review |
| `competency_certificates/{certId}` | Filtered `where('platform','==','teachers')` | central_admin |
| `cambridge_crossref/index` | Single aggregator doc — every CTS sibling across KPI / Appraisal / Competency / Induction. Read by `cambridge-crossref.js` runtime (build-injected) when CTS chips are clicked. | central_admin |
| `teacher_kpi_submissions/{uid}_{periodId}` | KPI self-assessment. **Always writes `schoolId`** (rule rejects mismatch). Lets AH evaluators be school-scoped. | owner; AH evaluator flips status fields only |
| `teacher_self_appraisals/{uid}_{year}` | Self-appraisal. `get` = owner / admin / same-school AH evaluator; `list` = admin only. Evaluators look up by deterministic doc ID. | owner |
| `page_access_config/{slug}` | Per-page sub-role visibility. Cache key: `pac:__all__:teachershub` | central_admin (write from CH `/page-access`) |
| `nav_config/teachershub` | Admin-editable navbar config (label/order/hidden). Edited via `bootNavEditor()` → `/nav-edit-simple.js`. Shape: `{platform, items:[{key,label,hidden}], updatedAt}` | teachers_admin |
| `feedbacks/{fbId}` | Single canonical feedback collection. TH writes via `partials/navbar.js` Feedback modal; stamps `__src: 'teachershub'`. | any auth (create); central_admin (read/update/delete) |
| `weekly_progress/{docId}` | Doc id: `${uid}_${ACADEMIC_YEAR}_w${week}_${currentPlatform}`. **Always include `schoolId`** for the `isAHUserAtSameSchool()` rule helper. | owner |
| `induction_assignments/{menteeUid}` | One active induction. Read by `my-induction` (mentee) + `my-mentees` (mentor — `where('mentorUid','==',uid)`). Charter NN3+NN4 enforced on rule. | central_admin |
| `induction_progress/{uid}_{taskId}` | Task completion. Mentee writes from `my-induction.html` checkbox toggles. | owner / mentor / school-leader |
| `induction_observations/{obsId}` | Mentor observations. **Charter NN1: never feeds appraisal.** | observer (mentor) |
| `induction_journal/{entryId}` | Mentee's daily 3-sentence journal. **Charter NN2: HQ never reads.** Default visibility `mentee_and_mentor`. | owner (mentee) |
| `induction_pulses/{pulseId}` | Weekly 1-question pulse. | owner (mentee) |
| `mentor_certifications/{uid}_{type}` | Read by `my-mentees.html` for cert-active banner. | central_admin |
| `induction_programs/{programId}` | 3 handbook templates. Read by `my-induction.html`. | central_admin via seed only |
| `job_positions` · `interview_question_sets` · `job_applications` · `interview_scorecards/{appId}_{interviewerUid}` (submitted = **immutable** at rule level) · `job_application_audit` (append-only) | Careers Module — see [Careers section below](#careers--interview-module) | various |

**Timestamp:** `createdAt` (serverTimestamp). NEVER `timestamp`.

---

## Build & Deployment

`node build.js` → `dist/`. What it does:
1. Reads source HTML files in `ROUTES` map
2. Substitutes `__FIREBASE_*__` placeholders, strips `<script src="firebase-config.js">`
3. Rewrites internal `.html` href → clean URL via `LINK_REWRITES`
4. Writes `dist/<slug>/index.html` (`index.html` → `dist/index.html`)
5. Copies `auth-guard.js`, `base.css`, `partials/`, other assets

**Vercel env vars required:** `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`.

**Public + auth-flow pages skip auth-guard AND `cambridge-crossref.js` injection** (controlled in `build.js` skip lists): `index.html`, `login.html`, `waiting.html`, `careers.html`, `careers-apply.html`, `careers-status.html`. New public pages need both skips.

---

## Pages

**Auth + landing:**
- `index.html` (`/`) — LOGIN page, no auth-guard
- `login.html` / `waiting.html` — auth flow

**Pacing (11 — share `partials/pacing-page.css` + `partials/pacing-shared.js`, generated from 3 templates):**
- IGCSE: `igcse-{math,physics,chemistry,biology}` (Year 9–10)
- AS/A-Level: `as-alevel-{math,biology,chemistry,physics}` (Year 11–12)
- Checkpoint: `checkpoint-{math,english,science}` (Year 7–8)

Each page defines `window.PACING_CONFIG` and runs `initSubjectConfig()`. Status states: `pending` → `inprogress` → `done` cycle (checkbox); `revisit` is a 4th state set via status pill (amber). Per-topic meta: planned + actual hours, week + pace alert, AO badge, paper indicator, teacher/coordinator notes, diagnostic tag, resource links. **Bulk "✓ All Done"** on chapter header.

**Objectives modal** (per topic): two tabs — Syllabus Detail (default) + Teaching Guide (lazy-fetches `cambridge_scheme_of_work/{prefix}_{code}`, renders learning objectives + activities with `I/E/F/TWM/SDG` tag badges + misconceptions + vocabulary + resources + SDG links). Subject-to-prefix wiring in `build.js`'s `SUBJECT_CONFIG.syllabusPrefix`.

**Hours Report tab:** GLH projection vs Cambridge 130 GLH target + per-topic actual vs planned variance.

**Offline persistence:** `enableIndexedDbPersistence(db)` on `authReady`.

**Trackers (11 — Subject Leader cohort dashboards):** `igcse-{math,biology,chemistry,physics}-tracker`, `as-alevel-…-tracker`, `checkpoint-…-tracker`. Share `partials/pacing-tracker-core.js` + `.css`.

**My Work:**
- `weekly-checklist` (tabs by `th_sub_roles`)
- `teacher-self-assessment` (KPI) · `teacher-kpi-results`
- `teacher-self-appraisal` · `teacher-appraisal-results`
- `competency-framework` · `learning-path` · `my-portfolio` · `my-certificates`
- `certificate-verify` (in `PAGE_ACCESS_BYPASS` — any signed-in user can verify by id)

**Induction (Year 1):**
- `my-induction` — Subject Teacher mentee dashboard. 4 phases (Survival 1-3 wk → Foundation 4-12 wk → Mastery-Building 13-36 wk → Integration 37-44 wk). Sidebar journal + pulse + mentor card.
- `my-mentees` — Subject Leader mentor view (Charter NN3 — only certified mentors). Per-mentee cards + 4-week pulse mini + cert expiry banner.
- `observation-entry` — `?menteeUid=X&type=...&number=N`. 4-domain rubric (Planning/Management/Instruction/Assessment, 1-4 each) + Glow/Grow/Go + SMART action plan. Co-teach + mentee-observes-X types hide rubric (unscored).
- `handbook` — print-friendly handbook viewer.

**Hub:**
- `announcements` · `messageboard` · `library` · `cambridge-calendar` · `cambridge-standards` · `orientation` · `surveys`

**Careers (see section below):** `careers` · `careers-apply` · `careers-status` (public 3) + `careers-admin` · `interview-scorecard` · `careers-compare` (auth'd 3)

**Settings:** `settings` (in `PAGE_ACCESS_BYPASS` — reachable from profile dropdown only, doesn't need a page-access doc, isn't surfaced as a card or main-nav link)

---

## Dashboard Pattern (`index.html`)

Single accordion-based dashboard. Cards = static `<a class="resource-card">` defined in inline `resources` array (44 entries). Categories managed by admin from the dashboard itself.

- **Category collection:** `th_resource_sections`. Each doc: `{ name, color, cardIds[], visible_to[], hidden_for_users, order, createdAt }`
- **Admin actions per category** (only when `body.is-admin`): move-up · move-down · manage-cards · **eye-toggle** (`hidden_for_users` boolean) · rename · delete
- **Uncategorized accordion** = cards not assigned to a category. Eye-toggle on the Uncategorized header writes a meta doc `_uncategorized_settings_` (carries `isMeta: true` + `order: -1` + `visible_to_users` flag). The non-admin path subscribes to the meta doc DIRECTLY by ID — `where('visible_to','==',[])` would miss it because the meta doc has no `visible_to` field.
- **Visual cue for admins** on hidden sections: `body.is-admin .category-section.is-hidden-for-users > .category-header` gets `opacity:0.55` + appended " (hidden)" in red.
- **No auto-card section** — every navbar slug has a hand-crafted entry in the `resources` array. New TH page → add a `resources` entry + a navbar item + a `seed-th-page-access.js` entry, then re-seed.

**Pilot enrolment filter:** `filterPilotSystemCards(db, profile, isAdmin)` on `authReady` reads `partner_schools/{schoolId}.enabled_systems[]` and hides cards from disabled systems (KPI / Appraisal / Competency). Admin and HQ users bypass.

---

## Page-Access Gating

`auth-guard.js` enforces three layers (TH-specific selectors):

1. **Per-navigation gate** — direct URL access redirects to `/?denied=<slug>` if not allowed.
2. **UI gating** (`applyPageAccessGating`):
   - desktop navbar items: `[data-nav-key]` → `data-pa-hidden="1"`
   - dashboard cards: `a.resource-card[href]` / `a.card[href]` (slug from href)
   - **mobile drawer items**: `[data-mobile-nav-key]` (different attribute because mobile clones don't carry `data-nav-key`)
   - empty `.th-dd-wrap` / `.th-dd-col` / `.th-mobile-section` get hidden too
   - **Mobile drawer rebuilds** when `data-pa-hidden` / `data-th-subject-hidden` flips — MutationObserver in `partials/navbar.js`'s `addItem` skips source anchors carrying these flags
3. **Subject + level gate** for pacing/tracker pages (`PAGE_SUBJECT_LEVEL_MAP`): user's `subjects[]` + `classes[]` must cover the page's subject + level. `data-th-subject-hidden="1"` attribute.

**Bypass list** (`PAGE_ACCESS_BYPASS`): `''`, `'index'`, `'login'`, `'waiting'`, `'settings'`, `'certificate-verify'`, `'careers'`, `'careers-apply'`, `'careers-status'`.

**Cache key:** `pac:__all__:teachershub` (5 min TTL in `sessionStorage`).

**Profile dropdown** — reads `profile.school` + `profile.th_sub_roles` + `profile.subjects/classes` and shows them as **read-only chips**. School + sub-role mutations only via CH `/console`. Sign-out button. (No inline edit form — would let users self-promote.)

---

## Navbar Loading Pattern

All protected pages (except pacing pages with their own layout):

```js
fetch('partials/navbar.html')
  .then(r => r.text())
  .then(html => {
    document.getElementById('navbar-container').innerHTML = html;
    initNavbar();
    if (typeof window._pendingNavbarUpdate === 'function')   { window._pendingNavbarUpdate();  window._pendingNavbarUpdate  = null; }
    if (typeof window._pendingBadgeSetup    === 'function')  { window._pendingBadgeSetup();    window._pendingBadgeSetup    = null; }
    if (typeof window._pendingFeedbackSetup === 'function')  { window._pendingFeedbackSetup(); window._pendingFeedbackSetup = null; }
  });
```

The `_pending*` callbacks handle the race between navbar fetch completing and `authReady`.

**Navbar dropdown semantic structure** (4 dropdowns):
- **Pacing** (4 columns): IGCSE × 4 / AS-A × 4 / Checkpoint × 3 / Trackers × 11
- **My Work** (5 columns, `th-dd-panel--xwide` 980px min-width): Daily / KPI / Appraisal / Competency / Induction
- **Hub** (2 columns): Communications (announcements, messageboard, surveys) / Reference (library, cambridge-calendar, cambridge-standards, orientation)
- **Careers** (visible to `hiring_manager` / admins): Hiring Funnel · Public careers ↗ (Interview Scorecard + Compare Candidates removed from navbar 2026-05-06 — reachable from inside the funnel; interviewers arrive via emailed `?app=<id>` links)

`groupKeys` map in `partials/navbar.js` lists all slugs per dropdown so the trigger highlights when user is on a child page.

---

## Careers + Interview Module

Public teacher recruitment + structured interview scoring. 6 pages + 6 collections + 1 Storage path.

**Three audiences:**
| Audience | URL | Auth |
|---|---|---|
| **Candidates** | `/careers`, `/careers-apply?position=X`, `/careers-status` | none — public, in `PAGE_ACCESS_BYPASS` |
| **Interviewers** | `/interview-scorecard?app=X` | `interviewer` sub-role + assigned to application |
| **Hiring panel** | `/careers-admin`, `/careers-compare?ids=…` | `central_admin` / `teachers_admin` / `hiring_manager` |

**Two new sub-roles** in `th_sub_roles[]`: `interviewer` (assigned-only scorecard access) and `hiring_manager` (funnel + same-school scoping). Set from CH `/console` 4-checkbox panel.

**Storage:** `careers/cv/{positionId}/{ts}_{filename}` — public write ≤10 MB, MIME limited to PDF/DOC/DOCX.

**Email flow (2026-05-06 — Resend, replaces Firebase Trigger Email):**
- All candidate-facing emails go through `partials/mailer.js` → POST to `MAIL_SERVICE_URL/send-transactional` (Resend on Railway).
- **FROM:** `Eduversal Education <noreply@eduversal.org>` (DKIM-signed, verified domain). **Reply-To:** `careers@eduversal.org` (Railway `DEFAULT_REPLY_TO` env, fallback if caller omits per-call `replyTo`).
- 4 templates (set `templateName` per call): `application_received` (mor — sent on apply submit fire-and-forget), `interview` (mor — sent on schedule), `offer` (green — sent on offered decision), `reject` (neutral grey — sent on rejected decision). Each renders a branded wrapper with eyebrow text + colour-coded gradient header.
- `enqueueMail()` in `careers-admin.html` is now a thin wrapper around `window.eduversalMailer.sendTransactional()` (kept for callsite compatibility). Sends are non-fatal — failure logs to console + toast, never blocks the underlying Firestore write.
- The legacy `mail/{auto}` Firestore queue + Firebase Trigger Email extension is no longer used. New TH pages that need to email candidates should call `window.eduversalMailer.sendTransactional()` directly.

**Scorecard immutability:** rule blocks all field changes once `status:'submitted'`. To "reopen" a scorecard later, add an admin-only Cloud Function path — NOT a client rule loosen.

**Audit log:** every funnel action writes `job_application_audit/{autoId}` with `before` / `after` / `byUid`. Append-only.

**HQ → TH role caveat:** TH `auth-guard.js` admin bypass is `teachers_admin` only, NOT `central_admin`. CH admins clicking "Hiring Funnel ↗" need either `teachers_admin` OR `hiring_manager` on their TH profile. Operational fix: assign HQ users `teachers_admin` from CH `/console`.

---

## Cambridge Competency Framework — TH track

The `teachers` track of the 3-track Cambridge competency system (root CLAUDE.md "Three Rating Systems" has the full architecture).

**TH-specific:**
- 6-domain × 24-competency taxonomy in `competency_framework/teachers` (Firestore-seeded). Inline fallback for graceful degradation.
- `learning-path.html` lazy-fetches per-(comp, level) content from `levels/` subcollection on modal open.
- KPI rows + Appraisal F-items render mor `CTS X.Y` chips → click opens cross-ref popover.
- Per-school pilot enrolment via `partner_schools.enabled_systems[]` (admin + HQ bypass).

**Don't reintroduce:**
- Domain IDs are canonical: `smc/lcp/afl/icp/pie/cce`. Legacy `cur/asm/cls/ped/dig/pro` gone everywhere.
- `my-portfolio.html` Storage import MUST come from `firebase-storage.js`, NOT `firebase-firestore.js`.
- `auth-guard.js` exposes `window.storage`; the upload flow relies on it.
- Admin override (`learning-path.html` → `content_overrides_teachers`) HTML allowlist on save AND render — strict tag list, all attributes stripped.

---

## Key Files

| File | Purpose |
|---|---|
| `auth-guard.js` | Auth + role gate (modular SDK v10) |
| `build.js` | Vercel build — ROUTES map, link rewrites, asset copy |
| `base.css` | Shared design tokens + components |
| `partials/navbar.html` | Shared navbar partial |
| `partials/navbar.js` | `initNavbar()`, `setupNavBadges()`, feedback modal, mobile drawer (`addItem` walks `.th-dd-col` children, mirrors `data-pa-hidden`/`data-th-subject-hidden` from source anchors) |
| `partials/pacing-shared.js` | Build-injected via `<!-- PACING_SHARED_JS -->`. Helpers (`escHtml`, `safeUrl`, `allTopics`, `parseObjCodes`, `showToast`), constants (`PAGE_SIZE=5`, `PACE_LABELS`, `DIAG_LABELS`), exam countdown, syllabus filter, diagnostic tags, coord notes, actual hours, variance report, GLH projection. **Don't duplicate inline.** |
| `partials/pacing-page.css` | Shared CSS for all 11 pacing pages. Each page's `<style>` only carries `:root` accent overrides. |
| `partials/pacing-tracker-core.js` + `.css` | Shared module + CSS for all 11 tracker pages |
| `firebase-config.js` / `.example.js` | Local dev config (gitignored) / template |
| `vercel.json` | Vercel config |
| `dist/` | Build output (not committed) |
| `scripts/` | One-off Node scripts: `seed-orientation.js`, `fix-orientation-videos.js`, `update-orientation-links.js`. Run from repo root. Service account at `../../keys/centralhub-service-account.json`. |

---

## Important Conventions

- **Modular SDK v10 only.** Never compat (`firebase.firestore()`).
- **`createdAt` not `timestamp`.**
- **`academic_coordinator` not `coordinator`** — old legacy name renamed during migration.
- **Never commit `firebase-config.js`** — gitignored.
- **Auth guard goes first** on protected pages (first `<script type="module">`).
- **Use `authReady`** — never call `window.db` before the event fires.
- **`central_documents` not `documents`** — collection rename.
- **`pacing-hub.html` is deleted** — content moved to `index.html` cards.
- **Shared pacing logic in `partials/pacing-shared.js`** — don't duplicate inline.
- **Shared pacing CSS in `partials/pacing-page.css`** — each page's `<style>` carries only `:root` accent overrides.
- **Build-time placeholders** `<!-- PACING_SHARED_CSS -->` and `<!-- PACING_SHARED_JS -->` — VS Code linter complains but browsers are fine. Keep them.
- **Competency domain IDs canonical:** `smc/lcp/afl/icp/pie/cce`. Legacy IDs (`cur-1` etc.) gone.
- **Nav-edit toolbar uses `hidden` HTML attribute, not CSS-only display.** `#btnNavEdit` and `#navEditBar` ship with `hidden` so non-admins never see them — even if `nav-edit-simple.js` 404s. CSS-only `display:none` lives inside the JS-injected `<style>` block; if the import 404s the bar would render full-width with naked text. Past incident, fixed 2026-05-03.
- **Profile dropdown is read-only.** Only displayName edits go to `setDoc(userRef, {displayName})`. School / sub-roles / subjects / email NEVER editable from here — only via CH `/console`. Past incident in AH (2026-05-05): inline edit form let users self-promote.
- **Mobile drawer page-access gating uses `[data-mobile-nav-key]`.** Drawer items are clones of desktop items with a different attribute name. Auth-guard handles both selectors; new mobile patterns need the same.
- **Decorative full-screen background layers must `pointer-events: none`.** Past incident: `bg-container` swallowed every footer click. Children inherit through.
- **Reserved Firestore doc IDs** — `__name__`-style (double-underscore start AND end). Use `_uncategorized_settings_` (single underscore each side), not `__uncategorized_settings__`.
- **Firestore `orderBy` query silently drops docs missing the field.** Meta doc must include `order: -1` to be picked up by the `orderBy('order','asc')` listener.
