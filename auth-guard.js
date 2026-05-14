// auth-guard.js — Teachers Hub (modular SDK v10)
// ─────────────────────────────────────────────────────────────────
// Include on every protected page.
// Depends on firebase-config.js setting window.ENV before this runs.
//
// Allowed roles: teachers_admin, teachers_user
//
// Exposes globals (set once authReady fires):
//   window.firebaseApp   — FirebaseApp instance
//   window.db            — Firestore instance
//   window.auth          — Auth instance
//   window.currentUser   — firebase.User object
//   window.userProfile   — Firestore users/{uid} document data
//
// Dispatches CustomEvent 'authReady' on document when auth + profile
// are confirmed, with detail: { user, profile }
// ─────────────────────────────────────────────────────────────────

import { initializeApp, getApps }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp, getDocs, query, orderBy, where, limit }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ── Platform identity ─────────────────────────────────────────────
const PLATFORM_KEY  = 'role_teachershub';        // per-user Firestore field
const APPROVAL_KEY  = 'approval_status_teachershub'; // 'pending' | 'approved'
const DEFAULT_ROLE  = 'teachers_user';

// Roles permitted to use Teachers Hub
const ALLOWED_ROLES = ['teachers_admin', 'teachers_user'];

// ── Allowed email domains (centralised — used by all pages) ───────
window.TEACHERS_ALLOWED_DOMAINS = [
  "scr.sch.id", "eibos.sch.id", "fatih.sch.id", "gcb.sch.id",
  "kesatuanbangsa.sch.id", "kbs.sch.id", "mega.sch.id", "pakarbelia.sch.id",
  "prestigeschool.sch.id", "pribadibandung.sch.id", "pribadidepok.sch.id",
  "pribadipremiere.sch.id", "semesta.sch.id", "tnafatih.sch.id", "eduversal.org",
];

// Hide page content until auth is confirmed (prevents flash of content)
document.body.style.visibility = 'hidden';

// ── Staff ↔ users bridge ─────────────────────────────────────────
// On a user's very first login, look up `staff/{...}` by emailLower.
//   - If found: copy schoolId/school/displayName/phone/position onto
//     the new users/{uid} doc + write userId back to the staff doc.
//   - If NOT found: auto-create a new staff doc keyed by
//     sha1(emailLower) (same id pattern as seed-staff.js) so the user
//     appears in /staff as Linked. Marked source:'auth-guard-autocreate'.
// All errors are swallowed — bridging is best-effort, never blocks signup.
async function staffDocIdFor(emailLower) {
  const buf = new TextEncoder().encode(emailLower);
  const hash = await crypto.subtle.digest('SHA-1', buf);
  const hex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 20);
}

async function applyStaffBridge(database, user, newProfile) {
  if (!user?.email) return;
  const emailLower = user.email.toLowerCase();
  try {
    const snap = await getDocs(query(
      collection(database, 'staff'),
      where('emailLower', '==', emailLower),
      limit(1),
    ));
    if (!snap.empty) {
      const staffDoc = snap.docs[0];
      const staff = staffDoc.data() || {};
      if (staff.schoolId)                        newProfile.schoolId = staff.schoolId;
      if (staff.school)                          newProfile.school = staff.school;
      if (!newProfile.displayName && staff.name) newProfile.displayName = staff.name;
      if (staff.phone)                           newProfile.phone = staff.phone;
      if (staff.position)                        newProfile.title = staff.position;
      newProfile.staffId = staffDoc.id;
      await setDoc(doc(database, 'staff', staffDoc.id), {
        userId:   user.uid,
        linkedAt: serverTimestamp(),
        invited:  false,
      }, { merge: true });
    } else {
      const staffId = await staffDocIdFor(emailLower);
      await setDoc(doc(database, 'staff', staffId), {
        name:       newProfile.displayName || user.displayName || '',
        email:      user.email,
        emailLower,
        schoolId:   newProfile.schoolId || null,
        school:     newProfile.school   || null,
        role:       'teacher',
        status:     'active',
        userId:     user.uid,
        linkedAt:   serverTimestamp(),
        invited:    false,
        source:     'auth-guard-autocreate',
        createdAt:  serverTimestamp(),
      });
      newProfile.staffId = staffId;
    }
  } catch (err) {
    console.warn('auth-guard: staff bridge failed (non-fatal)', err);
  }
}

// ── Initialise Firebase (guard against double-init) ──────────────
const firebaseConfig = {
  apiKey:            window.ENV.FIREBASE_API_KEY,
  authDomain:        window.ENV.FIREBASE_AUTH_DOMAIN,
  projectId:         window.ENV.FIREBASE_PROJECT_ID,
  storageBucket:     window.ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId:             window.ENV.FIREBASE_APP_ID,
};

const app     = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

window.firebaseApp = app;
window.auth        = auth;
window.db          = db;
window.storage     = storage;
// Expose Firestore helpers for navbar.js initTeachingProfile (set early; navbar.js picks them up after authReady)
window.__firestoreHelpers = { db, setDoc, doc };

// ── Page-access helpers ──────────────────────────────────────────
// Pages that never get gated (auth flow + dashboard itself).
// settings is reachable from the profile dropdown only (not the main
// navbar) — bypassed so it doesn't need a page_access_config doc.
const PAGE_ACCESS_BYPASS = new Set(['', 'index', 'login', 'waiting', 'settings', 'certificate-verify', 'careers', 'careers-apply', 'careers-status']);
const PAGE_ACCESS_TTL_MS = 5 * 60 * 1000; // 5 min sessionStorage cache

// ── Pilot-system gating (per-school enrolment) ─────────────────────
// partner_schools/{schoolId}.enabled_systems[] ⊂ {kpi, appraisal,
// competency, induction}. When the field is missing the school is
// treated as "all enabled" (back-compat); empty array means every
// system is explicitly disabled. Admins and HQ users (no schoolId)
// always bypass.
//
// PILOT_SLUG_MAP gates pages whose route slug belongs to a pilot
// system. Each entry maps a navbar / card slug to its parent system.
// When enabled_systems[] excludes that system the slug is hidden in
// navbar + dashboard + URL gate. Pilot-irrelevant slugs (pacing,
// trackers, hub, careers) are absent — they're always reachable.
const PILOT_SLUG_MAP = {
  // KPI track
  'teacher-self-assessment': 'kpi',
  'teacher-kpi-results':     'kpi',
  // Appraisal track
  'teacher-self-appraisal':    'appraisal',
  'teacher-appraisal-results': 'appraisal',
  // Competency track
  'competency-framework': 'competency',
  'learning-path':        'competency',
  'my-portfolio':         'competency',
  'my-certificates':      'competency',
  // Induction track
  'my-induction':          'induction',
  'my-mentees':            'induction',
  'handbook':              'induction',
  'mentor-certification':  'induction',
  'observation-entry':     'induction',
};

