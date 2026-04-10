// Avatar builder — exposed globally so page auth callbacks can call it
function buildAvatarEl(el, user) {
  if (!el || !user) return;
  const photoURL = user.photoURL;
  const displayName = user.displayName || user.email || 'U';
  const initial = displayName.charAt(0).toUpperCase();
  if (photoURL) {
    el.innerHTML = `<img src="${photoURL}" alt="${displayName}" referrerpolicy="no-referrer">`;
    el.style.background = 'transparent';
  } else {
    el.textContent = initial;
    el.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }
}

// Called after navbar HTML is injected into the DOM
function initNavbar() {
  // Profile dropdown toggle
  const profileBtn = document.getElementById('profileBtn');
  const profileWrap = document.getElementById('profileWrap');
  const profileDropdown = document.getElementById('profileDropdown');

  if (profileBtn && profileWrap) {
    profileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      profileWrap.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      profileWrap.classList.remove('open');
    });
    if (profileDropdown) {
      profileDropdown.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
  }

  // Password section toggle
  const pdPwToggle = document.getElementById('pdPwToggle');
  const pdPwFields = document.getElementById('pdPwFields');
  if (pdPwToggle && pdPwFields) {
    pdPwToggle.addEventListener('click', function () {
      const open = pdPwFields.classList.toggle('open');
      pdPwToggle.textContent = open ? '▾ Change password' : '▸ Change password';
    });
  }

  // Sign out — host page sets window.authSignOut = () => signOut(auth)
  const pdSignOut = document.getElementById('pdSignOut');
  if (pdSignOut) {
    pdSignOut.addEventListener('click', function () {
      if (typeof window.authSignOut === 'function') window.authSignOut();
    });
  }

  // Scroll effect
  window.addEventListener('scroll', function () {
    const nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Populate dropdown header + avatar + name + email + password section.
  // Also wires teaching profile section once Firestore helpers are ready.
  function populateDropdown() {
    const user    = window.currentUser;
    const profile = window.userProfile;
    if (!user || !profile) return;

    // Header: large avatar + name + email
    const pdAvatarLg = document.getElementById('pdAvatarLg');
    const pdName     = document.getElementById('pdName');
    const pdEmail    = document.getElementById('pdEmail');
    if (pdAvatarLg) buildAvatarEl(pdAvatarLg, user);
    if (pdName)     pdName.textContent  = profile.displayName || user.displayName || user.email;
    if (pdEmail)    pdEmail.textContent = user.email;

    // Nav avatar + short name (some pages set these themselves; fill gaps)
    const navAvatar    = document.getElementById('profileAvatar');
    const navNameShort = document.getElementById('profileNameShort');
    const navWrap      = document.getElementById('profileWrap');
    if (navAvatar && !navAvatar.textContent.trim() && !navAvatar.querySelector('img')) {
      buildAvatarEl(navAvatar, user);
    }
    if (navNameShort && !navNameShort.textContent.trim()) {
      const display = profile.displayName || user.displayName || user.email;
      navNameShort.textContent = display.split(' ')[0];
    }
    if (navWrap) navWrap.style.display = 'flex';

    // Phone: pre-fill saved value
    const pdPhone = document.getElementById('pdPhone');
    if (pdPhone && profile.phone) pdPhone.value = profile.phone;

    // Password section: only show for email/password users
    const pdPwSection = document.getElementById('pdPwSection');
    if (pdPwSection) {
      const isPasswordUser = user.providerData.some(p => p.providerId === 'password');
      pdPwSection.style.display = isPasswordUser ? '' : 'none';
    }

    // Teaching profile + class editor
    const h = window.__firestoreHelpers;
    if (h) initTeachingProfile(h.db, h.setDoc, h.doc);
  }

  if (window.__authReadyDetail) {
    populateDropdown();
  } else {
    document.addEventListener('authReady', populateDropdown, { once: true });
  }
}

// Wires up the feedback modal (HTML comes from the navbar partial).
// helpers: { addDoc, collection, serverTimestamp }
// Uses window.currentUser at submit time — ensure that is set by the page.
function initFeedback(db, helpers) {
  const { addDoc, collection, serverTimestamp } = helpers;
  const feedbackOverlay   = document.getElementById('feedbackOverlay');
  const feedbackCloseBtn  = document.getElementById('feedbackCloseBtn');
  const feedbackForm      = document.getElementById('feedbackForm');
  const feedbackStatus    = document.getElementById('feedbackStatus');
  const feedbackSubmitBtn = document.getElementById('feedbackSubmitBtn');
  if (!feedbackOverlay) return;

  function openFeedback() {
    feedbackStatus.className = 'feedback-status';
    feedbackStatus.textContent = '';
    feedbackOverlay.classList.add('open');
  }
  function closeFeedback() {
    feedbackOverlay.classList.remove('open');
  }

  document.getElementById('feedbackBtn')?.addEventListener('click', openFeedback);
  feedbackCloseBtn.addEventListener('click', closeFeedback);
  feedbackOverlay.addEventListener('click', (e) => { if (e.target === feedbackOverlay) closeFeedback(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFeedback(); });

  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = window.currentUser;
    if (!user) return;
    const subject = document.getElementById('feedbackSubject').value;
    const message = document.getElementById('feedbackMessage').value.trim();
    if (!subject || !message) return;
    feedbackSubmitBtn.disabled = true;
    feedbackSubmitBtn.textContent = 'Sending…';
    feedbackStatus.className = 'feedback-status';
    try {
      await addDoc(collection(db, 'feedbacks'), {
        uid: user.uid,
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        subject, message,
        createdAt: serverTimestamp(),
      });
      feedbackStatus.textContent = 'Feedback sent successfully! Thank you.';
      feedbackStatus.className = 'feedback-status success';
      feedbackForm.reset();
      setTimeout(closeFeedback, 2500);
    } catch (err) {
      console.error('Feedback error:', err);
      feedbackStatus.textContent = 'Failed to send. Please try again.';
      feedbackStatus.className = 'feedback-status error';
    } finally {
      feedbackSubmitBtn.disabled = false;
      feedbackSubmitBtn.textContent = 'Send Feedback';
    }
  });
}

