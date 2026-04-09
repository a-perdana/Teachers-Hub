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
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, updateDoc }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Platform identity ─────────────────────────────────────────────
const PLATFORM_KEY  = 'role_teachershub';  // per-user Firestore field
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

// ── Initialise Firebase (guard against double-init) ──────────────
const firebaseConfig = {
  apiKey:            window.ENV.FIREBASE_API_KEY,
  authDomain:        window.ENV.FIREBASE_AUTH_DOMAIN,
  projectId:         window.ENV.FIREBASE_PROJECT_ID,
  storageBucket:     window.ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId:             window.ENV.FIREBASE_APP_ID,
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

window.firebaseApp = app;
window.auth        = auth;
window.db          = db;
// Expose Firestore helpers for navbar.js initTeachingProfile (set early; navbar.js picks them up after authReady)
window.__firestoreHelpers = { db, setDoc, doc };

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
const SUBJECT_OPTIONS = [
  { value: 'math',      label: 'Mathematics' },
  { value: 'biology',   label: 'Biology' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'physics',   label: 'Physics' },
  { value: 'english',   label: 'English' },
  { value: 'science',   label: 'Science' },
];

const CLASS_OPTIONS = [
  { value: 'checkpoint', label: 'Checkpoint (Year 7–8)' },
  { value: 'igcse',      label: 'IGCSE (Year 9–10)' },
  { value: 'asalevel',   label: 'AS & A Level (Year 11–12)' },
];

// Expose so index.html can reference labels when needed
window.TEACHERS_SUBJECT_OPTIONS = SUBJECT_OPTIONS;
window.TEACHERS_CLASS_OPTIONS   = CLASS_OPTIONS;

function profileComplete(profile) {
  return (
    profile.school   && profile.school.trim() &&
    Array.isArray(profile.subjects) && profile.subjects.length > 0 &&
    Array.isArray(profile.classes)  && profile.classes.length  > 0
  );
}

function promptForProfile(profile) {
  return new Promise(resolve => {
    const existing = {
      school:   profile.school   || '',
      subjects: Array.isArray(profile.subjects) ? profile.subjects : [],
      classes:  Array.isArray(profile.classes)  ? profile.classes  : [],
    };

    const subjectChips = SUBJECT_OPTIONS.map(o => `
      <button type="button" class="_chip ${existing.subjects.includes(o.value) ? '_chip-on' : ''}"
        data-group="subjects" data-value="${o.value}">${o.label}</button>`).join('');

    const classChips = CLASS_OPTIONS.map(o => `
      <button type="button" class="_chip ${existing.classes.includes(o.value) ? '_chip-on' : ''}"
        data-group="classes" data-value="${o.value}">${o.label}</button>`).join('');

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(28,28,46,0.82);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"DM Sans",sans-serif';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:40px 36px;width:100%;max-width:480px;box-shadow:0 24px 64px rgba(0,0,0,0.40);max-height:90vh;overflow-y:auto">
        <div style="margin-bottom:24px">
          <h2 style="font-size:1.35rem;font-weight:700;color:#1c1c2e;margin-bottom:6px">Set up your profile</h2>
          <p style="font-size:0.875rem;color:#8888a8;line-height:1.5">Tell us about your school and the classes you teach so we can show you the right pacing guides.</p>
        </div>

        <label style="display:block;font-size:0.82rem;font-weight:600;color:#44445a;margin-bottom:6px">School name</label>
        <input id="_schoolInput" type="text" placeholder="e.g. SMA Semesta" value="${existing.school.replace(/"/g,'&quot;')}"
          style="width:100%;padding:10px 14px;border:1.5px solid #e0ddd6;border-radius:10px;font-size:0.95rem;color:#1c1c2e;outline:none;box-sizing:border-box;margin-bottom:20px">

        <label style="display:block;font-size:0.82rem;font-weight:600;color:#44445a;margin-bottom:10px">Subjects you teach <span style="color:#dc2626">*</span></label>
        <div id="_subjectChips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">${subjectChips}</div>

        <label style="display:block;font-size:0.82rem;font-weight:600;color:#44445a;margin-bottom:10px">Curriculum levels <span style="color:#dc2626">*</span></label>
        <div id="_classChips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px">${classChips}</div>

        <p id="_profileErr" style="font-size:0.82rem;color:#dc2626;min-height:18px;margin-bottom:12px"></p>
        <button id="_profileBtn" style="width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;border:none;border-radius:10px;font-size:0.95rem;font-weight:600;cursor:pointer">Save & Continue →</button>
      </div>
      <style>
        ._chip{padding:7px 14px;border-radius:20px;border:1.5px solid #e0ddd6;background:#f7f6f3;color:#44445a;font-size:0.84rem;font-weight:500;cursor:pointer;transition:all .15s}
        ._chip:hover{border-color:#6c5ce7;color:#6c5ce7}
        ._chip-on{background:#ede9fe;border-color:#6c5ce7;color:#6c5ce7;font-weight:600}
      </style>`;

    document.body.appendChild(overlay);
    document.body.style.visibility = 'visible';

    // Chip toggle
    overlay.addEventListener('click', e => {
      const chip = e.target.closest('._chip');
      if (!chip) return;
      chip.classList.toggle('_chip-on');
    });

    const btn = overlay.querySelector('#_profileBtn');
    const err = overlay.querySelector('#_profileErr');

    btn.addEventListener('click', () => {
      const school   = overlay.querySelector('#_schoolInput').value.trim();
      const subjects = [...overlay.querySelectorAll('._chip[data-group="subjects"]._chip-on')].map(c => c.dataset.value);
      const classes  = [...overlay.querySelectorAll('._chip[data-group="classes"]._chip-on')].map(c => c.dataset.value);

      if (!school)           { err.textContent = 'Please enter your school name.'; return; }
      if (!subjects.length)  { err.textContent = 'Please select at least one subject.'; return; }
      if (!classes.length)   { err.textContent = 'Please select at least one curriculum level.'; return; }

      overlay.remove();
      document.body.style.visibility = 'hidden';
      resolve({ school, subjects, classes });
    });
  });
}

// ── Auth state listener ──────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {

  // 1. Not signed in → redirect to login
  if (!user) {
    window.location.replace('/login');
    return;
  }

  // 2. Fetch (or create) Firestore profile
  let profile;
  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First sign-in: assign default Teachers Hub role.
      const newProfile = {
        uid:            user.uid,
        email:          user.email,
        displayName:    user.displayName || '',
        photoURL:       user.photoURL    || '',
        [PLATFORM_KEY]: DEFAULT_ROLE,
        createdAt:      serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      profile = newProfile;
    } else {
      profile = userSnap.data();
      // Legacy migration: if Teachers Hub role field is absent, derive from old `role` field
      if (profile[PLATFORM_KEY] == null) {
        const legacy     = profile.role;
        const assignRole = ALLOWED_ROLES.includes(legacy) ? legacy : DEFAULT_ROLE;
        await setDoc(userRef, { [PLATFORM_KEY]: assignRole }, { merge: true });
        profile = { ...profile, [PLATFORM_KEY]: assignRole };
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
  // Set profile.role for backward compat with page-level checks
  profile.role = platformRole;

  // 5. Name prompt if missing
  if (!profile.displayName) {
    const name = await promptForName();
    await setDoc(userRef, { displayName: name }, { merge: true });
    profile.displayName = name;
  }

  // 5b. Profile setup prompt if school/subjects/classes are missing
  if (!profileComplete(profile)) {
    const { school, subjects, classes } = await promptForProfile(profile);
    await setDoc(userRef, { school, subjects, classes }, { merge: true });
    profile.school   = school;
    profile.subjects = subjects;
    profile.classes  = classes;
  }

  // 6. All checks passed — expose globals
  window.currentUser = user;
  window.userProfile = profile;

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