// Convert window.location.pathname to a clean URL slug (the doc ID
// in page_access_config). '/igcse-math' -> 'igcse-math';
// '/igcse-math-pacing.html' -> 'igcse-math-pacing'; '/' -> ''.
function currentPageKey() {
  const path = (window.location.pathname || '/').toLowerCase();
  let slug = path.replace(/^\/+/, '').replace(/\/+$/, '');
  slug = slug.replace(/\.html$/, '');
  if (slug.includes('/')) slug = slug.split('/')[0];
  return slug;
}

async function getPageAccessConfig(database, pageKey) {
  try {
    const raw = sessionStorage.getItem('pac:' + pageKey);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && (Date.now() - cached.at) < PAGE_ACCESS_TTL_MS) return cached.data;
    }
  } catch (_) {}

  let data = null;
  try {
    const snap = await getDoc(doc(database, 'page_access_config', pageKey));
    data = snap.exists() ? snap.data() : null;
  } catch (err) {
    // Fail-open on read errors — never lock everyone out on a transient blip.
    console.warn('page_access_config read failed for', pageKey, err);
    return null;
  }
  try {
    sessionStorage.setItem('pac:' + pageKey, JSON.stringify({ at: Date.now(), data }));
  } catch (_) {}
  return data;
}

async function getAllPageAccessConfigs(database) {
  try {
    const raw = sessionStorage.getItem('pac:__all__:teachershub');
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && (Date.now() - cached.at) < PAGE_ACCESS_TTL_MS) return new Map(cached.entries);
    }
  } catch (_) {}

  const map = new Map();
  try {
    // @lint-allow-unbounded — full config doc set (~37 small docs); cached for 5 min
    const snap = await getDocs(collection(database, 'page_access_config'));
    snap.forEach(d => {
      const data = d.data() || {};
      if (data.platform && data.platform !== 'teachershub') return;
      map.set(d.id, data);
    });
    sessionStorage.setItem('pac:__all__:teachershub', JSON.stringify({
      at: Date.now(),
      entries: [...map.entries()],
    }));
  } catch (err) {
    console.warn('page_access_config bulk read failed', err);
  }
  return map;
}

function slugFromHref(href) {
  if (!href) return '';
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return '';
    let p = url.pathname.toLowerCase();
    p = p.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.html$/, '');
    if (p.includes('/')) p = p.split('/').pop();
    return p;
  } catch (_) {
    return '';
  }
}

function applyPageAccessGating(configs, userSubRoles) {
  const isAllowed = (cfg) => {
    if (!cfg) return true;
    if (cfg.hidden === true) return false;
    const vt = Array.isArray(cfg.visible_to) ? cfg.visible_to : [];
    if (vt.length === 0) return true;
    return userSubRoles.some(r => vt.includes(r));
  };

  // 1. Navbar items
  document.querySelectorAll('[data-nav-key]').forEach(el => {
    const key = (el.getAttribute('data-nav-key') || '').toLowerCase();
    if (!key || PAGE_ACCESS_BYPASS.has(key)) return;
    if (!configs.has(key)) return;
    if (!isAllowed(configs.get(key))) el.setAttribute('data-pa-hidden', '1');
    else                              el.removeAttribute('data-pa-hidden');
  });

  // 2. Dashboard cards. TH index.html builds them as <a class="resource-card">
  //    via buildResourceCard(); the legacy a.card selector is kept for any
  //    hand-crafted cards still using the old class.
  document.querySelectorAll('a.card[href], a.resource-card[href]').forEach(el => {
    const key = slugFromHref(el.getAttribute('href'));
    if (!key || PAGE_ACCESS_BYPASS.has(key)) return;
    if (!configs.has(key)) return;
    if (!isAllowed(configs.get(key))) el.setAttribute('data-pa-hidden', '1');
    else                              el.removeAttribute('data-pa-hidden');
  });

  // 3. Empty TH dropdown wrappers / mobile sections — hide if every child is hidden.
  ['.th-dd-wrap', '.th-mobile-section'].forEach(selector => {
    document.querySelectorAll(selector).forEach(group => {
      const items = group.querySelectorAll('[data-nav-key]');
      if (!items.length) return;
      const allHidden = [...items].every(it => it.getAttribute('data-pa-hidden') === '1');
      if (allHidden) group.setAttribute('data-pa-hidden', '1');
      else            group.removeAttribute('data-pa-hidden');
    });
  });

  // 4. Empty dropdown columns
  document.querySelectorAll('.th-dd-col').forEach(col => {
    const items = col.querySelectorAll('[data-nav-key]');
    if (!items.length) return;
    const allHidden = [...items].every(it => it.getAttribute('data-pa-hidden') === '1');
    if (allHidden) col.setAttribute('data-pa-hidden', '1');
    else            col.removeAttribute('data-pa-hidden');
  });

  // 4b. Flag column groups that have at least one hidden column so the
  //     panel CSS can drop its sticky min-width and shrink to content.
  //     Avoids the "wide empty middle" look when only Daily + Induction
  //     remain visible in a 5-column "My Work" panel, for example.
  document.querySelectorAll('.th-dd-col-group').forEach(group => {
    const cols = group.querySelectorAll('.th-dd-col');
    if (!cols.length) return;
    const anyHidden = [...cols].some(c => c.getAttribute('data-pa-hidden') === '1');
    group.classList.toggle('has-hidden', anyHidden);
  });
}

function ensurePageAccessStyles() {
  if (document.getElementById('paGatingStyle')) return;
  const style = document.createElement('style');
  style.id = 'paGatingStyle';
  style.textContent = '[data-pa-hidden="1"], [data-th-subject-hidden="1"] { display: none !important; }';
  document.head.appendChild(style);
}