// Populates and wires the Teaching Profile section in the profile dropdown.
// Called after navbar + authReady are both ready.
// db, setDoc, doc come from window.__firestoreHelpers (set by auth-guard.js).
//
// Firestore fields saved on users/{uid}:
//   school:                    string
//   subjects:                  string[]   e.g. ["math","chemistry"]
//   classes:                   string[]   curriculum levels e.g. ["igcse","checkpoint"]
//   igcse_math_classes:        string[]   e.g. ["9 Har","9 Oxf"]
//   igcse_biology_classes:     string[]
//   igcse_chemistry_classes:   string[]
//   igcse_physics_classes:     string[]
//   igcse_english_classes:     string[]
//   igcse_science_classes:     string[]
//   asalevel_math_classes:     string[]
//   ... (same pattern for checkpoint and asalevel)
function initTeachingProfile(db, setDoc, doc) {
  const profile = window.userProfile;
  const user    = window.currentUser;
  if (!profile || !user) return;

  const SUBJECTS = window.TEACHERS_SUBJECT_OPTIONS || [
    { value: 'math',      label: 'Mathematics' },
    { value: 'biology',   label: 'Biology' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'physics',   label: 'Physics' },
    { value: 'english',   label: 'English' },
    { value: 'science',   label: 'Science' },
  ];
  const LEVELS = window.TEACHERS_CLASS_OPTIONS || [
    { value: 'checkpoint', label: 'Checkpoint' },
    { value: 'igcse',      label: 'IGCSE' },
    { value: 'asalevel',   label: 'AS & A Level' },
  ];

  // In-memory working copy: keyed by "level_subject" e.g. "igcse_math"
  // { igcse_math: ["9 Har","9 Oxf"], igcse_physics: ["10A"], ... }
  let _slClasses = {};

  function _slKey(levelValue, subjectValue) { return `${levelValue}_${subjectValue}_classes`; }

  function _loadSlClasses() {
    const p = window.userProfile;
    LEVELS.forEach(l => {
      SUBJECTS.forEach(s => {
        const key = _slKey(l.value, s.value);
        _slClasses[key] = Array.isArray(p[key]) ? [...p[key]] : [];
      });
    });
  }

  const summaryEl   = document.getElementById('pdTeachingSummary');
  const fieldsEl    = document.getElementById('pdTeachingFields');
  const toggleEl    = document.getElementById('pdTeachingToggle');
  const schoolInput = document.getElementById('pdSchool');
  const subChips    = document.getElementById('pdSubjectChips');
  const lvlChips    = document.getElementById('pdClassChips');
  const myClassesEl = document.getElementById('pdMyClasses');
  const saveBtn     = document.getElementById('pdTeachingBtn');
  const msgEl       = document.getElementById('pdTeachingMsg');
  if (!summaryEl || !fieldsEl) return;

  // ── Summary (read-only) ──────────────────────────────────────────
  function renderSummary() {
    const p        = window.userProfile;
    const school   = p.school   || '—';
    const subjects = (p.subjects || []).map(v => (SUBJECTS.find(s => s.value === v) || {}).label || v).join(', ') || '—';
    const levels   = (p.classes  || []).map(v => (LEVELS.find(l => l.value === v)   || {}).label || v).join(', ') || '—';

    // Class lists per subject×level combination
    const combos = [];
    (p.classes || []).forEach(lv => {
      const lvLabel = (LEVELS.find(l => l.value === lv) || {}).label || lv;
      (p.subjects || []).forEach(sv => {
        const subLabel = (SUBJECTS.find(s => s.value === sv) || {}).label || sv;
        const key = _slKey(lv, sv);
        const cls = (p[key] || []).join(', ') || '—';
        combos.push(`<span style="color:rgba(255,255,255,0.3)">${lvLabel} ${subLabel}:</span> ${cls}`);
      });
    });

    summaryEl.innerHTML =
      `<span style="color:rgba(255,255,255,0.3)">School:</span> ${school}<br>` +
      `<span style="color:rgba(255,255,255,0.3)">Subjects:</span> ${subjects}<br>` +
      `<span style="color:rgba(255,255,255,0.3)">Levels:</span> ${levels}` +
      (combos.length ? `<br>${combos.join('<br>')}` : '');
  }

  // ── Per subject×level class list editor ─────────────────────────
  function renderMyClasses(selectedLevels, selectedSubjects) {
    if (!myClassesEl) return;
    myClassesEl.innerHTML = '';
    if (!selectedLevels.length || !selectedSubjects.length) return;

    selectedLevels.forEach(lv => {
      const lvLabel = (LEVELS.find(l => l.value === lv) || {}).label || lv;

      selectedSubjects.forEach(sv => {
        const subLabel = (SUBJECTS.find(s => s.value === sv) || {}).label || sv;
        const key = _slKey(lv, sv);
        if (!Array.isArray(_slClasses[key])) _slClasses[key] = [];

        const group = document.createElement('div');
        group.className = 'pd-classes-group';
        group.dataset.key = key;

        const label = document.createElement('div');
        label.className = 'pd-classes-level-label';
        label.textContent = `${lvLabel} ${subLabel} — My Classes`;
        group.appendChild(label);

        const tagWrap = document.createElement('div');
        tagWrap.className = 'pd-class-tags';
        group.appendChild(tagWrap);

        function renderTags() {
          tagWrap.innerHTML = '';
          (_slClasses[key] || []).forEach((cls, idx) => {
            const tag = document.createElement('span');
            tag.className = 'pd-class-tag';
            tag.innerHTML = `${cls}<button class="pd-class-tag-remove" title="Remove" data-idx="${idx}">×</button>`;
            tag.querySelector('.pd-class-tag-remove').addEventListener('click', () => {
              _slClasses[key].splice(idx, 1);
              renderTags();
            });
            tagWrap.appendChild(tag);
          });
        }
        renderTags();

        const addRow = document.createElement('div');
        addRow.className = 'pd-class-add-row';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'pd-class-input';
        input.placeholder = 'e.g. 10A, 9Cam';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'pd-class-add-btn';
        addBtn.textContent = '+';

        const doAdd = () => {
          const val = input.value.trim();
          if (!val) return;
          val.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
            if (!_slClasses[key].includes(s)) _slClasses[key].push(s);
          });
          input.value = '';
          renderTags();
        };
        addBtn.addEventListener('click', doAdd);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });

        addRow.appendChild(input);
        addRow.appendChild(addBtn);
        group.appendChild(addRow);
        myClassesEl.appendChild(group);
      });
    });
  }

  // ── Chips ────────────────────────────────────────────────────────
  function _activeSubjects() { return [...subChips.querySelectorAll('.pd-chip.on')].map(b => b.dataset.value); }
  function _activeLevels()   { return [...lvlChips.querySelectorAll('.pd-chip.on')].map(b => b.dataset.value); }

  function renderChips() {
    const p = window.userProfile;
    subChips.innerHTML = '';
    lvlChips.innerHTML = '';
    SUBJECTS.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pd-chip' + ((p.subjects || []).includes(s.value) ? ' on' : '');
      btn.dataset.value = s.value;
      btn.textContent = s.label;
      btn.addEventListener('click', () => {
        btn.classList.toggle('on');
        renderMyClasses(_activeLevels(), _activeSubjects());
      });
      subChips.appendChild(btn);
    });
    LEVELS.forEach(l => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pd-chip' + ((p.classes || []).includes(l.value) ? ' on' : '');
      btn.dataset.value = l.value;
      btn.textContent = l.label;
      btn.addEventListener('click', () => {
        btn.classList.toggle('on');
        renderMyClasses(_activeLevels(), _activeSubjects());
      });
      lvlChips.appendChild(btn);
    });
    if (schoolInput) schoolInput.value = (p.school || '');

    renderMyClasses(p.classes || [], p.subjects || []);
  }

  _loadSlClasses();
  renderSummary();

  // ── Toggle edit/summary ──────────────────────────────────────────
  if (toggleEl) {
    toggleEl.addEventListener('click', () => {
      const open = fieldsEl.style.display === 'none';
      if (open) {
        _loadSlClasses();
        renderChips();
        fieldsEl.style.display = 'block';
        summaryEl.style.display = 'none';
        toggleEl.textContent = '▾ Close';
      } else {
        fieldsEl.style.display = 'none';
        summaryEl.style.display = '';
        toggleEl.textContent = '▸ Edit';
        msgEl.className = 'pd-msg';
      }
    });
  }

  // ── Save ─────────────────────────────────────────────────────────
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const school   = schoolInput ? schoolInput.value.trim() : '';
      const subjects = _activeSubjects();
      const levels   = _activeLevels();
      if (!school)          { msgEl.textContent = 'Please enter your school name.'; msgEl.className = 'pd-msg err'; return; }
      if (!subjects.length) { msgEl.textContent = 'Select at least one subject.';   msgEl.className = 'pd-msg err'; return; }
      if (!levels.length)   { msgEl.textContent = 'Select at least one level.';     msgEl.className = 'pd-msg err'; return; }

      // Build all subject×level class fields to save
      const classFields = {};
      LEVELS.forEach(l => {
        SUBJECTS.forEach(s => {
          const key = _slKey(l.value, s.value);
          classFields[key] = Array.isArray(_slClasses[key]) ? _slClasses[key] : [];
        });
      });

      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        await setDoc(doc(db, 'users', user.uid),
          { school, subjects, classes: levels, ...classFields },
          { merge: true }
        );
        window.userProfile = { ...window.userProfile, school, subjects, classes: levels, ...classFields };
        renderSummary();
        fieldsEl.style.display = 'none';
        summaryEl.style.display = '';
        if (toggleEl) toggleEl.textContent = '▸ Edit';
        msgEl.textContent = 'Saved ✓';
        msgEl.className = 'pd-msg ok';
        setTimeout(() => { msgEl.className = 'pd-msg'; }, 2500);
      } catch (e) {
        msgEl.textContent = 'Failed to save. Try again.';
        msgEl.className = 'pd-msg err';
      } finally {
        saveBtn.disabled = false; saveBtn.textContent = 'Save Teaching Profile';
      }
    });
  }
}

// Sets up live total-count badges for Announcements and Message Board nav buttons.
// Call after the navbar partial is in the DOM.
// helpers: { onSnapshot, collection }
function setupNavBadges(db, helpers) {
  const { onSnapshot, collection } = helpers;

  function setBadge(id, n) {
    const el = document.getElementById(id);
    if (el) { el.textContent = n > 99 ? '99+' : String(n); el.style.display = n > 0 ? 'flex' : 'none'; }
  }

  onSnapshot(collection(db, 'announcements'), (snap) => setBadge('announcementsBadge', snap.size));
  onSnapshot(collection(db, 'surveys'),       (snap) => setBadge('surveysBadge',        snap.size));
  onSnapshot(collection(db, 'topics'),        (snap) => setBadge('msgBoardBadge',       snap.size));
}
