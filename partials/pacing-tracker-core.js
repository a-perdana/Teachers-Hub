/**
 * pacing-tracker-core.js — shared JS module for all pacing tracker pages.
 *
 * Each tracker page sets window.TRACKER_CONFIG before importing this module:
 *   window.TRACKER_CONFIG = {
 *     collection:     'math_pacing',     // Firestore collection name
 *     docId:          'year9-10',        // document ID inside collection
 *     subjectKey:     'math',            // key in user.subjects[]
 *     label:          'Mathematics',     // display name
 *     code:           '0580',            // Cambridge code
 *     qualifier:      'Core & Extended',
 *     years:          'Year 9–10',
 *     curriculum:     'igcse',           // 'igcse' | 'checkpoint' | 'asalevel'
 *   };
 */
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc,
  onSnapshot, serverTimestamp, query, where,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const CFG = window.TRACKER_CONFIG;

// ── State ────────────────────────────────────────────────────
let db;
let currentUID, currentProfile;
let chapters = [];
let classList = [];
let allTeachers = [];
let progressByTeacher = {};  // uid → { classSections: { classKey: statusMap }, updatedAt }
let calSettings = null;

// Paging
const PAGE_SIZE = 8;
let progressPage = 0;
let hoursPage = 0;

// Tab state
let activeTab = 'overview';