// Pilot-system UI gating. Reuses data-pa-hidden so the existing
// "hide empty column / dropdown / mobile section" logic in
// applyPageAccessGating composes — pilot-disabled items count as
// hidden when checking whether a column went empty.
//   - enabled === null  ⇒ field missing on partner_schools doc → no
//                          gating (back-compat: all systems on).
//   - enabled === Set() ⇒ every system explicitly disabled.
function applyPilotSystemGating(enabled) {
  if (!enabled) return; // null = all enabled (back-compat) — nothing to do

  const isPilotAllowed = (slug) => {
    const sys = PILOT_SLUG_MAP[slug];
    if (!sys) return true; // not a pilot-gated page
    return enabled.has(sys);
  };

  // 1. Navbar items (desktop + any data-mobile-nav-key clones).
  document.querySelectorAll('[data-nav-key], [data-mobile-nav-key]').forEach(el => {
    const key = (el.getAttribute('data-nav-key') || el.getAttribute('data-mobile-nav-key') || '').toLowerCase();
    if (!key || PAGE_ACCESS_BYPASS.has(key)) return;
    if (!isPilotAllowed(key)) el.setAttribute('data-pa-hidden', '1');
  });

  // 2. Dashboard cards by href slug.
  document.querySelectorAll('a.card[href], a.resource-card[href]').forEach(el => {
    const key = slugFromHref(el.getAttribute('href'));
    if (!key || PAGE_ACCESS_BYPASS.has(key)) return;
    if (!isPilotAllowed(key)) el.setAttribute('data-pa-hidden', '1');
  });

  // 3. Re-evaluate empty wrappers / columns now that pilot hides
  //    layered on top of page-access hides. Mirrors the logic at the
  //    bottom of applyPageAccessGating.
  ['.th-dd-wrap', '.th-mobile-section'].forEach(selector => {
    document.querySelectorAll(selector).forEach(group => {
      const items = group.querySelectorAll('[data-nav-key]');
      if (!items.length) return;
      const allHidden = [...items].every(it => it.getAttribute('data-pa-hidden') === '1');
      if (allHidden) group.setAttribute('data-pa-hidden', '1');
      else            group.removeAttribute('data-pa-hidden');
    });
  });
  document.querySelectorAll('.th-dd-col').forEach(col => {
    const items = col.querySelectorAll('[data-nav-key]');
    if (!items.length) return;
    const allHidden = [...items].every(it => it.getAttribute('data-pa-hidden') === '1');
    if (allHidden) col.setAttribute('data-pa-hidden', '1');
    else            col.removeAttribute('data-pa-hidden');
  });
  // Mirror the has-hidden flag refresh from page-access gating so the
  // panel CSS shrinks even when only pilot rules hid columns.
  document.querySelectorAll('.th-dd-col-group').forEach(group => {
    const cols = group.querySelectorAll('.th-dd-col');
    if (!cols.length) return;
    const anyHidden = [...cols].some(c => c.getAttribute('data-pa-hidden') === '1');
    group.classList.toggle('has-hidden', anyHidden);
  });
}

// Read partner_schools/{schoolId}.enabled_systems[]. Returns:
//   null      → field absent / read failed → all systems enabled
//   Set([…])  → explicit list (possibly empty)
async function getEnabledSystemsForSchool(database, schoolId) {
  if (!schoolId) return null;
  try {
    const snap = await getDoc(doc(database, 'partner_schools', schoolId));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!Array.isArray(data.enabled_systems)) return null;
    return new Set(data.enabled_systems);
  } catch (err) {
    console.warn('partner_schools read failed for pilot gating', err);
    return null; // fail-open
  }
}

// ── Subject + Level gating (pacing / tracker pages) ──────────────
// Each pacing or tracker URL is mapped to {subject, level}. A user
// sees the link only when both: subjects[] includes the page's
// subject AND classes[] includes the page's level.
//
// teachers_admin bypasses entirely. A profile with empty subjects[]
// or empty classes[] sees nothing (intentional — forces the user to
// fill the profile prompt first).
const PAGE_SUBJECT_LEVEL_MAP = {
  // IGCSE pacing
  'igcse-math':              { subject: 'math',      level: 'igcse'      },
  'igcse-biology':           { subject: 'biology',   level: 'igcse'      },
  'igcse-chemistry':         { subject: 'chemistry', level: 'igcse'      },
  'igcse-physics':           { subject: 'physics',   level: 'igcse'      },
  // AS/A-Level pacing
  'as-alevel-math':          { subject: 'math',      level: 'asalevel'   },
  'as-alevel-biology':       { subject: 'biology',   level: 'asalevel'   },
  'as-alevel-chemistry':     { subject: 'chemistry', level: 'asalevel'   },
  'as-alevel-physics':       { subject: 'physics',   level: 'asalevel'   },
  // Checkpoint pacing
  'checkpoint-math':         { subject: 'math',      level: 'checkpoint' },
  'checkpoint-english':      { subject: 'english',   level: 'checkpoint' },
  'checkpoint-science':      { subject: 'science',   level: 'checkpoint' },
  // IGCSE trackers
  'igcse-math-tracker':      { subject: 'math',      level: 'igcse'      },
  'igcse-biology-tracker':   { subject: 'biology',   level: 'igcse'      },
  'igcse-chemistry-tracker': { subject: 'chemistry', level: 'igcse'      },
  'igcse-physics-tracker':   { subject: 'physics',   level: 'igcse'      },
  // AS/A-Level trackers
  'as-alevel-math-tracker':      { subject: 'math',      level: 'asalevel' },
  'as-alevel-biology-tracker':   { subject: 'biology',   level: 'asalevel' },
  'as-alevel-chemistry-tracker': { subject: 'chemistry', level: 'asalevel' },
  'as-alevel-physics-tracker':   { subject: 'physics',   level: 'asalevel' },
  // Checkpoint trackers
  'checkpoint-math-tracker':    { subject: 'math',    level: 'checkpoint' },
  'checkpoint-english-tracker': { subject: 'english', level: 'checkpoint' },
  'checkpoint-science-tracker': { subject: 'science', level: 'checkpoint' },
};

function userQualifiesForPage(userSubjects, userLevels, pageSubject, pageLevel) {
  return userSubjects.includes(pageSubject) && userLevels.includes(pageLevel);
}

function applySubjectGating(userSubjects, userLevels) {
  // 1. Hide every nav link / dashboard card that carries pacing meta
  //    and does not match the user's subject + level.
  document.querySelectorAll('[data-pacing-subject][data-pacing-level]').forEach(el => {
    const sub = el.getAttribute('data-pacing-subject');
    const lv  = el.getAttribute('data-pacing-level');
    if (!sub || !lv) return;
    if (userQualifiesForPage(userSubjects, userLevels, sub, lv)) {
      el.removeAttribute('data-th-subject-hidden');
    } else {
      el.setAttribute('data-th-subject-hidden', '1');
    }
  });

  // 2. Empty TH dropdown wrappers / mobile sections / columns: hide
  //    when every interactive child is hidden by either gate.
  const isHiddenAny = (n) => n.getAttribute('data-pa-hidden') === '1' || n.getAttribute('data-th-subject-hidden') === '1';
  ['.th-dd-wrap', '.th-mobile-section', '.th-dd-col'].forEach(selector => {
    document.querySelectorAll(selector).forEach(group => {
      const items = group.querySelectorAll('[data-nav-key], [data-pacing-subject][data-pacing-level]');
      if (!items.length) return;
      const allHidden = [...items].every(isHiddenAny);
      if (allHidden) group.setAttribute('data-th-subject-hidden', '1');
      else            group.removeAttribute('data-th-subject-hidden');
    });
  });
}

