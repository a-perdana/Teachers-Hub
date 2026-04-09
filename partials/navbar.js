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
// db, setDoc, doc come from the page's Firestore imports via window.__firestoreHelpers.
function initTeachingProfile(db, setDoc, doc) {
  const profile = window.userProfile;
  const user    = window.currentUser;
  if (!profile || !user) return;

  const SUBJECTS = window.TEACHERS_SUBJECT_OPTIONS || [
    { value: 'math', label: 'Mathematics' }, { value: 'biology', label: 'Biology' },
    { value: 'chemistry', label: 'Chemistry' }, { value: 'physics', label: 'Physics' },
    { value: 'english', label: 'English' }, { value: 'science', label: 'Science' },
  ];
  const LEVELS = window.TEACHERS_CLASS_OPTIONS || [
    { value: 'checkpoint', label: 'Checkpoint' },
    { value: 'igcse',      label: 'IGCSE' },
    { value: 'asalevel',   label: 'AS & A Level' },
  ];

  const summaryEl   = document.getElementById('pdTeachingSummary');
  const fieldsEl    = document.getElementById('pdTeachingFields');
  const toggleEl    = document.getElementById('pdTeachingToggle');
  const schoolInput = document.getElementById('pdSchool');
  const subChips    = document.getElementById('pdSubjectChips');
  const lvlChips    = document.getElementById('pdClassChips');
  const saveBtn     = document.getElementById('pdTeachingBtn');
  const msgEl       = document.getElementById('pdTeachingMsg');
  if (!summaryEl || !fieldsEl) return;

  function renderSummary() {
    const p = window.userProfile;
    const school   = p.school   || '—';
    const subjects = (p.subjects || []).map(v => (SUBJECTS.find(s => s.value === v) || {}).label || v).join(', ') || '—';
    const levels   = (p.classes  || []).map(v => (LEVELS.find(l => l.value === v)   || {}).label || v).join(', ') || '—';
    summaryEl.innerHTML =
      `<span style="color:rgba(255,255,255,0.3)">School:</span> ${school}<br>` +
      `<span style="color:rgba(255,255,255,0.3)">Subjects:</span> ${subjects}<br>` +
      `<span style="color:rgba(255,255,255,0.3)">Levels:</span> ${levels}`;
  }

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
      btn.addEventListener('click', () => btn.classList.toggle('on'));
      lvlChips.appendChild(btn);
    });
    if (schoolInput) schoolInput.value = (p.school || '');
  }

  renderSummary();

  // Toggle edit/summary
  if (toggleEl) {
    toggleEl.addEventListener('click', () => {
      const open = fieldsEl.style.display === 'none';
      if (open) {
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

  // Save
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const school   = schoolInput ? schoolInput.value.trim() : '';
      const subjects = [...subChips.querySelectorAll('.pd-chip.on')].map(b => b.dataset.value);
      const levels   = [...lvlChips.querySelectorAll('.pd-chip.on')].map(b => b.dataset.value);
      if (!school)         { msgEl.textContent = 'Please enter your school name.'; msgEl.className = 'pd-msg err'; return; }
      if (!subjects.length){ msgEl.textContent = 'Select at least one subject.';  msgEl.className = 'pd-msg err'; return; }
      if (!levels.length)  { msgEl.textContent = 'Select at least one level.';    msgEl.className = 'pd-msg err'; return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        await setDoc(doc(db, 'users', user.uid), { school, subjects, classes: levels }, { merge: true });
        window.userProfile = { ...window.userProfile, school, subjects, classes: levels };
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