// ── Init from authReady ──────────────────────────────────────
document.addEventListener('authReady', async ({ detail: { user, profile } }) => {
  db = window.db;
  currentUID = user.uid;
  currentProfile = profile;

  // Access check: subject_leader or teachers_admin
  const subRoles = profile.th_sub_roles || [];
  const isAdmin = profile.role_teachershub === 'teachers_admin';
  if (!isAdmin && !subRoles.includes('subject_leader')) {
    document.getElementById('loadingScreen').innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <h2 style="font-size:1.1rem;color:var(--ink);margin-bottom:8px">Access Restricted</h2>
        <p style="font-size:.82rem;color:var(--ink-2);line-height:1.6">
          This page is only available to <strong>Subject Leaders</strong> and <strong>Coordinators</strong>.<br>
          Contact your administrator if you believe this is an error.
        </p>
        <a href="index.html" style="display:inline-block;margin-top:16px;font-size:.78rem;color:var(--accent)">← Back to Dashboard</a>
      </div>`;
    return;
  }

  // Load calendar settings
  loadCalendarSettings(db);

  // Load navbar
  const nameShort = (user.displayName || user.email.split('@')[0]).split(' ')[0];
  fetch('/partials/navbar.html')
    .then(r => r.text())
    .then(html => {
      document.getElementById('navbar-container').innerHTML = html;
      if (typeof initNavbar === 'function') initNavbar();
      if (typeof setupNavBadges === 'function') {
        setupNavBadges(db, { onSnapshot, collection });
      }
      const nEl = document.getElementById('profileNameShort');
      const aEl = document.getElementById('profileAvatar');
      const wEl = document.getElementById('profileWrap');
      if (nEl) nEl.textContent = nameShort;
      if (aEl && typeof buildAvatarEl === 'function') buildAvatarEl(aEl, user);
      if (wEl) wEl.style.display = 'flex';
    });

  // Expose signOut
  import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ signOut }) => {
    window.authSignOut = () => signOut(window.auth).then(() => { window.location.href = 'login.html'; });
  });

  // Start loading data
  await loadStructure();
  await loadTeachersAndProgress();

  // Hide loading, show content
  const ls = document.getElementById('loadingScreen');
  if (ls) ls.style.display = 'none';
  const app = document.getElementById('appContent');
  if (app) app.style.display = '';

  renderAll();
});

// ── Calendar settings loader ─────────────────────────────────
async function loadCalendarSettings(database) {
  try {
    const snap = await getDoc(doc(database, 'calendar_settings', 'current'));
    if (snap.exists()) {
      calSettings = snap.data();
      window._trackerCalSettings = calSettings;
    }
  } catch (e) { console.warn('Could not load calendar settings:', e); }
}

// ── Load pacing structure ────────────────────────────────────
async function loadStructure() {
  try {
    const snap = await getDoc(doc(db, CFG.collection, CFG.docId));
    if (snap.exists()) {
      chapters = snap.data().chapters || [];
      classList = snap.data().classes || [];
    }
  } catch (e) {
    console.error('Error loading pacing structure:', e);
    showToast('Error loading pacing data');
  }
}

// ── Load teachers from same school with matching subject ─────
async function loadTeachersAndProgress() {
  const mySchool = currentProfile.school;
  if (!mySchool || !mySchool.trim()) {
    allTeachers = [];
    showToast('Your school is not set — cannot load teachers', 'warn');
    return;
  }

  // Fetch all teachers_user with matching school
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        where('role_teachershub', '==', 'teachers_user'),
        where('school', '==', mySchool.trim())
      )
    );

    allTeachers = [];
    snap.forEach(d => {
      const data = d.data();
      // Filter by subject
      const subjects = data.subjects || [];
      if (subjects.includes(CFG.subjectKey)) {
        allTeachers.push({ uid: d.id, ...data });
      }
    });

    // Also include teachers_admin from same school with matching subject
    const adminSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('role_teachershub', '==', 'teachers_admin'),
        where('school', '==', mySchool.trim())
      )
    );
    adminSnap.forEach(d => {
      const data = d.data();
      const subjects = data.subjects || [];
      if (subjects.includes(CFG.subjectKey)) {
        allTeachers.push({ uid: d.id, ...data });
      }
    });
  } catch (e) {
    console.error('Error fetching teachers:', e);
    showToast('Error loading teachers');
    return;
  }

  // Load userProgress for each teacher
  progressByTeacher = {};
  await Promise.all(allTeachers.map(async t => {
    try {
      const progSnap = await getDoc(doc(db, 'userProgress', t.uid));
      if (progSnap.exists()) {
        const d = progSnap.data();
        const classSections = {};
        Object.keys(d).forEach(key => {
          const m = key.match(/^statuses_(.+)$/);
          if (m) classSections[m[1].replace(/_/g, ' ')] = d[key];
        });
        if (d.statuses && !Object.keys(classSections).length) {
          classSections['—'] = d.statuses;
        }
        progressByTeacher[t.uid] = { classSections, updatedAt: d.updatedAt };
      } else {
        progressByTeacher[t.uid] = { classSections: {}, updatedAt: null };
      }
    } catch (e) {
      progressByTeacher[t.uid] = { classSections: {}, updatedAt: null };
    }
  }));
}

// ── Coordinator note save (writes to shared structure doc) ───
window.saveTrackerCoordNote = async function(chId, topicId) {
  const ta = document.getElementById(`coord-ta-${chId}-${topicId}`);
  if (!ta) return;
  const note = ta.value.trim();

  // Find and update in chapters
  const ch = chapters.find(c => c.id === chId);
  if (!ch) return;
  const topic = (ch.topics || []).find(t => t.id === topicId);
  if (!topic) return;
  topic.coordNote = note;

  // Write back to Firestore structure doc
  try {
    await setDoc(
      doc(db, CFG.collection, CFG.docId),
      { chapters, updatedAt: serverTimestamp() },
      { merge: true }
    );
    showToast(note ? 'Coordinator note saved' : 'Coordinator note cleared');
  } catch (e) {
    console.error('Error saving coordinator note:', e);
    showToast('Save failed — check connection', 'warn');
  }
};

window.clearTrackerCoordNote = function(chId, topicId) {
  const ta = document.getElementById(`coord-ta-${chId}-${topicId}`);
  if (ta) ta.value = '';
  window.saveTrackerCoordNote(chId, topicId);
};

// ── Diagnostic tag save (writes to teacher's userProgress) ───
window.setTrackerDiag = async function(teacherUid, chId, topicId, val) {
  const k = `${chId}.${topicId}`;
  const diagKey = `diag.${k}`;

  // Update local state
  const prog = progressByTeacher[teacherUid];
  if (!prog) return;
  Object.values(prog.classSections).forEach(statuses => {
    if (val) statuses[diagKey] = val;
    else delete statuses[diagKey];
  });

  // We need to save to the teacher's userProgress doc
  // Build the update from the first class section that has this topic
  for (const [clsKey, statuses] of Object.entries(prog.classSections)) {
    const progressKey = clsKey === '—' ? 'statuses'
      : `statuses_${clsKey.replace(/\s/g, '_')}`;
    try {
      await setDoc(
        doc(db, 'userProgress', teacherUid),
        { [progressKey]: statuses, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error('Error saving diagnostic tag:', e);
      showToast('Save failed', 'warn');
      return;
    }
  }

  // Close dropdown
  document.querySelectorAll('.tracker-diag-dropdown.open').forEach(el => el.classList.remove('open'));
  showToast(val ? 'Diagnostic tag set' : 'Tag cleared');
  renderAll();
};

// ── Tab switching ────────────────────────────────────────────
window.switchTrackerTab = function(tab, btn) {
  activeTab = tab;
  document.querySelectorAll('.tracker-tab-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  document.querySelectorAll('.tracker-panel').forEach(p => p.classList.remove('on'));
  const panel = document.getElementById(`panel-${tab}`);
  if (panel) panel.classList.add('on');
};

// ── Refresh ──────────────────────────────────────────────────
window.refreshTracker = async function() {
  const btn = document.getElementById('refreshBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  progressPage = 0;
  hoursPage = 0;
  await loadStructure();
  await loadTeachersAndProgress();
  renderAll();
  if (btn) { btn.disabled = false; btn.textContent = '↻ Refresh'; }
  showToast('Data refreshed');
};

// ── Main render ──────────────────────────────────────────────
function renderAll() {
  renderOverview();
  renderHeatmap();
  renderHoursReport();
}

// ── Helpers ──────────────────────────────────────────────────
function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

const DIAG_LABELS = { weak: '⚠ Weak', review: '↺ Review', good: '✓ Good' };

function weekInfo(weekNum) {
  if (!calSettings || !calSettings.academicYearStart || !weekNum) return null;
  const yearStart = new Date(calSettings.academicYearStart + 'T00:00:00');
  if (isNaN(yearStart)) return null;
  const MS_WEEK = 7 * 24 * 3600 * 1000;
  const monDate = new Date(yearStart.getTime() + (weekNum - 1) * MS_WEEK);
  const friDate = new Date(monDate.getTime() + 4 * 24 * 3600 * 1000);
  let termLabel = '';
  (calSettings.terms || []).forEach(term => {
    const ts = new Date(term.start + 'T00:00:00');
    const te = new Date(term.end + 'T00:00:00');
    if (!isNaN(ts) && !isNaN(te) && monDate >= ts && monDate <= te) termLabel = term.label || '';
  });
  return { monDate, friDate, termLabel };
}

function fmtShortDate(d) {
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
}

// ── Pager ────────────────────────────────────────────────────
function renderPager(containerId, currentPage, totalItems, goFnName) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  if (totalPages <= 1) { el.style.display = 'none'; return; }
  el.style.display = 'flex';

  const btns = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 2) {
      btns.push(`<button class="pager-btn ${i === currentPage ? 'on' : ''}" onclick="${goFnName}(${i})">${i + 1}</button>`);
    } else if (btns[btns.length - 1] !== '<span class="pager-dots">…</span>') {
      btns.push('<span class="pager-dots">…</span>');
    }
  }

  const start = currentPage * PAGE_SIZE + 1;
  const end = Math.min((currentPage + 1) * PAGE_SIZE, totalItems);
  el.innerHTML = `<span class="pager-info">${start}–${end} of ${totalItems}</span>` + btns.join('');
}

// ══════════════════════════════════════════════════════════════
// TAB 1: TEACHER OVERVIEW
// ══════════════════════════════════════════════════════════════
function renderOverview() {
  const listEl = document.getElementById('overviewList');
  const aggEl = document.getElementById('overviewAgg');
  if (!listEl) return;

  if (!allTeachers.length) {
    listEl.innerHTML = `<div class="tracker-empty">
      <p style="font-weight:500;color:var(--ink-2)">No teachers found</p>
      <p style="font-size:.75rem;color:var(--ink-3)">No teachers from your school (${escHtml(currentProfile.school)}) teach ${escHtml(CFG.label)} yet.</p>
    </div>`;
    if (aggEl) aggEl.innerHTML = '';
    return;
  }

  const totalTopics = chapters.reduce((n, ch) => n + (ch.topics || []).length, 0);

  // Build rows: one per teacher × class
  const rows = [];
  allTeachers.forEach(t => {
    const { classSections, updatedAt } = progressByTeacher[t.uid] || { classSections: {}, updatedAt: null };
    const keys = Object.keys(classSections);
    if (keys.length) {
      keys.forEach(cls => rows.push({ t, cls, statuses: classSections[cls], updatedAt }));
    } else {
      rows.push({ t, cls: null, statuses: {}, updatedAt: null, noData: true });
    }
  });

  // Aggregate stats
  let aggDone = 0, aggProg = 0, aggWeak = 0, aggPairs = 0;
  rows.forEach(({ statuses }) => {
    if (!statuses || !Object.keys(statuses).length) return;
    aggPairs++;
    chapters.forEach(ch => (ch.topics || []).forEach(topic => {
      const k = `${ch.id}.${topic.id}`;
      const s = statuses[k];
      if (s === 'done') aggDone++;
      else if (s === 'inprogress') aggProg++;
      if (statuses[`diag.${k}`] === 'weak') aggWeak++;
    }));
  });
  const avgPct = totalTopics && aggPairs
    ? Math.round(aggDone / (totalTopics * aggPairs) * 100) : 0;
  const teacherCount = new Set(rows.map(r => r.t.uid)).size;

  if (aggEl) {
    aggEl.innerHTML = `
      <div class="agg-stat blue"><div class="agg-num">${teacherCount}</div><div class="agg-label">Teachers</div></div>
      <div class="agg-stat"><div class="agg-num">${totalTopics}</div><div class="agg-label">Total Topics</div></div>
      <div class="agg-stat green"><div class="agg-num">${avgPct}%</div><div class="agg-label">Avg Completion</div></div>
      <div class="agg-stat"><div class="agg-num" style="color:var(--blue)">${aggProg}</div><div class="agg-label">In Progress</div></div>
      ${aggWeak > 0 ? `<div class="agg-stat red"><div class="agg-num">${aggWeak}</div><div class="agg-label">Weak-Flagged</div></div>` : ''}`;
  }

  // Build weak alerts
  renderWeakAlerts();

  // Group by teacher
  const teacherCards = [];
  const seen = new Map();
  rows.forEach(row => {
    if (!seen.has(row.t.uid)) { seen.set(row.t.uid, []); teacherCards.push({ t: row.t, rows: seen.get(row.t.uid) }); }
    seen.get(row.t.uid).push(row);
  });

  const pageCards = teacherCards.slice(progressPage * PAGE_SIZE, (progressPage + 1) * PAGE_SIZE);

  listEl.innerHTML = pageCards.map((card, ci) => {
    const { t, rows: classRows } = card;
    const ti = ci + progressPage * PAGE_SIZE;
    const ini = initials(t.displayName || t.email);
    const updatedAt = progressByTeacher[t.uid]?.updatedAt;
    const updLabel = updatedAt?.toDate
      ? updatedAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : '';
    const firstRow = classRows[0];
    const isNoData = firstRow?.noData;

    const classRowsHtml = isNoData
      ? `<div class="teacher-no-data">No progress data yet</div>`
      : classRows.map((row, ri) => {
          const { cls, statuses } = row;
          let done = 0, prog = 0, pending = 0, revisit = 0;
          chapters.forEach(ch => (ch.topics || []).forEach(topic => {
            const s = statuses[`${ch.id}.${topic.id}`];
            if (s === 'done') done++;
            else if (s === 'inprogress') prog++;
            else if (s === 'revisit') revisit++;
            else pending++;
          }));
          const pct = totalTopics ? Math.round(done / totalTopics * 100) : 0;
          const barColor = pct >= 75 ? 'var(--green)' : pct >= 40 ? 'var(--blue)' : 'var(--red)';
          const rowId = `tcr-${ti}-${ri}`;

          // Chapter detail (expandable)
          const chDetail = chapters.map((ch, chi) => {
            const chTopics = ch.topics || [];
            let chDone = 0;
            chTopics.forEach(topic => { if (statuses[`${ch.id}.${topic.id}`] === 'done') chDone++; });
            const chPct = chTopics.length ? Math.round(chDone / chTopics.length * 100) : 0;

            const topicRows = chTopics.map(topic => {
              const k = `${ch.id}.${topic.id}`;
              const s = statuses[k] || 'pending';
              const diag = statuses[`diag.${k}`] || '';
              const actualHour = statuses[`actual.${k}`];
              const coordNote = topic.coordNote || '';
              return `<div class="detail-topic">
                <div class="detail-status ${s}"></div>
                <div class="detail-topic-name">${escHtml(topic.topic)}</div>
                <div class="detail-meta">
                  ${topic.duration || topic.hour ? `<span class="detail-hours">${topic.duration || topic.hour}h</span>` : ''}
                  ${actualHour != null ? `<span class="detail-actual">${actualHour}h actual</span>` : ''}
                  ${diag ? `<span class="detail-diag ${diag}">${DIAG_LABELS[diag] || diag}</span>` : ''}
                  ${coordNote ? `<span class="detail-coord" title="${escHtml(coordNote)}">📋</span>` : ''}
                </div>
              </div>`;
            }).join('');

            return `<div class="detail-chapter">
              <div class="detail-ch-head" onclick="this.nextElementSibling.classList.toggle('open')">
                <span class="detail-ch-name">Ch ${chi + 1} — ${escHtml(ch.chapter)}</span>
                <span class="detail-ch-pct">${chDone}/${chTopics.length} (${chPct}%)</span>
                <span class="detail-ch-caret">▸</span>
              </div>
              <div class="detail-ch-body">${topicRows}</div>
            </div>`;
          }).join('');

          return `
            <div class="teacher-class-row" id="${rowId}">
              <div class="class-row-header" onclick="document.getElementById('${rowId}-detail').classList.toggle('open');this.classList.toggle('expanded')">
                <span class="class-badge">${escHtml(cls || '—')}</span>
                <div class="class-stats">
                  <span class="cs done">${done} done</span>
                  <span class="cs prog">${prog} in prog</span>
                  <span class="cs pend">${pending} pending</span>
                  ${revisit ? `<span class="cs rev">${revisit} revisit</span>` : ''}
                </div>
                <div class="class-prog">
                  <div class="class-prog-bar"><div class="class-prog-fill" style="width:${pct}%;background:${barColor}"></div></div>
                  <span class="class-prog-pct" style="color:${barColor}">${pct}%</span>
                </div>
                <span class="class-expand-icon">▸</span>
              </div>
              <div class="class-detail" id="${rowId}-detail">${chDetail}</div>
            </div>`;
        }).join('');

    return `<div class="teacher-card">
      <div class="teacher-card-head">
        <div class="teacher-avatar">${ini}</div>
        <div class="teacher-info">
          <div class="teacher-name">${escHtml(t.displayName || t.email)}</div>
          <div class="teacher-email">${escHtml(t.email)}${updLabel ? ` · Last update: ${updLabel}` : ''}</div>
        </div>
      </div>
      ${classRowsHtml}
    </div>`;
  }).join('');

  renderPager('overviewPager', progressPage, teacherCards.length, 'goOverviewPage');
}

window.goOverviewPage = function(p) {
  progressPage = p;
  renderOverview();
};

// ── Weak Alerts ──────────────────────────────────────────────
let _weakOpen = false;
function renderWeakAlerts() {
  const panel = document.getElementById('weakAlertPanel');
  const body = document.getElementById('weakAlertBody');
  if (!panel || !body) return;

  const weakMap = {};
  allTeachers.forEach(t => {
    const { classSections } = progressByTeacher[t.uid] || { classSections: {} };
    Object.values(classSections).forEach(statuses => {
      chapters.forEach(ch => (ch.topics || []).forEach(topic => {
        const k = `${ch.id}.${topic.id}`;
        if (statuses[`diag.${k}`] === 'weak') {
          if (!weakMap[k]) weakMap[k] = { topic: topic.topic, chapter: ch.chapter, teachers: [] };
          const name = t.displayName || t.email;
          if (!weakMap[k].teachers.includes(name)) weakMap[k].teachers.push(name);
        }
      }));
    });
  });

  const entries = Object.values(weakMap);
  if (!entries.length) { panel.style.display = 'none'; return; }
  panel.style.display = '';

  const countEl = document.getElementById('weakAlertCount');
  if (countEl) countEl.textContent = `${entries.length} topic${entries.length !== 1 ? 's' : ''} flagged weak`;

  body.innerHTML = entries.map(e => `
    <div class="weak-row">
      <div class="weak-topic">${escHtml(e.topic)} <span class="weak-ch">— ${escHtml(e.chapter)}</span></div>
      <div class="weak-teachers">${e.teachers.map(n => `<span class="weak-chip">${escHtml(n)}</span>`).join('')}</div>
    </div>`).join('');
  body.style.display = _weakOpen ? '' : 'none';
}

window.toggleWeakPanel = function() {
  _weakOpen = !_weakOpen;
  const body = document.getElementById('weakAlertBody');
  const toggle = document.getElementById('weakAlertToggle');
  if (body) body.style.display = _weakOpen ? '' : 'none';
  if (toggle) toggle.textContent = _weakOpen ? '▾ Hide' : '▸ Show';
};

// ══════════════════════════════════════════════════════════════
// TAB 2: TOPIC HEATMAP
// ══════════════════════════════════════════════════════════════
function renderHeatmap() {
  const el = document.getElementById('heatmapGrid');
  if (!el) return;

  if (!allTeachers.length || !chapters.length) {
    el.innerHTML = '<div class="tracker-empty"><p>No data available yet.</p></div>';
    return;
  }

  // Collect class → statuses from all teachers
  const progressByClass = {};
  const teacherByClass = {};
  allTeachers.forEach(t => {
    const { classSections } = progressByTeacher[t.uid] || { classSections: {} };
    Object.entries(classSections).forEach(([cls, statuses]) => {
      const key = cls.replace(/\s/g, '_');
      if (!progressByClass[key] || Object.keys(statuses).length > Object.keys(progressByClass[key]).length) {
        progressByClass[key] = statuses;
        teacherByClass[key] = t;
      }
    });
  });

  const activeCols = Object.keys(progressByClass).sort();
  if (!activeCols.length) {
    el.innerHTML = '<div class="tracker-empty"><p>No class progress data yet. Teachers need to save progress.</p></div>';
    return;
  }

  function heatColor(pct) {
    if (pct === 0)  return { bg: '#f1f5f9', fg: '#94a3b8' };
    if (pct < 25)   return { bg: '#fecaca', fg: '#7f1d1d' };
    if (pct < 50)   return { bg: '#fca5a5', fg: '#7f1d1d' };
    if (pct < 75)   return { bg: '#60a5fa', fg: '#1e3a8a' };
    if (pct < 90)   return { bg: '#34d399', fg: '#064e3b' };
    return            { bg: '#059669', fg: '#fff' };
  }

  const accentPalette = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

  const headerCells = activeCols.map((cls, ci) => {
    const label = cls.replace(/_/g, ' ');
    const teacher = teacherByClass[cls];
    const name = teacher?.displayName || null;
    const accent = accentPalette[ci % accentPalette.length];
    return `<th class="hm-col-head">
      <div class="hm-col-card">
        <div class="hm-col-class">${escHtml(label)}</div>
        <div class="hm-col-divider" style="background:${accent}"></div>
        <div class="hm-col-avatar" style="background:${accent}">${escHtml(initials(name || label))}</div>
        ${name ? `<div class="hm-col-name">${escHtml(name)}</div>` : ''}
      </div>
    </th>`;
  }).join('');

  const bodyRows = chapters.map((ch, ci) => {
    const chTopics = ch.topics || [];
    const cells = activeCols.map(cls => {
      const statuses = progressByClass[cls] || {};
      const done = chTopics.filter(tp => statuses[`${ch.id}.${tp.id}`] === 'done').length;
      const pct = chTopics.length ? Math.round(done / chTopics.length * 100) : 0;
      const { bg, fg } = heatColor(pct);
      return `<td><div class="hm-cell" style="background:${bg};color:${fg}" title="${cls.replace(/_/g,' ')}: ${done}/${chTopics.length} done">${pct ? pct + '%' : '—'}</div></td>`;
    }).join('');
    return `<tr>
      <td class="hm-ch-label">${ci + 1}. ${escHtml(ch.chapter)}</td>
      ${cells}
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="hm-legend">
      <div class="hm-legend-item"><div class="hm-swatch" style="background:#f1f5f9;border:1px solid #e2e8f0"></div>0%</div>
      <div class="hm-legend-item"><div class="hm-swatch" style="background:#fecaca"></div>&lt;25%</div>
      <div class="hm-legend-item"><div class="hm-swatch" style="background:#fca5a5"></div>25–49%</div>
      <div class="hm-legend-item"><div class="hm-swatch" style="background:#60a5fa"></div>50–74%</div>
      <div class="hm-legend-item"><div class="hm-swatch" style="background:#34d399"></div>75–89%</div>
      <div class="hm-legend-item"><div class="hm-swatch" style="background:#059669"></div>≥90%</div>
    </div>
    <div class="hm-table-wrap">
      <table class="hm-table">
        <thead><tr><th class="hm-ch-label"></th>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// TAB 3: HOURS REPORT
// ══════════════════════════════════════════════════════════════
const _hoursExpanded = new Set();

window.toggleHoursDrilldown = function(uid) {
  if (_hoursExpanded.has(uid)) _hoursExpanded.delete(uid);
  else _hoursExpanded.add(uid);
  renderHoursReport();
};

function _mergedStatuses(uid) {
  const { classSections = {} } = progressByTeacher[uid] || {};
  const merged = {};
  Object.values(classSections).forEach(s => {
    Object.entries(s).forEach(([k, v]) => {
      if (k.startsWith('actual.')) {
        merged[k] = (merged[k] || 0) + (parseFloat(v) || 0);
      } else if (!merged[k]) {
        merged[k] = v;
      }
    });
  });
  return merged;
}

function renderHoursReport() {
  const content = document.getElementById('hoursContent');
  const aggEl = document.getElementById('hoursAgg');
  if (!content) return;

  const totalPlanned = chapters.reduce((s, ch) =>
    s + (ch.topics || []).reduce((ts, t) => ts + (+(t.duration ?? t.hour) || 0), 0), 0);

  let grandActual = 0;
  allTeachers.forEach(t => {
    const st = _mergedStatuses(t.uid);
    chapters.forEach(ch => (ch.topics || []).forEach(topic => {
      grandActual += parseFloat(st[`actual.${ch.id}.${topic.id}`]) || 0;
    }));
  });
  grandActual = Math.round(grandActual * 10) / 10;

  const pageTeachers = allTeachers.slice(hoursPage * PAGE_SIZE, (hoursPage + 1) * PAGE_SIZE);

  if (!allTeachers.length) {
    content.innerHTML = '<div class="tracker-empty"><p>No teachers with hours data.</p></div>';
    if (aggEl) aggEl.innerHTML = '';
    return;
  }

  const rows = pageTeachers.map(t => {
    const st = _mergedStatuses(t.uid);
    let actual = 0;
    chapters.forEach(ch => (ch.topics || []).forEach(topic => {
      actual += parseFloat(st[`actual.${ch.id}.${topic.id}`]) || 0;
    }));
    actual = Math.round(actual * 10) / 10;

    const diff = Math.round((actual - totalPlanned) * 10) / 10;
    const pillCls = actual === 0 ? '' : diff > 2 ? 'hours-over' : diff < -2 ? 'hours-under' : 'hours-match';
    const label = actual === 0 ? '—' : diff === 0 ? '✓ On track' : diff > 0 ? `+${diff}h over` : `${Math.abs(diff)}h under`;
    const barPct = totalPlanned ? Math.min(100, Math.round(actual / totalPlanned * 100)) : 0;
    const barColor = barPct >= 100 ? 'var(--red)' : barPct >= 80 ? 'var(--green)' : 'var(--blue)';
    const ini = initials(t.displayName || t.email);
    const expanded = _hoursExpanded.has(t.uid);

    let drillHtml = '';
    if (expanded) {
      const chRows = chapters.map(ch => {
        const planned = (ch.topics || []).reduce((s, tp) => s + (+(tp.duration ?? tp.hour) || 0), 0);
        let logged = 0;
        (ch.topics || []).forEach(tp => { logged += parseFloat(st[`actual.${ch.id}.${tp.id}`]) || 0; });
        logged = Math.round(logged * 10) / 10;

        const topicRows = (ch.topics || []).map(tp => {
          const tPlan = +(tp.duration ?? tp.hour) || 0;
          const tLog = Math.round((parseFloat(st[`actual.${ch.id}.${tp.id}`]) || 0) * 10) / 10;
          if (!tPlan && !tLog) return '';
          const tDiff = Math.round((tLog - tPlan) * 10) / 10;
          const tColor = tLog === 0 ? 'var(--ink-3)' : tDiff > 1 ? 'var(--red)' : tDiff < -1 ? 'var(--amber)' : 'var(--green)';
          return `<tr class="drill-topic">
            <td class="drill-topic-name">${escHtml(tp.topic)}</td>
            <td class="drill-mono">${tPlan ? tPlan + 'h' : '—'}</td>
            <td class="drill-mono" style="font-weight:${tLog ? 600 : 400}">${tLog ? tLog + 'h' : '—'}</td>
            <td style="color:${tColor}">${tLog > 0 ? (tDiff >= 0 ? '+' + tDiff : tDiff) + 'h' : ''}</td>
          </tr>`;
        }).join('');

        const chDiff = Math.round((logged - planned) * 10) / 10;
        return `<tr class="drill-ch">
          <td>${escHtml(ch.chapter)}</td>
          <td class="drill-mono">${planned ? planned + 'h' : '—'}</td>
          <td class="drill-mono" style="font-weight:600">${logged ? logged + 'h' : '—'}</td>
          <td>${logged > 0 ? (chDiff >= 0 ? '+' + chDiff : chDiff) + 'h' : ''}</td>
        </tr>${topicRows}`;
      }).join('');

      drillHtml = `<tr><td colspan="4" class="drill-wrap">
        <table class="drill-table">
          <thead><tr>
            <th>Chapter / Topic</th><th>Planned</th><th>Logged</th><th>Diff</th>
          </tr></thead>
          <tbody>${chRows}</tbody>
        </table>
      </td></tr>`;
    }

    return `<tr class="hours-row" onclick="toggleHoursDrilldown('${escHtml(t.uid)}')" title="Click to ${expanded ? 'collapse' : 'expand'}">
      <td>
        <div class="hours-teacher">
          <span class="drill-caret">${expanded ? '▾' : '▸'}</span>
          <div class="teacher-avatar sm">${ini}</div>
          <div>
            <div class="hours-teacher-name">${escHtml(t.displayName || t.email)}</div>
            <div class="hours-teacher-email">${escHtml(t.email)}</div>
          </div>
        </div>
      </td>
      <td class="hours-mono">${totalPlanned}h</td>
      <td class="hours-mono" style="font-weight:${actual > 0 ? 700 : 400};color:${actual > 0 ? 'var(--ink)' : 'var(--ink-3)'}">${actual > 0 ? actual + 'h' : '—'}</td>
      <td>
        ${actual > 0 ? `<div class="hours-status">
          <span class="hours-pill ${pillCls}">${label}</span>
          <div class="hours-bar-wrap">
            <div class="hours-bar"><div class="hours-bar-fill" style="width:${barPct}%;background:${barColor}"></div></div>
            <span class="hours-bar-pct">${barPct}%</span>
          </div>
        </div>` : '<span style="font-size:.75rem;color:var(--ink-3)">No hours logged</span>'}
      </td>
    </tr>${drillHtml}`;
  }).join('');

  content.innerHTML = `<table class="hours-table">
    <thead><tr>
      <th style="width:35%">Teacher</th>
      <th>Planned</th>
      <th>Logged</th>
      <th>Status</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  renderPager('hoursPager', hoursPage, allTeachers.length, 'goHoursPage');

  // Agg banner
  if (aggEl) {
    const diffTotal = Math.round((grandActual - totalPlanned) * 10) / 10;
    aggEl.innerHTML = `
      <div class="agg-stat blue"><div class="agg-num">${allTeachers.length}</div><div class="agg-label">Teachers</div></div>
      <div class="agg-stat"><div class="agg-num">${totalPlanned}h</div><div class="agg-label">Total Planned</div></div>
      <div class="agg-stat green"><div class="agg-num">${grandActual > 0 ? grandActual + 'h' : '—'}</div><div class="agg-label">Total Logged</div></div>
      <div class="agg-stat"><div class="agg-num" style="color:${diffTotal > 2 ? 'var(--red)' : diffTotal < -2 ? 'var(--amber)' : 'var(--green)'}">${grandActual > 0 ? (diffTotal >= 0 ? '+' : '') + diffTotal + 'h' : '—'}</div><div class="agg-label">Difference</div></div>`;
  }
}

window.goHoursPage = function(p) {
  hoursPage = p;
  renderHoursReport();
};

// ── Toast ────────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('warn');
  if (type) t.classList.add(type);
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.classList.remove('show', 'warn'); }, 2200);
}