// ── Name prompt (shown when displayName is missing) ───────────────
function promptForName() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(28,28,46,0.75);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"DM Sans",sans-serif';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:40px 36px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.35)">
        <h2 style="font-size:1.4rem;font-weight:600;color:#1c1c2e;margin-bottom:6px">Welcome!</h2>
        <p style="font-size:0.875rem;color:#8888a8;margin-bottom:24px">Please enter your full name to complete your profile.</p>
        <input id="_nameInput" type="text" placeholder="Your full name"
          style="width:100%;padding:10px 14px;border:1px solid #e0ddd6;border-radius:8px;font-size:0.95rem;color:#1c1c2e;outline:none;margin-bottom:8px;box-sizing:border-box">
        <p id="_nameErr" style="font-size:0.82rem;color:#dc2626;min-height:20px;margin-bottom:12px"></p>
        <button id="_nameBtn" style="width:100%;padding:11px;background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer">Continue →</button>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.visibility = 'visible';

    const input = overlay.querySelector('#_nameInput');
    const btn   = overlay.querySelector('#_nameBtn');
    const err   = overlay.querySelector('#_nameErr');
    input.focus();

    const submit = () => {
      const name = input.value.trim();
      if (!name) { err.textContent = 'Please enter your name.'; return; }
      overlay.remove();
      document.body.style.visibility = 'hidden';
      resolve(name);
    };
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  });
}

// ── Profile setup prompt (school + subjects + classes) ───────────
// Shown on every login until all three fields are filled.
const CAMBRIDGE_SUBJECT_OPTIONS = [
  { value: 'math',      label: 'Mathematics' },
  { value: 'biology',   label: 'Biology' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'physics',   label: 'Physics' },
  { value: 'english',   label: 'English' },
  { value: 'science',   label: 'Science' },
];

const NON_CAMBRIDGE_SUBJECT_OPTIONS = [
  { value: 'religion',  label: 'Religion' },
];

// All subject options combined (for backwards-compat references)
const SUBJECT_OPTIONS = [...CAMBRIDGE_SUBJECT_OPTIONS, ...NON_CAMBRIDGE_SUBJECT_OPTIONS];

const CLASS_OPTIONS = [
  { value: 'checkpoint', label: 'Checkpoint (Year 7–8)' },
  { value: 'igcse',      label: 'IGCSE (Year 9–10)' },
  { value: 'asalevel',   label: 'AS & A Level (Year 11–12)' },
];

// Expose so index.html can reference labels when needed
window.TEACHERS_SUBJECT_OPTIONS           = SUBJECT_OPTIONS;
window.TEACHERS_CAMBRIDGE_SUBJECT_OPTIONS = CAMBRIDGE_SUBJECT_OPTIONS;
window.TEACHERS_CLASS_OPTIONS             = CLASS_OPTIONS;

function profileComplete(profile) {
  return (
    profile.school   && profile.school.trim() &&
    Array.isArray(profile.subjects)   && profile.subjects.length   > 0 &&
    Array.isArray(profile.classes)    && profile.classes.length    > 0 &&
    Array.isArray(profile.th_sub_roles) && profile.th_sub_roles.length > 0
  );
}

