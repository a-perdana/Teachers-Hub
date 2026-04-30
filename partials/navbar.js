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

  // Sign out — host page sets window.authSignOut = () => signOut(auth)
  const pdSignOut = document.getElementById('pdSignOut');
  if (pdSignOut) {
    pdSignOut.addEventListener('click', function () {
      if (typeof window.authSignOut === 'function') window.authSignOut();
    });
  }

  // Dropdown menus
  function initThDropdowns() {
    const activeKey = window.__thNavActiveKey || '';
    const groupKeys = {
      pacing: ['igcse-math','igcse-biology','igcse-chemistry','igcse-physics',
                'as-alevel-math','as-alevel-biology','as-alevel-chemistry','as-alevel-physics',
                'checkpoint-math','checkpoint-english','checkpoint-science',
                'igcse-math-tracker','igcse-biology-tracker','igcse-chemistry-tracker','igcse-physics-tracker',
                'checkpoint-math-tracker','checkpoint-english-tracker','checkpoint-science-tracker',
                'as-alevel-math-tracker','as-alevel-biology-tracker','as-alevel-chemistry-tracker','as-alevel-physics-tracker'],
      mywork: ['weekly-checklist','teacher-self-assessment','teacher-kpi-results',
               'teacher-appraisal-results','teacher-self-appraisal',
               'competency-framework','learning-path','my-portfolio','my-certificates'],
      hub:    ['announcements','messageboard','library','cambridge-calendar','surveys'],
    };

    document.querySelectorAll('.th-dd-wrap').forEach(function(wrap) {
      const trigger = wrap.querySelector('.th-dd-trigger');
      const panel   = wrap.querySelector('.th-dd-panel');
      if (!trigger || !panel) return;
      const dd = trigger.dataset.dd;

      if (dd && groupKeys[dd] && groupKeys[dd].includes(activeKey)) {
        trigger.classList.add('active');
      }

      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = wrap.classList.contains('open');
        document.querySelectorAll('.th-dd-wrap.open').forEach(function(w) {
          if (w !== wrap) w.classList.remove('open');
        });
        wrap.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));

        if (!isOpen) {
          // Reset first so getBoundingClientRect reflects natural position
          panel.style.left = '';
          panel.style.right = '';
          panel.style.maxWidth = '';
          requestAnimationFrame(function() {
            const nav = document.getElementById('nav');
            const navRect = nav ? nav.getBoundingClientRect() : { left: 0, right: window.innerWidth };
            const triggerRect = trigger.getBoundingClientRect();
            const panelW = panel.offsetWidth;
            const vw = window.innerWidth;
            // Try anchoring to trigger left; if it overflows right, shift left
            let left = 0; // relative to wrap (trigger)
            const absLeft = triggerRect.left + left;
            const absRight = absLeft + panelW;
            if (absRight > vw - 8) {
              // Shift so right edge aligns with nav right edge
              const shift = absRight - (navRect.right - 8);
              left = Math.max(-triggerRect.left + navRect.left, -shift);
              panel.style.left = left + 'px';
              panel.style.right = 'auto';
            } else {
              panel.style.left = '0';
              panel.style.right = 'auto';
            }
          });
        }
      });

      // Mark active item inside panel
      if (activeKey) {
        panel.querySelectorAll('[data-nav-key]').forEach(function(a) {
          if (a.dataset.navKey === activeKey) a.classList.add('active');
        });
      }
    });

    document.addEventListener('click', function() {
      document.querySelectorAll('.th-dd-wrap.open').forEach(function(w) { w.classList.remove('open'); });
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') document.querySelectorAll('.th-dd-wrap.open').forEach(function(w) { w.classList.remove('open'); });
    });
  }
  initThDropdowns();

  // Scroll effect
  window.addEventListener('scroll', function () {
    const nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Populate dropdown header + avatar + name + email.
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

    // Nav avatar + short name
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

    // Progress ring on avatar
    _renderProgressRing(profile);

    // Teaching summary (read-only)
    _renderTeachingSummary(profile);
    const teachingSection = document.getElementById('pdTeachingSection');
    if (teachingSection) teachingSection.style.display = '';
  }

  // ── Profile completeness score ────────────────────────────────
  function _calcProgress(p) {
    let score = 0;
    if (p.school?.trim())                                              score += 20;
    if (Array.isArray(p.teaching_combos) && p.teaching_combos.length) score += 20;
    if (p.displayName?.trim())                                         score += 15;
    if (p.bio?.trim())                                                 score += 15;
    if (p.department?.trim())                                          score += 10;
    if (p.phone?.trim())                                               score += 10;
    if (Array.isArray(p.th_sub_roles) && p.th_sub_roles.length)       score += 10;
    return score;
  }

  function _renderProgressRing(p) {
    const ring = document.getElementById('profileProgressRing');
    const fill = document.getElementById('profileProgressFill');
    if (!ring || !fill) return;
    const pct = _calcProgress(p);
    if (pct >= 100) { ring.style.display = 'none'; return; }
    ring.style.display = '';
    const circumference = 94.25; // 2π × r=15
    const offset = circumference - (pct / 100) * circumference;
    fill.style.strokeDashoffset = offset;
    // Colour: <50 amber, <80 blue, ≥80 purple
    fill.style.stroke = pct < 50 ? '#f59e0b' : pct < 80 ? '#38bdf8' : '#6c5ce7';
  }

  // ── Teaching summary (read-only, shown in dropdown) ───────────
  function _renderTeachingSummary(p) {
    const summaryEl = document.getElementById('pdTeachingSummary');
    if (!summaryEl) return;

    const SUBJECTS_ALL = [
      { value: 'math', label: 'Mathematics' }, { value: 'biology', label: 'Biology' },
      { value: 'chemistry', label: 'Chemistry' }, { value: 'physics', label: 'Physics' },
      { value: 'english', label: 'English' }, { value: 'science', label: 'Science' },
      { value: 'religion', label: 'Religion' },
    ];
    const LEVELS_ALL = [
      { value: 'checkpoint', label: 'Checkpoint' },
      { value: 'igcse',      label: 'IGCSE' },
      { value: 'asalevel',   label: 'AS/A-Level' },
    ];
    function _svLabel(sv) {
      return (SUBJECTS_ALL.find(s => s.value === sv) || {}).label || sv;
    }
    function _lvLabel(lv) {
      return (LEVELS_ALL.find(l => l.value === lv) || {}).label || lv;
    }

    const school = p.school || '—';
    const combos = Array.isArray(p.teaching_combos) ? p.teaching_combos : [];

    if (!combos.length) {
      summaryEl.innerHTML =
        `<span style="color:rgba(255,255,255,0.3)">School:</span> ${school}<br>` +
        `<span style="color:rgba(255,255,255,0.3)">Teaching:</span> <span style="color:#fbbf24">Not set up yet</span>`;
      return;
    }

    const lines = combos.map(combo => {
      const [lv, sv] = combo.split('_');
      const key = `${lv}_${sv}_classes`;
      const cls = (Array.isArray(p[key]) ? p[key] : []).join(', ') || '—';
      return `<span style="color:rgba(255,255,255,0.3)">${_lvLabel(lv)} ${_svLabel(sv)}:</span> ${cls}`;
    });

    summaryEl.innerHTML =
      `<span style="color:rgba(255,255,255,0.3)">School:</span> ${school}<br>` +
      lines.join('<br>');
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
