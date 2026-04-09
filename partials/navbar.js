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

  // Wire teaching profile section once auth + Firestore helpers are ready.
  // auth-guard.js sets window.__firestoreHelpers early; authReady fires after profile is loaded.
  function tryInitTeachingProfile() {
    const h = window.__firestoreHelpers;
    if (h && window.userProfile && window.currentUser) {
      initTeachingProfile(h.db, h.setDoc, h.doc);
    }
  }
  // authReady may have already fired (auth-guard runs before navbar partial loads)
  if (window.__authReadyDetail) {
    tryInitTeachingProfile();
  } else {
    document.addEventListener('authReady', tryInitTeachingProfile, { once: true });
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
//   school:             string
//   subjects:           string[]   e.g. ["math","chemistry"]
//   classes:            string[]   curriculum levels e.g. ["igcse","checkpoint"]
//   igcse_classes:      string[]   e.g. ["10A","9Cam","10Stan"]
//   asalevel_classes:   string[]
//   checkpoint_classes: string[]
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

  // In-memory working copy of per-level class lists (edited before save)
  // Keyed by level value: { igcse: ["10A","9Cam"], checkpoint: ["7X"], ... }
  let _levelClasses = {};

  function _classKey(levelValue) { return `${levelValue}_classes`; }

  function _loadLevelClasses() {
    const p = window.userProfile;
    LEVELS.forEach(l => {
      _levelClasses[l.value] = Array.isArray(p[_classKey(l.value)])
        ? [...p[_classKey(l.value)]]
        : [];
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
    const p = window.userProfile;
    const school   = p.school   || '—';
    const subjects = (p.subjects || []).map(v => (SUBJECTS.find(s => s.value === v) || {}).label || v).join(', ') || '—';
    const levels   = (p.classes  || []).map(v => (LEVELS.find(l => l.value === v)   || {}).label || v).join(', ') || '—';

    // Class lists per level
    const classLines = (p.classes || []).map(lv => {
      const lvLabel = (LEVELS.find(l => l.value === lv) || {}).label || lv;
      const cls     = (p[_classKey(lv)] || []).join(', ') || '—';
      return `<span style="color:rgba(255,255,255,0.3)">${lvLabel} classes:</span> ${cls}`;
    }).join('<br>');

    summaryEl.innerHTML =
      `<span style="color:rgba(255,255,255,0.3)">School:</span> ${school}<br>` +
      `<span style="color:rgba(255,255,255,0.3)">Subjects:</span> ${subjects}<br>` +
      `<span style="color:rgba(255,255,255,0.3)">Levels:</span> ${levels}` +
      (classLines ? `<br>${classLines}` : '');
  }

  // ── Per-level class list editor ──────────────────────────────────
  function renderMyClasses(selectedLevels) {
    if (!myClassesEl) return;
    myClassesEl.innerHTML = '';
    if (!selectedLevels.length) return;

    selectedLevels.forEach(lv => {
      const lvLabel = (LEVELS.find(l => l.value === lv) || {}).label || lv;
      const classes = _levelClasses[lv] || [];

      const group = document.createElement('div');
      group.className = 'pd-classes-group';
      group.dataset.level = lv;

      // Label
      const label = document.createElement('div');
      label.className = 'pd-classes-level-label';
      label.textContent = `${lvLabel} — My Classes`;
      group.appendChild(label);

      // Tag container
      const tagWrap = document.createElement('div');
      tagWrap.className = 'pd-class-tags';
      tagWrap.id = `pdClassTags_${lv}`;
      group.appendChild(tagWrap);

      function renderTags() {
        tagWrap.innerHTML = '';
        (_levelClasses[lv] || []).forEach((cls, idx) => {
          const tag = document.createElement('span');
          tag.className = 'pd-class-tag';
          tag.innerHTML = `${cls}<button class="pd-class-tag-remove" title="Remove" data-idx="${idx}">×</button>`;
          tag.querySelector('.pd-class-tag-remove').addEventListener('click', () => {
            _levelClasses[lv].splice(idx, 1);
            renderTags();
          });
          tagWrap.appendChild(tag);
        });
      }
      renderTags();

      // Add row
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
        if (!Array.isArray(_levelClasses[lv])) _levelClasses[lv] = [];
        // Allow comma-separated input: "10A, 9Cam, 10Stan"
        val.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
          if (!_levelClasses[lv].includes(s)) _levelClasses[lv].push(s);
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
  }

  // ── Chips ────────────────────────────────────────────────────────
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
      btn.addEventListener('click', () => btn.classList.toggle('on'));
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
        // Re-render class editors when level selection changes
        const active = [...lvlChips.querySelectorAll('.pd-chip.on')].map(b => b.dataset.value);
        renderMyClasses(active);
      });
      lvlChips.appendChild(btn);
    });
    if (schoolInput) schoolInput.value = (p.school || '');

    // Initial class editors for already-selected levels
    const activeLevels = [...(p.classes || [])];
    renderMyClasses(activeLevels);
  }

  _loadLevelClasses();
  renderSummary();

  // ── Toggle edit/summary ──────────────────────────────────────────
  if (toggleEl) {
    toggleEl.addEventListener('click', () => {
      const open = fieldsEl.style.display === 'none';
      if (open) {
        _loadLevelClasses(); // re-sync working copy from profile
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
      const subjects = [...subChips.querySelectorAll('.pd-chip.on')].map(b => b.dataset.value);
      const levels   = [...lvlChips.querySelectorAll('.pd-chip.on')].map(b => b.dataset.value);
      if (!school)          { msgEl.textContent = 'Please enter your school name.'; msgEl.className = 'pd-msg err'; return; }
      if (!subjects.length) { msgEl.textContent = 'Select at least one subject.';   msgEl.className = 'pd-msg err'; return; }
      if (!levels.length)   { msgEl.textContent = 'Select at least one level.';     msgEl.className = 'pd-msg err'; return; }

      // Build per-level class fields to save
      const classFields = {};
      LEVELS.forEach(l => {
        classFields[_classKey(l.value)] = Array.isArray(_levelClasses[l.value])
          ? _levelClasses[l.value] : [];
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