async function promptForProfile(user, profile) {
  // Fetch schools list before showing the modal. We also pull the
  // `domain` field so a brand-new user gets their school auto-selected
  // from their email domain (only if exactly one school owns it; with
  // shared domains like semesta.sch.id we leave the picker empty so
  // the user makes the call).
  let schoolDocs = []; // [{id, name, domain}]
  try {
    const snap = await getDocs(query(collection(db, 'partner_schools'), orderBy('name')));
    snap.forEach(d => {
      const v = d.data();
      schoolDocs.push({ id: d.id, name: v.name || d.id, domain: v.domain || '' });
    });
  } catch { /* fall through */ }

  const emailDomain   = (user?.email || '').split('@')[1] || '';
  const domainMatches = schoolDocs.filter(s => s.domain === emailDomain);
  const domainDefault = domainMatches.length === 1 ? domainMatches[0].id : '';

  const existingSchoolId = profile.schoolId
    || schoolDocs.find(s => s.name === profile.school)?.id
    || domainDefault;

  // Pre-load classes for existing school
  let _setupSchoolClasses = [];
  if (existingSchoolId) {
    try {
      const snap = await getDocs(query(collection(db, 'partner_schools', existingSchoolId, 'classes'), orderBy('grade'), orderBy('section')));
      snap.forEach(d => _setupSchoolClasses.push({ id: d.id, ...d.data() }));
    } catch { /* ignore */ }
  }

  return new Promise(resolve => {
    const existing = {
      school:      profile.school      || '',
      schoolId:    existingSchoolId    || '',
      subjects:    Array.isArray(profile.subjects)    ? profile.subjects    : [],
      classes:     Array.isArray(profile.classes)     ? profile.classes     : [],
      th_sub_roles: Array.isArray(profile.th_sub_roles) ? profile.th_sub_roles : [],
    };
    // Selected class names from profile (any *_classes field)
    const existingClassNames = new Set(
      Object.entries(profile).filter(([k]) => k.endsWith('_classes') && Array.isArray(profile[k]))
        .flatMap(([,v]) => v)
    );

    // Detect existing "other" subject (any value not in the known options list)
    const knownValues     = SUBJECT_OPTIONS.map(o => o.value);
    const existingOther   = existing.subjects.filter(v => !knownValues.includes(v)).join(', ');

    const cambridgeChips = CAMBRIDGE_SUBJECT_OPTIONS.map(o => `
      <button type="button" class="_chip ${existing.subjects.includes(o.value) ? '_chip-on' : ''}"
        data-group="subjects" data-value="${o.value}">${o.label}</button>`).join('');

    const nonCambridgeChips = NON_CAMBRIDGE_SUBJECT_OPTIONS.map(o => `
      <button type="button" class="_chip ${existing.subjects.includes(o.value) ? '_chip-on' : ''}"
        data-group="subjects" data-value="${o.value}">${o.label}</button>`).join('');

    const classChips = CLASS_OPTIONS.map(o => `
      <button type="button" class="_chip ${existing.classes.includes(o.value) ? '_chip-on' : ''}"
        data-group="classes" data-value="${o.value}">${o.label}</button>`).join('');

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(28,28,46,0.82);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"DM Sans",sans-serif';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:32px 36px;width:100%;max-width:780px;box-shadow:0 24px 64px rgba(0,0,0,0.40)">
        <div style="margin-bottom:20px">
          <h2 style="font-size:1.3rem;font-weight:700;color:#1c1c2e;margin-bottom:4px">Set up your profile</h2>
          <p style="font-size:0.85rem;color:#8888a8;line-height:1.5">Tell us about your school, the classes you teach, and your role.</p>
        </div>

        <!-- School -->
        <label style="display:block;font-size:0.78rem;font-weight:600;color:#44445a;margin-bottom:5px">School name <span style="color:#dc2626">*</span></label>
        <select id="_schoolInput"
          style="width:100%;padding:9px 12px;border:1.5px solid #e0ddd6;border-radius:10px;font-size:0.88rem;color:#1c1c2e;outline:none;box-sizing:border-box;background:#fff;appearance:auto;margin-bottom:14px">
          <option value="">— Select school —</option>
          ${schoolDocs.map(s => `<option value="${s.id}" data-name="${s.name.replace(/"/g,'&quot;')}"${existing.schoolId===s.id?' selected':''}>${s.name}</option>`).join('')}
        </select>

        <!-- My Classes -->
        <div id="_classSection" style="border:1.5px solid #e0ddd6;border-radius:12px;padding:12px 14px;margin-bottom:14px">
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:0.73rem;font-weight:700;color:#8888a8;text-transform:uppercase;letter-spacing:0.06em">My Classes</div>
            <span style="font-size:0.73rem;color:#b0b0c8">optional — add more later in Settings</span>
          </div>
          <div id="_classChipWrap" style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;min-height:26px">
            ${_setupSchoolClasses.length > 0
              ? _setupSchoolClasses.map(c => `<button type="button" class="_chip ${existingClassNames.has(c.name)?'_chip-on':''}" data-group="myClasses" data-value="${c.name}">${c.name}</button>`).join('')
              : '<span id="_noClassesMsg" style="font-size:0.8rem;color:#b0b0c8;font-style:italic;align-self:center">No classes defined for this school yet.</span>'
            }
          </div>
          <div style="display:flex;gap:6px;align-items:center;border-top:1px solid #f0eee9;padding-top:8px">
            <input id="_newClassInput" type="text" placeholder="Define new class (e.g. 10 Stanford)"
              style="flex:1;padding:6px 11px;border:1.5px solid #e0ddd6;border-radius:8px;font-size:0.8rem;color:#1c1c2e;outline:none;background:#fafafa;box-sizing:border-box">
            <button type="button" id="_addClassBtn"
              style="padding:6px 14px;border:1.5px dashed #6c5ce7;border-radius:8px;font-size:0.8rem;font-weight:600;color:#6c5ce7;background:#faf9ff;cursor:pointer;white-space:nowrap;flex-shrink:0">+ Define</button>
          </div>
        </div>

        <!-- Subjects: 3-column -->
        <label style="display:block;font-size:0.78rem;font-weight:600;color:#44445a;margin-bottom:10px">Subjects you teach <span style="color:#dc2626">*</span></label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">

          <div style="border:1.5px solid #e0ddd6;border-radius:12px;padding:12px 14px">
            <div style="font-size:0.73rem;font-weight:700;color:#8888a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Cambridge Subjects</div>
            <div id="_cambridgeChips" style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${cambridgeChips}</div>
          </div>

          <div style="border:1.5px solid #e0ddd6;border-radius:12px;padding:12px 14px">
            <div style="font-size:0.73rem;font-weight:700;color:#8888a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Curriculum Levels <span style="color:#dc2626">*</span></div>
            <div id="_classChips" style="display:flex;flex-direction:column;gap:5px">${classChips}</div>
          </div>

          <div style="border:1.5px solid #e0ddd6;border-radius:12px;padding:12px 14px">
            <div style="font-size:0.73rem;font-weight:700;color:#8888a8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Non-Cambridge</div>
            <div id="_nonCambridgeChips" style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">${nonCambridgeChips}</div>
            <input id="_otherSubjectInput" type="text" placeholder="Other (e.g. PE, Art, IT…)" value="${existingOther.replace(/"/g,'&quot;')}"
              style="width:100%;padding:7px 11px;border:1.5px solid #e0ddd6;border-radius:9px;font-size:0.8rem;color:#1c1c2e;outline:none;box-sizing:border-box">
          </div>

        </div>

        <!-- Role -->
        <label style="display:block;font-size:0.78rem;font-weight:600;color:#44445a;margin-bottom:8px">Your role <span style="color:#dc2626">*</span></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
          <label style="display:flex;align-items:flex-start;gap:11px;cursor:pointer;padding:11px 13px;border:1.5px solid #e0ddd6;border-radius:10px;transition:border-color .15s" id="_roleSubjectTeacher">
            <input type="checkbox" id="_chkSubjectTeacher" value="subject_teacher" style="margin-top:2px;accent-color:#6c5ce7;width:15px;height:15px;flex-shrink:0" ${existing.th_sub_roles.includes('subject_teacher') ? 'checked' : ''}>
            <div>
              <div style="font-size:0.85rem;font-weight:600;color:#1c1c2e">Subject Teacher</div>
              <div style="font-size:0.76rem;color:#8888a8;margin-top:2px">I teach subjects to students and follow pacing guides.</div>
            </div>
          </label>
          <label style="display:flex;align-items:flex-start;gap:11px;cursor:pointer;padding:11px 13px;border:1.5px solid #e0ddd6;border-radius:10px;transition:border-color .15s" id="_roleSubjectLeader">
            <input type="checkbox" id="_chkSubjectLeader" value="subject_leader" style="margin-top:2px;accent-color:#6c5ce7;width:15px;height:15px;flex-shrink:0" ${existing.th_sub_roles.includes('subject_leader') ? 'checked' : ''}>
            <div>
              <div style="font-size:0.85rem;font-weight:600;color:#1c1c2e">Subject Leader</div>
              <div style="font-size:0.76rem;color:#8888a8;margin-top:2px">I oversee a subject department and coordinate pacing across teachers.</div>
            </div>
          </label>
        </div>

        <p id="_profileErr" style="font-size:0.82rem;color:#dc2626;min-height:18px;margin-bottom:10px"></p>
        <button id="_profileBtn" style="width:100%;padding:11px;background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;border:none;border-radius:10px;font-size:0.93rem;font-weight:600;cursor:pointer">Save & Continue →</button>
      </div>
      <style>
        ._chip{padding:6px 12px;border-radius:8px;border:1.5px solid #e0ddd6;background:#f7f6f3;color:#44445a;font-size:0.8rem;font-weight:500;cursor:pointer;transition:all .15s;width:100%;text-align:left;box-sizing:border-box}
        ._chip:hover{border-color:#6c5ce7;color:#6c5ce7;background:#f3f0ff}
        ._chip-on{background:#ede9fe;border-color:#6c5ce7;color:#6c5ce7;font-weight:600}
      </style>`;

    document.body.appendChild(overlay);
    document.body.style.visibility = 'visible';

    const refreshClassChips = () => {
      const wrap = overlay.querySelector('#_classChipWrap');
      if (_setupSchoolClasses.length === 0) {
        wrap.innerHTML = '<span id="_noClassesMsg" style="font-size:0.81rem;color:#b0b0c8;font-style:italic;align-self:center">No classes defined for this school yet.</span>';
      } else {
        wrap.innerHTML = _setupSchoolClasses.map(c =>
          `<button type="button" class="_chip" data-group="myClasses" data-value="${c.name}">${c.name}</button>`
        ).join('');
      }
    };

    // "+ Add" inline class button
    overlay.querySelector('#_addClassBtn').addEventListener('click', () => {
      const input = overlay.querySelector('#_newClassInput');
      const name  = input.value.trim();
      if (!name) return;
      if (!_setupSchoolClasses.find(c => c.name === name)) {
        _setupSchoolClasses.push({ name, grade: parseInt(name, 10) || 0, section: name.replace(/^\d+\s*/, '') });
      }
      refreshClassChips();
      // auto-select the newly added chip
      const wrap = overlay.querySelector('#_classChipWrap');
      const chip = [...wrap.querySelectorAll('._chip')].find(c => c.dataset.value === name);
      if (chip) chip.classList.add('_chip-on');
      input.value = '';
      input.focus();
    });

    overlay.querySelector('#_newClassInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); overlay.querySelector('#_addClassBtn').click(); }
    });

    // When school changes → reload class chips
    overlay.querySelector('#_schoolInput').addEventListener('change', async (e) => {
      const schoolId = e.target.value;
      const wrap     = overlay.querySelector('#_classChipWrap');
      _setupSchoolClasses = [];
      if (!schoolId) { refreshClassChips(); return; }
      wrap.innerHTML = '<span style="font-size:0.82rem;color:#8888a8">Loading…</span>';
      try {
        const snap = await getDocs(query(collection(db, 'partner_schools', schoolId, 'classes'), orderBy('grade'), orderBy('section')));
        snap.forEach(d => _setupSchoolClasses.push({ id: d.id, ...d.data() }));
      } catch { /* ignore */ }
      refreshClassChips();
    });

    // Chip toggle
    overlay.addEventListener('click', e => {
      const chip = e.target.closest('._chip');
      if (!chip) return;
      chip.classList.toggle('_chip-on');
    });

    // Role label border highlight on check
    ['_chkSubjectTeacher', '_chkSubjectLeader'].forEach(id => {
      const chk   = overlay.querySelector(`#${id}`);
      const label = chk.closest('label');
      const update = () => { label.style.borderColor = chk.checked ? '#6c5ce7' : '#e0ddd6'; };
      chk.addEventListener('change', update);
      update();
    });

    const btn = overlay.querySelector('#_profileBtn');
    const err = overlay.querySelector('#_profileErr');

    btn.addEventListener('click', () => {
      const schoolSel     = overlay.querySelector('#_schoolInput');
      const schoolId      = schoolSel.value.trim();
      const school        = schoolSel.selectedOptions[0]?.dataset.name || schoolId;
      const chipSubjects  = [...overlay.querySelectorAll('._chip[data-group="subjects"]._chip-on')].map(c => c.dataset.value);
      const otherRaw      = overlay.querySelector('#_otherSubjectInput').value.trim();
      const otherSubjects = otherRaw ? otherRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
      const subjects      = [...chipSubjects, ...otherSubjects];
      const classes       = [...overlay.querySelectorAll('._chip[data-group="classes"]._chip-on')].map(c => c.dataset.value);
      const myClasses     = [...overlay.querySelectorAll('._chip[data-group="myClasses"]._chip-on')].map(c => c.dataset.value);
      const th_sub_roles = [
        overlay.querySelector('#_chkSubjectTeacher').checked ? 'subject_teacher' : null,
        overlay.querySelector('#_chkSubjectLeader').checked  ? 'subject_leader'  : null,
      ].filter(Boolean);

      const cambridgeSelected = chipSubjects.some(v => CAMBRIDGE_SUBJECT_OPTIONS.map(o => o.value).includes(v));
      if (!schoolId)                            { err.textContent = 'Please select your school.'; return; }
      if (!subjects.length)                     { err.textContent = 'Please select at least one subject.'; return; }
      if (cambridgeSelected && !classes.length) { err.textContent = 'Please select at least one curriculum level.'; return; }
      if (!th_sub_roles.length)                 { err.textContent = 'Please select your role (Subject Teacher and/or Subject Leader).'; return; }

      overlay.remove();
      document.body.style.visibility = 'hidden';
      resolve({ school, schoolId, subjects, classes, myClasses, th_sub_roles });
    });
  });
}

