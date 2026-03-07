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
