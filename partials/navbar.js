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
      // If teaching profile form is open and dirty, warn instead of closing
      const fieldsOpen = document.getElementById('pdTeachingFields')?.style.display !== 'none';
      if (profileWrap.classList.contains('open') && fieldsOpen && window.__teachingProfileDirty) {
        const msgEl = document.getElementById('pdTeachingMsg');
        if (msgEl) {
          msgEl.textContent = 'You have unsaved changes. Save or discard first.';
          msgEl.className = 'pd-msg warn';
        }
        return;
      }
      profileWrap.classList.remove('open');
    });
    if (profileDropdown) {
      profileDropdown.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
  }

  // Tab switching
  document.querySelectorAll('.pd-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pd-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panelId = tab.getAttribute('data-tab');
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    });
  });

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

    // Role badge
    const pdRoleBadge = document.getElementById('pdRoleBadge');
    if (pdRoleBadge) {
      const isAdmin = profile.role_teachershub === 'teachers_admin';
      pdRoleBadge.textContent = isAdmin ? 'Admin' : 'User';
      pdRoleBadge.className   = 'pd-role-badge' + (isAdmin ? ' admin' : '');
      pdRoleBadge.style.display = '';
    }

    // Info strip: school + sub-roles
    const infoStrip    = document.getElementById('pdInfoStrip');
    const schoolRow    = document.getElementById('pdSchoolRow');
    const schoolVal    = document.getElementById('pdSchoolVal');
    const subRolesRow  = document.getElementById('pdSubRolesRow');
    const chipsEl      = document.getElementById('pdSubRoleChips');
    let stripVisible   = false;

    if (schoolVal && profile.school) {
      schoolVal.textContent = profile.school;
      if (schoolRow) schoolRow.style.display = 'flex';
      stripVisible = true;
    }

    const subRoles = Array.isArray(profile.th_sub_roles) ? profile.th_sub_roles : [];
    const TH_ROLE_LABELS = { subject_teacher: 'Subject Teacher', subject_leader: 'Subject Leader' };
    if (chipsEl && subRoles.length) {
      chipsEl.innerHTML = '';
      subRoles.forEach(key => {
        const chip = document.createElement('span');
        chip.className   = 'pd-subrole-chip ' + key;
        chip.textContent = TH_ROLE_LABELS[key] || key;
        chipsEl.appendChild(chip);
      });
      if (subRolesRow) subRolesRow.style.display = 'flex';
      stripVisible = true;
    }

    if (infoStrip && stripVisible) infoStrip.style.display = '';

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
// Data model — each active level×subject combination is independent:
//   school:                  string
//   teaching_combos:         string[]  e.g. ["igcse_math","asalevel_physics"]
//   igcse_math_classes:      string[]  e.g. ["10A","9Cam"]
//   asalevel_physics_classes: string[]
//   ... one field per active combo
//
// Legacy fields (subjects[], classes[]) are read for migration but not written.
function initTeachingProfile(db, setDoc, doc) {
  const profile = window.userProfile;
  const user    = window.currentUser;
  if (!profile || !user) return;

  // Cambridge subjects only — used for the combo grid (level × subject)
  const SUBJECTS = [
    { value: 'math',      label: 'Mathematics' },
    { value: 'biology',   label: 'Biology' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'physics',   label: 'Physics' },
    { value: 'english',   label: 'English' },
    { value: 'science',   label: 'Science' },
  ];
  // Non-Cambridge subjects shown in summary but not in the combo grid
  const NON_CAMBRIDGE_SUBJECTS = [
    { value: 'religion', label: 'Religion' },
  ];
  const ALL_KNOWN_SUBJECTS = [...SUBJECTS, ...NON_CAMBRIDGE_SUBJECTS];
  const LEVELS = [
    { value: 'checkpoint', label: 'Checkpoint (Year 7–8)' },
    { value: 'igcse',      label: 'IGCSE (Year 9–10)' },
    { value: 'asalevel',   label: 'AS & A Level (Year 11–12)' },
  ];

  function _slKey(lv, sv) { return `${lv}_${sv}_classes`; }
  function _lvLabel(lv) { return (LEVELS.find(l => l.value === lv) || {}).label || lv; }
  // For unknown values (custom "other" subjects), capitalise each word
  function _svLabel(sv) {
    const known = ALL_KNOWN_SUBJECTS.find(s => s.value === sv);
    if (known) return known.label;
    return sv.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  // Returns true if a subject value is a Cambridge subject
  function _isCambridgeSubject(sv) { return SUBJECTS.some(s => s.value === sv); }

  // Active combos: Set of "lv_sv" strings e.g. "igcse_math"
  // Classes per combo: { igcse_math_classes: ["10A","9Cam"], ... }
  let _activeCombos = new Set();
  let _slClasses    = {};

  let _dirty = false;
  function _markDirty() { _dirty = true; window.__teachingProfileDirty = true; }
  function _clearDirty() { _dirty = false; window.__teachingProfileDirty = false; }

  // Load from Firestore profile into working state
  function _loadState() {
    const p = window.userProfile;
    _activeCombos = new Set();
    _slClasses    = {};

    // New model: teaching_combos array
    if (Array.isArray(p.teaching_combos) && p.teaching_combos.length) {
      p.teaching_combos.forEach(combo => {
        const [lv, sv] = combo.split('_');
        if (lv && sv) {
          _activeCombos.add(combo);
          const key = _slKey(lv, sv);
          _slClasses[key] = Array.isArray(p[key]) ? [...p[key]] : [];
        }
      });
    } else {
      // Legacy migration: subjects[] × classes[] → active combos
      const legacySubjects = Array.isArray(p.subjects) ? p.subjects : [];
      const legacyLevels   = Array.isArray(p.classes)  ? p.classes  : [];
      legacyLevels.forEach(lv => {
        legacySubjects.forEach(sv => {
          const combo = `${lv}_${sv}`;
          _activeCombos.add(combo);
          const key = _slKey(lv, sv);
          _slClasses[key] = Array.isArray(p[key]) ? [...p[key]] : [];
        });
      });
    }
  }

  const summaryEl   = document.getElementById('pdTeachingSummary');
  const fieldsEl    = document.getElementById('pdTeachingFields');
  const toggleEl    = document.getElementById('pdTeachingToggle');
  const schoolInput = document.getElementById('pdSchool');
  const myClassesEl = document.getElementById('pdMyClasses');
  const saveBtn     = document.getElementById('pdTeachingBtn');
  const msgEl       = document.getElementById('pdTeachingMsg');
  if (!summaryEl || !fieldsEl) return;

  // ── Summary (read-only) ──────────────────────────────────────────
  function renderSummary() {
    const p      = window.userProfile;
    const school = p.school || '—';

    // Cambridge combos → "IGCSE Mathematics: 10A, 9Cam"
    const cambridgeLines = [..._activeCombos].map(combo => {
      const [lv, sv] = combo.split('_');
      const cls = (_slClasses[_slKey(lv, sv)] || []).join(', ') || '—';
      return `<span style="color:rgba(255,255,255,0.3)">${_lvLabel(lv).split(' ')[0]} ${_svLabel(sv)}:</span> ${cls}`;
    });

    // Non-Cambridge subjects from subjects[] (religion, custom, etc.)
    const allSubjects   = Array.isArray(p.subjects) ? p.subjects : [];
    const nonCamSubjects = allSubjects.filter(sv => !_isCambridgeSubject(sv));
    const nonCamLine = nonCamSubjects.length
      ? `<span style="color:rgba(255,255,255,0.3)">Other:</span> ${nonCamSubjects.map(_svLabel).join(', ')}`
      : null;

    const allLines = [...cambridgeLines, ...(nonCamLine ? [nonCamLine] : [])];

    if (!allLines.length) {
      summaryEl.innerHTML =
        `<span style="color:rgba(255,255,255,0.3)">School:</span> ${school}<br>` +
        `<span style="color:rgba(255,255,255,0.3)">Teaching:</span> —`;
      return;
    }
    summaryEl.innerHTML =
      `<span style="color:rgba(255,255,255,0.3)">School:</span> ${school}<br>` +
      allLines.join('<br>');
  }

  // ── Combo grid — each level×subject cell is a toggle ────────────
  function renderComboGrid() {
    // Find or create the grid container (above myClassesEl)
    let grid = document.getElementById('pdComboGrid');
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'pdComboGrid';
      grid.style.cssText = 'margin-bottom:14px;';
      myClassesEl.before(grid);
    }
    grid.innerHTML = '';

    const COL = '72px'; // fixed label column; subject cols share the rest equally
    const gridCols = `${COL} repeat(${SUBJECTS.length}, 1fr)`;

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `display:grid;grid-template-columns:${gridCols};gap:4px;margin-bottom:4px;`;
    headerRow.appendChild(document.createElement('div')); // empty corner
    SUBJECTS.forEach(s => {
      const th = document.createElement('div');
      th.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,0.4);text-align:center;padding:2px 2px;line-height:1.2;';
      th.textContent = s.label.replace('Mathematics','Math').replace('Chemistry','Chem').replace('Physics','Phys').replace('Biology','Bio').replace('English','Eng').replace('Science','Sci');
      headerRow.appendChild(th);
    });
    grid.appendChild(headerRow);

    // One row per level
    LEVELS.forEach(l => {
      const row = document.createElement('div');
      row.style.cssText = `display:grid;grid-template-columns:${gridCols};gap:4px;margin-bottom:4px;align-items:center;`;

      const rowLabel = document.createElement('div');
      rowLabel.style.cssText = 'font-size:9px;font-weight:700;color:rgba(255,255,255,0.4);white-space:nowrap;line-height:1.2;';
      rowLabel.textContent = l.label.split(' ')[0]; // "Checkpoint" / "IGCSE" / "AS"
      row.appendChild(rowLabel);

      SUBJECTS.forEach(s => {
        const combo = `${l.value}_${s.value}`;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.dataset.combo = combo;
        const isOn = _activeCombos.has(combo);
        cell.className = 'pd-chip' + (isOn ? ' on' : '');
        cell.style.cssText = 'font-size:11px;padding:4px 2px;border-radius:5px;width:100%;text-align:center;';
        cell.textContent = '✓';
        cell.title = `${_lvLabel(l.value)} ${_svLabel(s.value)}`;
        cell.addEventListener('click', () => {
          if (_activeCombos.has(combo)) {
            _activeCombos.delete(combo);
            cell.classList.remove('on');
          } else {
            _activeCombos.add(combo);
            const key = _slKey(l.value, s.value);
            if (!Array.isArray(_slClasses[key])) _slClasses[key] = [];
            cell.classList.add('on');
          }
          _markDirty();
          renderClassEditors();
        });
        row.appendChild(cell);
      });
      grid.appendChild(row);
    });

    // Legend hint
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:10.5px;color:rgba(255,255,255,0.3);margin-top:2px;margin-bottom:12px;';
    hint.textContent = 'Tick the subjects you teach at each level';
    grid.appendChild(hint);
  }

  // ── Class editors — one per active combo ────────────────────────
  function renderClassEditors() {
    if (!myClassesEl) return;
    myClassesEl.innerHTML = '';
    if (!_activeCombos.size) return;

    _activeCombos.forEach(combo => {
      const [lv, sv] = combo.split('_');
      const key = _slKey(lv, sv);
      if (!Array.isArray(_slClasses[key])) _slClasses[key] = [];

      const group = document.createElement('div');
      group.className = 'pd-classes-group';
      group.dataset.key = key;

      const label = document.createElement('div');
      label.className = 'pd-classes-level-label';
      label.textContent = `${_lvLabel(lv)} ${_svLabel(sv)} — My Classes`;
      group.appendChild(label);

      const emptyHint = document.createElement('div');
      emptyHint.className = 'pd-classes-empty-hint';
      emptyHint.textContent = 'Add at least one class below';
      group.appendChild(emptyHint);

      const tagWrap = document.createElement('div');
      tagWrap.className = 'pd-class-tags';
      group.appendChild(tagWrap);

      function renderTags() {
        tagWrap.innerHTML = '';
        const list = _slClasses[key] || [];
        group.classList.toggle('has-classes', list.length > 0);
        group.classList.remove('missing');
        list.forEach((cls, idx) => {
          const tag = document.createElement('span');
          tag.className = 'pd-class-tag';
          tag.innerHTML = `${cls}<button class="pd-class-tag-remove" title="Remove" data-idx="${idx}">×</button>`;
          tag.querySelector('.pd-class-tag-remove').addEventListener('click', () => {
            _slClasses[key].splice(idx, 1);
            _markDirty();
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
        val.split(',').map(x => x.trim()).filter(Boolean).forEach(x => {
          if (!_slClasses[key].includes(x)) _slClasses[key].push(x);
        });
        input.value = '';
        _markDirty();
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

  // ── Open edit form ───────────────────────────────────────────────
  function openForm() {
    _loadState();
    _clearDirty();
    if (schoolInput) {
      schoolInput.value = window.userProfile.school || '';
      schoolInput.addEventListener('input', _markDirty, { once: false });
    }
    renderComboGrid();
    renderClassEditors();
    fieldsEl.style.display = 'block';
    summaryEl.style.display = 'none';
    if (toggleEl) toggleEl.textContent = '▾ Close';
  }

  function _closeForm() {
    fieldsEl.style.display = 'none';
    summaryEl.style.display = '';
    if (toggleEl) toggleEl.textContent = '▸ Edit';
    msgEl.className = 'pd-msg';
    _clearDirty();
  }

  _loadState();
  renderSummary();

  if (toggleEl) {
    toggleEl.addEventListener('click', () => {
      const isOpen = fieldsEl.style.display !== 'none';
      if (!isOpen) {
        openForm();
      } else {
        if (_dirty) {
          msgEl.textContent = 'You have unsaved changes. Save or discard?';
          msgEl.className = 'pd-msg warn';
          let discardBtn = document.getElementById('pdDiscardBtn');
          if (!discardBtn) {
            discardBtn = document.createElement('button');
            discardBtn.id = 'pdDiscardBtn';
            discardBtn.type = 'button';
            discardBtn.style.cssText = 'margin-top:6px;width:100%;padding:6px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:7px;color:rgba(255,255,255,0.6);font-family:DM Sans,sans-serif;font-size:12px;cursor:pointer;';
            discardBtn.textContent = 'Discard changes and close';
            discardBtn.addEventListener('click', () => { discardBtn.remove(); _closeForm(); });
            msgEl.after(discardBtn);
          }
          return;
        }
        _closeForm();
      }
    });
  }

  // ── Save ─────────────────────────────────────────────────────────
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const school = schoolInput ? schoolInput.value.trim() : '';
      if (!school) { msgEl.textContent = 'Please enter your school name.'; msgEl.className = 'pd-msg err'; return; }
      if (!_activeCombos.size) { msgEl.textContent = 'Tick at least one subject to teach.'; msgEl.className = 'pd-msg err'; return; }

      // Every active combo must have at least one class
      const missing = [];
      _activeCombos.forEach(combo => {
        const [lv, sv] = combo.split('_');
        const key = _slKey(lv, sv);
        if (!Array.isArray(_slClasses[key]) || !_slClasses[key].length) {
          missing.push(`${_lvLabel(lv)} ${_svLabel(sv)}`);
          const group = myClassesEl.querySelector(`[data-key="${key}"]`);
          if (group) group.classList.add('missing');
        }
      });
      if (missing.length) {
        msgEl.textContent = `Add classes for: ${missing.join(', ')}`;
        msgEl.className = 'pd-msg err';
        myClassesEl.querySelector('.missing')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      // Build payload
      const teaching_combos = [..._activeCombos];
      // Derive subjects / levels arrays for pacing page compatibility
      const levelsSet   = new Set(), subjectsSet = new Set();
      teaching_combos.forEach(c => { const [lv,sv] = c.split('_'); levelsSet.add(lv); subjectsSet.add(sv); });
      const classFields = {};
      LEVELS.forEach(l => SUBJECTS.forEach(s => {
        const key = _slKey(l.value, s.value);
        classFields[key] = Array.isArray(_slClasses[key]) ? _slClasses[key] : [];
      }));

      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        await setDoc(doc(db, 'users', user.uid),
          { school, teaching_combos, subjects: [...subjectsSet], classes: [...levelsSet], ...classFields },
          { merge: true }
        );
        window.userProfile = { ...window.userProfile, school, teaching_combos, subjects: [...subjectsSet], classes: [...levelsSet], ...classFields };
        _loadState();
        renderSummary();
        _clearDirty();
        document.getElementById('pdDiscardBtn')?.remove();
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
  onSnapshot(collection(db, 'topics'),        (snap) => setBadge('msgBoardBadge',       snap.size));
}