// ── Pending-user admin notification ──────────────────────────────
// Fires once when a brand-new users/{uid} doc is created with
// approval_status_teachershub: 'pending'. Sends an email to a fixed
// recipient (currently secondary.edu@eduversal.org — change in
// PENDING_NOTIFICATION_RECIPIENT below). Body comes from
// mail_templates/th_pending_notification — admin-editable in CH
// /mail-composer "System Templates". Built-in default used if the
// admin has not yet customised the template doc.
const PENDING_NOTIFICATION_RECIPIENT = 'secondary.edu@eduversal.org';

const PENDING_NOTIFICATION_DEFAULT_SUBJECT =
  'New Teachers Hub signup awaiting approval — {{userName}}';

const PENDING_NOTIFICATION_DEFAULT_BODY = `
<p>Hi team,</p>
<p>A new user has signed up to the <strong>Teachers Hub</strong> and is waiting for approval.</p>
<table style="border-collapse:collapse;margin:14px 0;font-size:14px">
  <tr><td style="padding:6px 14px 6px 0;color:#64748b">Name</td><td style="padding:6px 0"><strong>{{userName}}</strong></td></tr>
  <tr><td style="padding:6px 14px 6px 0;color:#64748b">Email</td><td style="padding:6px 0">{{userEmail}}</td></tr>
  <tr><td style="padding:6px 14px 6px 0;color:#64748b">School</td><td style="padding:6px 0">{{schoolName}}</td></tr>
  <tr><td style="padding:6px 14px 6px 0;color:#64748b">Signed up</td><td style="padding:6px 0">{{signupTime}}</td></tr>
</table>
<p>Review and approve them in the Central Hub console:</p>
<p><a href="{{consoleUrl}}" style="display:inline-block;background:#6c5ce7;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open Console &rarr;</a></p>
<p style="color:#64748b;font-size:13px;margin-top:24px">If this looks like a mistaken or unauthorised signup, you can reject the account from the same screen.</p>`.trim();

function _renderTemplate(str, values) {
  return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(values, k) ? String(values[k] ?? '') : '');
}

async function notifyAdminsOfPendingTHUser(user, database) {
  const url    = (window.ENV?.MAIL_SERVICE_URL || '').replace(/\/$/, '');
  const secret = window.ENV?.MAIL_SERVICE_SECRET || '';
  if (!url || !secret) {
    console.info('[pending-notif] mail-service not configured — skipping');
    return;
  }

  // Fetch admin-edited template body if it exists. The Firestore rule
  // explicitly allows non-admin reads on docs where kind == 'system'.
  let subject = PENDING_NOTIFICATION_DEFAULT_SUBJECT;
  let body    = PENDING_NOTIFICATION_DEFAULT_BODY;
  try {
    const snap = await getDoc(doc(database, 'mail_templates', 'th_pending_notification'));
    if (snap.exists()) {
      const t = snap.data();
      if (t.subject)  subject = t.subject;
      if (t.bodyHtml) body    = t.bodyHtml;
    }
  } catch (e) {
    console.info('[pending-notif] template fetch failed, using default:', e?.message);
  }

  // Best-effort school name lookup via the user's email domain.
  let schoolName = '—';
  const emailDomain = (user.email || '').split('@')[1] || '';
  if (emailDomain) {
    try {
      const schoolsSnap = await getDocs(collection(database, 'partner_schools'));
      const match = schoolsSnap.docs.find(d => (d.data().domain || '') === emailDomain);
      if (match) schoolName = match.data().name || match.id;
    } catch (_) { /* fall through */ }
  }

  const values = {
    userName:   user.displayName || user.email.split('@')[0] || '(no name)',
    userEmail:  user.email,
    schoolName,
    signupTime: new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
    }) + ' WIB',
    consoleUrl: 'https://centralhub.eduversal.org/console',
  };

  const renderedSubject = _renderTemplate(subject, values);
  const renderedBody    = _renderTemplate(body,    values);

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url + '/send-transactional', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + secret,
      },
      body: JSON.stringify({
        toEmail:      PENDING_NOTIFICATION_RECIPIENT,
        subject:      renderedSubject,
        bodyHtml:     renderedBody,
        templateName: 'default',
        tags: [
          { name: 'kind',     value: 'th-pending-notification' },
          { name: 'platform', value: 'teachershub' },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn('[pending-notif] mail-service rejected:', res.status, data);
    } else {
      console.info('[pending-notif] notification email queued');
    }
  } catch (e) {
    console.warn('[pending-notif] network error:', e?.message);
  }
}

// ── Auth state listener ──────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {

  // 1. Not signed in → redirect to login
  if (!user) {
    window.location.replace('/login');
    return;
  }

  // 1b. Career applicant guard. Public /careers-apply uses
  // sendSignInLinkToEmail to send the candidate a magic-link so they can
  // track their application from /careers-status. That sign-in must NEVER
  // grant Teachers Hub access — applicants are not staff. We detect them
  // two ways:
  //   - providerData carries 'emailLink' (Firebase passwordless sign-in), OR
  //   - users/{uid} doc does not exist AND email-verified state was issued
  //     by Firebase's email-link flow (emailVerified flips to true on link
  //     completion even though no Firestore profile was ever provisioned).
  // For applicants we redirect to /careers-status WITHOUT creating a
  // users/{uid} doc (so the staff directory stays clean) and WITHOUT
  // signing them out (careers-status needs the auth session).
  const isEmailLinkUser = user.providerData.some(p => p.providerId === 'emailLink');
  if (isEmailLinkUser) {
    window.location.replace('/careers-status');
    return;
  }

  // 2. Fetch (or create) Firestore profile
  let profile;
  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First sign-in: assign default Teachers Hub role + pending approval.
      const newProfile = {
        uid:            user.uid,
        email:          user.email,
        displayName:    user.displayName || '',
        photoURL:       user.photoURL    || '',
        [PLATFORM_KEY]: DEFAULT_ROLE,
        [APPROVAL_KEY]: 'pending',
        createdAt:      serverTimestamp(),
      };
      // Pre-fill from staff/{...} record if HQ has seeded one for this email.
      // See "Staff ↔ users bridge" section in /docs/architecture/FIRESTORE_SCHEMA.md.
      await applyStaffBridge(db, user, newProfile);
      await setDoc(userRef, newProfile);
      profile = newProfile;

      // Fire-and-forget admin notification email — never blocks signup.
      // Reads body from mail_templates/th_pending_notification (admin-
      // editable in CH /mail-composer). Falls back to a built-in
      // default if the system template doc has not been customised yet.
      notifyAdminsOfPendingTHUser(user, db).catch(err => {
        console.warn('Pending-user notification failed:', err);
      });
    } else {
      profile = userSnap.data();
      if (profile[PLATFORM_KEY] == null) {
        await setDoc(userRef, { [PLATFORM_KEY]: DEFAULT_ROLE }, { merge: true });
        profile = { ...profile, [PLATFORM_KEY]: DEFAULT_ROLE };
      }
      // If approval field is absent, treat as pending — requires admin approval
      if (profile[APPROVAL_KEY] == null) {
        await setDoc(userRef, { [APPROVAL_KEY]: 'pending' }, { merge: true });
        profile = { ...profile, [APPROVAL_KEY]: 'pending' };
      }
    }
  } catch (err) {
    console.error('auth-guard: could not fetch user profile', err);
    await signOut(auth);
    window.location.replace('/login?error=profile');
    return;
  }

  // 3. Domain check (Google SSO users must be from an allowed school domain)
  const isPasswordUser = user.providerData.some(p => p.providerId === 'password');
  const emailDomain    = user.email.split('@')[1];
  if (!isPasswordUser && !window.TEACHERS_ALLOWED_DOMAINS.includes(emailDomain)) {
    await signOut(auth);
    window.location.replace('/login?error=domain');
    return;
  }

  // 4. Role check
  const platformRole = profile[PLATFORM_KEY];
  if (!ALLOWED_ROLES.includes(platformRole)) {
    await signOut(auth);
    window.location.replace('/login?error=access');
    return;
  }

  // 5. Name prompt if missing
  if (!profile.displayName) {
    const name = await promptForName();
    await setDoc(userRef, { displayName: name }, { merge: true });
    profile.displayName = name;
  }

  // 5b. Profile setup prompt if school/subjects/classes/th_sub_roles are missing
  if (!profileComplete(profile)) {
    const { school, schoolId, subjects, classes, myClasses, th_sub_roles } = await promptForProfile(user, profile);

    // Build teaching_combos and distribute myClasses into per-combo fields
    // (settings.html reads {level}_{subject}_classes[], not the flat myClasses array)
    const teaching_combos = [];
    const classFields = {};
    const cambridgeSubjectValues = CAMBRIDGE_SUBJECT_OPTIONS.map(o => o.value);
    classes.forEach(lv => {
      subjects.filter(sv => cambridgeSubjectValues.includes(sv)).forEach(sv => {
        teaching_combos.push(`${lv}_${sv}`);
        classFields[`${lv}_${sv}_classes`] = Array.isArray(myClasses) ? [...myClasses] : [];
      });
    });

    await setDoc(userRef, { school, schoolId, subjects, classes, th_sub_roles, teaching_combos, ...classFields }, { merge: true });
    profile.school          = school;
    profile.schoolId        = schoolId;
    profile.subjects        = subjects;
    profile.classes         = classes;
    profile.th_sub_roles    = th_sub_roles;
    profile.teaching_combos = teaching_combos;
    Object.assign(profile, classFields);

    // Sync newly-defined classes to shared school pool
    if (schoolId && Array.isArray(myClasses) && myClasses.length) {
      try {
        const classesRef = collection(db, 'partner_schools', schoolId, 'classes');
        const existing   = await getDocs(query(classesRef, orderBy('grade')));
        const poolNames  = new Set(existing.docs.map(d => d.data().name));
        await Promise.all(myClasses
          .filter(name => !poolNames.has(name))
          .map(name => addDoc(classesRef, {
            name, grade: parseInt(name, 10) || 0,
            section: name.replace(/^\d+\s*/, ''),
            createdBy: user.uid, createdAt: serverTimestamp(),
          }))
        );
      } catch (e) { console.warn('Could not sync classes to pool:', e); }
    }
  }

  // 5c. Approval check (teachers_admin bypasses — they are always approved)
  const approvalStatus = profile[APPROVAL_KEY];
  const isAdminRole    = profile[PLATFORM_KEY] === 'teachers_admin';
  if (!isAdminRole && approvalStatus !== 'approved') {
    const pathname  = window.location.pathname;
    const isWaiting = pathname === '/waiting' || pathname.endsWith('/waiting.html');
    if (!isWaiting) {
      window.location.replace('/waiting');
    }
    document.body.style.visibility = 'visible';
    return;
  }

  // 5d. Page-access check (sub-role gate via page_access_config).
  //     - admin bypasses
  //     - root '/' and explicit allow-list pages skip the check
  //     - missing config doc => allow (back-compat)
  //     - cfg.hidden === true => deny (page hidden from every sub-role)
  //     - empty visible_to  => allow (open to every TH sub-role)
  //     - else: user must hold at least one matching th_sub_role
  if (!isAdminRole) {
    const pageKey = currentPageKey();
    if (pageKey && !PAGE_ACCESS_BYPASS.has(pageKey)) {
      const cfg = await getPageAccessConfig(db, pageKey);
      if (cfg) {
        const isHidden = cfg.hidden === true;
        const userSubRoles = Array.isArray(profile.th_sub_roles) ? profile.th_sub_roles : [];
        const vt = Array.isArray(cfg.visible_to) ? cfg.visible_to : [];
        const subRoleAllowed = vt.length === 0 || userSubRoles.some(r => vt.includes(r));
        const allowed = !isHidden && subRoleAllowed;
        if (!allowed) {
          try {
            sessionStorage.setItem('th_access_denied', JSON.stringify({
              pageKey,
              label: cfg.label || pageKey,
              at: Date.now(),
            }));
          } catch (_) {}
          window.location.replace('/?denied=' + encodeURIComponent(pageKey));
          return;
        }
      }
    }
  }

  // 5d-bis. Pilot-system gate (per-school enrolment).
  //     Direct-URL access to a KPI / Appraisal / Competency / Induction
  //     page is rejected when the user's school has narrowed
  //     partner_schools.enabled_systems[] to exclude that system.
  //     Admins + HQ users (no schoolId) bypass; missing field = open.
  if (!isAdminRole && profile.schoolId) {
    const pageKey = currentPageKey();
    const requiredSystem = PILOT_SLUG_MAP[pageKey];
    if (requiredSystem) {
      const enabled = await getEnabledSystemsForSchool(db, profile.schoolId);
      if (enabled && !enabled.has(requiredSystem)) {
        try {
          sessionStorage.setItem('th_access_denied', JSON.stringify({
            pageKey,
            label:  pageKey,
            reason: 'pilot',
            system: requiredSystem,
            at:     Date.now(),
          }));
        } catch (_) {}
        window.location.replace('/?denied=' + encodeURIComponent(pageKey) + '&reason=pilot');
        return;
      }
    }
  }

  // 5e. Subject + level gate (pacing / tracker pages).
  //     Direct-URL access to a pacing/tracker page redirects home if
  //     the user's subjects[] / classes[] don't cover it. Empty profile
  //     fields => no access (forces profile prompt to be filled).
  if (!isAdminRole) {
    const pageKey = currentPageKey();
    const meta    = PAGE_SUBJECT_LEVEL_MAP[pageKey];
    if (meta) {
      const userSubjects = Array.isArray(profile.subjects) ? profile.subjects : [];
      const userLevels   = Array.isArray(profile.classes)  ? profile.classes  : [];
      if (!userQualifiesForPage(userSubjects, userLevels, meta.subject, meta.level)) {
        try {
          sessionStorage.setItem('th_access_denied', JSON.stringify({
            pageKey,
            label: pageKey,
            reason: 'subject',
            subject: meta.subject,
            level:   meta.level,
            at: Date.now(),
          }));
        } catch (_) {}
        window.location.replace('/?denied=' + encodeURIComponent(pageKey) + '&reason=subject');
        return;
      }
    }
  }

  // 6. All checks passed — expose globals
  window.currentUser = user;
  window.userProfile = profile;

  // Log platform usage event (fire-and-forget, non-blocking)
  addDoc(collection(db, 'platform_usage'), {
    userId:   user.uid,
    platform: 'teachershub',
    role:     profile[PLATFORM_KEY] || '',
    ts:       serverTimestamp(),
  }).catch(() => {});

  // ── Populate shared nav elements ─────────────────────────────────
  const displayName = profile.displayName || user.displayName;
  const navUserName = document.querySelector('.nav-user-name');
  const navAvatar   = document.getElementById('navAvatar');
  const logoutBtn   = document.getElementById('logoutBtn');

  if (navUserName) {
    navUserName.textContent = displayName
      ? displayName.split(' ')[0]
      : user.email;
  }

  if (navAvatar) {
    const initials = displayName
      ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    navAvatar.textContent = initials;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = '/login';
    });
  }

  // 6.5. Page-access UI gating — hide navbar links + cards user cannot access.
  //      Two layers run together: sub-role page-access AND subject+level
  //      pacing gating. The navbar partial is fetched async, so we run an
  //      initial pass + a MutationObserver to catch late-added items.
  //      Subject order matters: page-access first sets data-pa-hidden, then
  //      subject gating decides empty-column hiding using BOTH attributes.
  if (!isAdminRole) {
    ensurePageAccessStyles();
    const subRoles     = Array.isArray(profile.th_sub_roles) ? profile.th_sub_roles : [];
    const userSubjects = Array.isArray(profile.subjects)     ? profile.subjects     : [];
    const userLevels   = Array.isArray(profile.classes)      ? profile.classes      : [];
    const configs      = await getAllPageAccessConfigs(db);
    // HQ users (no schoolId) bypass pilot gating entirely.
    const enabledSystems = await getEnabledSystemsForSchool(db, profile.schoolId);
    const runGating = () => {
      applyPageAccessGating(configs, subRoles);
      applyPilotSystemGating(enabledSystems);
      applySubjectGating(userSubjects, userLevels);
    };
    runGating();
    const mo = new MutationObserver(muts => {
      const interesting = muts.some(m =>
        [...m.addedNodes].some(n =>
          n.nodeType === 1 && (
            n.matches?.('[data-nav-key], a.card[href], a.resource-card[href], [data-pacing-subject]') ||
            n.querySelector?.('[data-nav-key], a.card[href], a.resource-card[href], [data-pacing-subject]')
          )
        )
      );
      if (interesting) runGating();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.__paGate = runGating;
  }

  // 7. Show page and notify
  document.body.style.visibility = 'visible';
  // Store detail so late listeners can read window.__authReadyDetail if the event already fired
  window.__authReadyDetail = { user, profile };
  // setTimeout(0) ensures page module scripts have registered their authReady listeners
  // before dispatch (ES modules execute in declaration order but auth-guard is in <head>)
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('authReady', {
      detail: { user, profile },
    }));
  }, 0);
});
