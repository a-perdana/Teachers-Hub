#!/usr/bin/env python3
"""
migrate_pacing.py
Migrates 5 new features from checkpoint-math-pacing.html to 10 other pacing pages.
"""

import re
import os

BASE = os.path.dirname(os.path.abspath(__file__))

# ── Per-file configuration ──────────────────────────────────────────────────

LABEL_MAP = {
    'math_pacing':            'Mathematics',
    'biology_pacing':          'Biology',
    'chemistry_pacing':        'Chemistry',
    'physics_pacing':          'Physics',
    'checkpoint_math_pacing':  'Mathematics',
    'checkpoint_english_pacing': 'English',
    'checkpoint_science_pacing': 'Science',
    'asalevel_math_pacing':    'Mathematics',
    'asalevel_biology_pacing': 'Biology',
    'asalevel_chemistry_pacing': 'Chemistry',
    'asalevel_physics_pacing': 'Physics',
}

# Short subject key → colour (for cross-chip dots and wt-dot classes)
SUBJ_COLOR_MAP = {
    'mathematics': 'var(--accent)',
    'biology':     '#1a5fa8',
    'chemistry':   '#6c3fa0',
    'physics':     '#1e7a4a',
    'english':     '#6c3fa0',
    'science':     '#1a5fa8',
}

FILE_CONFIGS = {
    'checkpoint-english-pacing.html': {
        'col':          'checkpoint_english_pacing',
        'doc':          'year7-8',
        'statuses_key': 'checkpoint_english_statuses',
        'cross': [
            ('checkpoint_math_pacing',    'Mathematics',  'math',    'var(--accent)'),
            ('checkpoint_science_pacing', 'Science',      'science', '#1a5fa8'),
        ],
        'own_subj_key': 'english',
        'own_label':    'English',
    },
    'checkpoint-science-pacing.html': {
        'col':          'checkpoint_science_pacing',
        'doc':          'year7-8',
        'statuses_key': 'checkpoint_science_statuses',
        'cross': [
            ('checkpoint_math_pacing',    'Mathematics', 'math',    'var(--accent)'),
            ('checkpoint_english_pacing', 'English',     'english', '#6c3fa0'),
        ],
        'own_subj_key': 'science',
        'own_label':    'Science',
    },
    'igcse-math-pacing.html': {
        'col':          'math_pacing',
        'doc':          'year9-10',
        'statuses_key': 'statuses',
        'cross': [
            ('biology_pacing',   'Biology',   'biology',   '#1a5fa8'),
            ('chemistry_pacing', 'Chemistry', 'chemistry', '#6c3fa0'),
        ],
        'own_subj_key': 'math',
        'own_label':    'Mathematics',
    },
    'igcse-biology-pacing.html': {
        'col':          'biology_pacing',
        'doc':          'year9-10',
        'statuses_key': 'bio_statuses',
        'cross': [
            ('math_pacing',     'Mathematics', 'math',      'var(--accent)'),
            ('chemistry_pacing', 'Chemistry',   'chemistry', '#6c3fa0'),
        ],
        'own_subj_key': 'biology',
        'own_label':    'Biology',
    },
    'igcse-chemistry-pacing.html': {
        'col':          'chemistry_pacing',
        'doc':          'year9-10',
        'statuses_key': 'chem_statuses',
        'cross': [
            ('math_pacing',   'Mathematics', 'math',    'var(--accent)'),
            ('biology_pacing', 'Biology',     'biology', '#1a5fa8'),
        ],
        'own_subj_key': 'chemistry',
        'own_label':    'Chemistry',
    },
    'igcse-physics-pacing.html': {
        'col':          'physics_pacing',
        'doc':          'year9-10',
        'statuses_key': 'phys_statuses',
        'cross': [
            ('math_pacing',   'Mathematics', 'math',    'var(--accent)'),
            ('biology_pacing', 'Biology',     'biology', '#1a5fa8'),
        ],
        'own_subj_key': 'physics',
        'own_label':    'Physics',
    },
    'asalevel-math-pacing.html': {
        'col':          'asalevel_math_pacing',
        'doc':          'year11-12',
        'statuses_key': 'asmath_statuses',
        'cross': [
            ('asalevel_biology_pacing',   'Biology',   'biology',   '#1a5fa8'),
            ('asalevel_chemistry_pacing', 'Chemistry', 'chemistry', '#6c3fa0'),
        ],
        'own_subj_key': 'math',
        'own_label':    'Mathematics',
    },
    'asalevel-biology-pacing.html': {
        'col':          'asalevel_biology_pacing',
        'doc':          'year11-12',
        'statuses_key': 'asbio_statuses',
        'cross': [
            ('asalevel_math_pacing',      'Mathematics', 'math',      'var(--accent)'),
            ('asalevel_chemistry_pacing', 'Chemistry',   'chemistry', '#6c3fa0'),
        ],
        'own_subj_key': 'biology',
        'own_label':    'Biology',
    },
    'asalevel-chemistry-pacing.html': {
        'col':          'asalevel_chemistry_pacing',
        'doc':          'year11-12',
        'statuses_key': 'aschem_statuses',
        'cross': [
            ('asalevel_math_pacing',     'Mathematics', 'math',    'var(--accent)'),
            ('asalevel_biology_pacing',  'Biology',     'biology', '#1a5fa8'),
        ],
        'own_subj_key': 'chemistry',
        'own_label':    'Chemistry',
    },
    'asalevel-physics-pacing.html': {
        'col':          'asalevel_physics_pacing',
        'doc':          'year11-12',
        'statuses_key': 'asphys_statuses',
        'cross': [
            ('asalevel_math_pacing',    'Mathematics', 'math',    'var(--accent)'),
            ('asalevel_biology_pacing', 'Biology',     'biology', '#1a5fa8'),
        ],
        'own_subj_key': 'physics',
        'own_label':    'Physics',
    },
}

# ── CSS blocks extracted from checkpoint-math-pacing.html ───────────────────

CSS_TEACHER_NOTES = """
/* ─── TEACHER NOTES ─────────────────────────── */
.note-btn {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: .62rem; font-weight: 500;
  padding: 2px 7px; border-radius: 4px;
  border: 1px solid var(--border); background: var(--paper);
  color: var(--ink-3); cursor: pointer; transition: all .12s;
  flex-shrink: 0;
}
.note-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-2); }
.note-btn.has-note { background: #fff8e6; border-color: #f0dea0; color: #b45309; }

.note-panel {
  display: none;
  padding: 8px 12px 10px;
  background: #fffef5;
  border-top: 1px solid #f0dea0;
  border-bottom: 1px dashed #f0dea0;
}
.note-panel.open { display: block; }
.note-textarea {
  width: 100%; min-height: 68px; resize: vertical;
  font-family: 'DM Sans', sans-serif; font-size: .78rem;
  line-height: 1.55; color: var(--ink);
  border: 1px solid #f0dea0; border-radius: 6px;
  padding: 7px 9px; background: white; outline: none;
  transition: border-color .12s;
}
.note-textarea:focus { border-color: var(--amber, #d97706); }
.note-actions { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
.note-save-btn {
  font-family: 'DM Sans', sans-serif; font-size: .7rem;
  padding: 4px 12px; border-radius: 5px;
  background: var(--accent); color: white; border: none; cursor: pointer;
}
.note-save-btn:hover { background: #a93224; }
.note-discard-btn {
  font-family: 'DM Sans', sans-serif; font-size: .7rem;
  padding: 4px 9px; border-radius: 5px;
  background: none; border: 1px solid var(--border); color: var(--ink-3); cursor: pointer;
}
.note-discard-btn:hover { border-color: var(--ink-2); color: var(--ink); }
.note-preview {
  font-size: .72rem; color: #92400e;
  line-height: 1.4; margin-top: 4px;
  font-style: italic; white-space: pre-wrap;
  max-height: 48px; overflow: hidden;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}
"""

CSS_PACE_ALERT = """
/* ─── PACE ALERT BADGES ─────────────────────── */
.pace-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: .6rem; font-weight: 700; letter-spacing: .03em;
  padding: 2px 7px; border-radius: 100px; white-space: nowrap;
  flex-shrink: 0;
}
.pace-badge.overdue  { background: #fff0f0; color: #c0392b; border: 1px solid #f5c6c1; }
.pace-badge.behind   { background: #fff8e6; color: #b45309; border: 1px solid #f0dea0; }
.pace-badge.on-track { background: var(--green-2); color: var(--green); border: 1px solid #b6e4c8; }
.pace-badge.upcoming { background: var(--blue-2); color: var(--blue); border: 1px solid #c2d8f5; }

/* Topbar pace summary pill */
.pace-summary-pill {
  display: flex; align-items: center; gap: 6px;
  font-size: .7rem; font-weight: 600;
  padding: 4px 10px; border-radius: 100px;
  background: #fff8e6; color: #b45309;
  border: 1px solid #f0dea0;
  cursor: default; white-space: nowrap;
}
.pace-summary-pill.ok { background: var(--green-2); color: var(--green); border-color: #b6e4c8; }
.pace-summary-pill.danger { background: #fff0f0; color: #c0392b; border-color: #f5c6c1; }
"""

CSS_CLASS_SELECTOR = """
/* ─── CLASS SELECTOR ────────────────────────── */
.class-selector-wrap {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
}
.class-selector-label {
  font-size: .68rem; font-weight: 700; color: var(--ink-3); white-space: nowrap;
}
.class-select {
  font-family: 'DM Sans', sans-serif; font-size: .75rem;
  padding: 5px 10px; border-radius: 7px;
  border: 1px solid var(--border); background: white; color: var(--ink);
  cursor: pointer; outline: none; transition: border-color .15s;
  max-width: 160px;
}
.class-select:focus { border-color: var(--accent); }
.class-manage-btn {
  background: none; border: 1px solid var(--border); border-radius: 6px;
  padding: 4px 8px; cursor: pointer; color: var(--ink-3);
  font-size: .82rem; transition: all .12s;
}
.class-manage-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-2); }
"""

CSS_COVERAGE_PANEL = """
/* ─── OBJECTIVE COVERAGE PANEL ─────────────── */
#panel-coverage { padding: 20px 24px; }

.coverage-summary {
  display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
}
.cov-stat {
  flex: 1; min-width: 120px;
  background: white; border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 18px;
  box-shadow: var(--shadow-sm);
}
.cov-stat-num { font-size: 1.6rem; font-weight: 700; line-height: 1; color: var(--ink); }
.cov-stat-label { font-size: .68rem; color: var(--ink-3); margin-top: 4px; font-weight: 500; }
.cov-stat.danger .cov-stat-num { color: var(--accent); }
.cov-stat.ok    .cov-stat-num { color: var(--green); }

.coverage-table {
  width: 100%; border-collapse: collapse;
  background: white; border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.coverage-table th {
  font-size: .62rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  color: var(--ink-3); padding: 9px 14px; text-align: left;
  border-bottom: 1px solid var(--border); background: #fafaf8;
}
.coverage-table td {
  padding: 9px 14px; border-bottom: 1px solid var(--border);
  font-size: .8rem; vertical-align: middle;
}
.coverage-table tr:last-child td { border-bottom: none; }
.coverage-table tr.cov-covered   { }
.coverage-table tr.cov-partial   { background: #fff8e6; }
.coverage-table tr.cov-uncovered { background: #fff0f0; }
.coverage-table tr:hover td { background: var(--paper-2); }
.coverage-table tr.cov-uncovered:hover td { background: #ffe5e5; }

.cov-code {
  font-family: 'DM Mono', monospace; font-size: .7rem;
  padding: 2px 7px; border-radius: 4px;
  background: var(--blue-2); color: var(--blue);
  border: 1px solid #c0d4f0; white-space: nowrap;
}
.cov-status-badge {
  font-size: .62rem; font-weight: 700; padding: 2px 8px;
  border-radius: 100px; white-space: nowrap;
}
.cov-status-badge.covered   { background: var(--green-2);  color: var(--green);  border: 1px solid #b6e4c8; }
.cov-status-badge.partial   { background: #fff8e6; color: #b45309; border: 1px solid #f0dea0; }
.cov-status-badge.uncovered { background: #fff0f0; color: var(--accent); border: 1px solid #f5c6c1; }

.cov-topic-links { display: flex; flex-wrap: wrap; gap: 4px; }
.cov-topic-link {
  font-size: .65rem; padding: 1px 7px; border-radius: 4px;
  background: var(--paper); border: 1px solid var(--border);
  color: var(--ink-2); cursor: pointer; transition: all .12s;
  text-decoration: none; white-space: nowrap;
}
.cov-topic-link:hover { background: var(--blue-2); color: var(--blue); border-color: #c0d4f0; }
.cov-topic-link.done { background: var(--green-2); border-color: #b6e4c8; color: var(--green); }
.cov-topic-link.inprogress { background: var(--blue-2); border-color: #c0d4f0; color: var(--blue); }

.cov-group-heading {
  font-size: .62rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase;
  color: var(--ink-3); padding: 10px 14px 4px;
  border-bottom: 1px solid var(--border); background: #f7f7f5;
}
.cov-filter-bar { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
.cov-filter-chip {
  font-size: .7rem; font-weight: 500; padding: 4px 12px; border-radius: 100px;
  border: 1px solid var(--border); background: var(--paper); color: var(--ink-2);
  cursor: pointer; transition: all .12s;
}
.cov-filter-chip:hover { border-color: var(--ink-2); color: var(--ink); }
.cov-filter-chip.on { background: var(--ink); border-color: var(--ink); color: white; }
"""

CSS_CROSS_SUBJ = """
/* ─── WEEKLY VIEW ──────────────────────────────*/
/* Cross-subject toggle bar */
.cross-subj-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px 10px 0; margin-bottom: 4px;
}
.cross-subj-label { font-size: .65rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); }
.cross-chip {
  font-size: .68rem; font-weight: 500;
  padding: 3px 10px; border-radius: 100px;
  border: 1px solid var(--border); background: var(--paper); color: var(--ink-2);
  cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 5px;
}
.cross-chip:hover { border-color: var(--ink-2); color: var(--ink); }
.cross-chip.on { background: var(--ink); border-color: var(--ink); color: white; }
.cross-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.week-card-subj-sep {
  font-size: .58rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: var(--ink-3); padding: 5px 14px 2px; border-top: 1px solid var(--border);
}

/* Workload indicator */
.week-load-bar { height: 3px; background: var(--border); margin: 0; position: relative; }
.week-load-fill { height: 100%; border-radius: 0; transition: width .4s; }
.week-load-fill.load-ok      { background: var(--green); }
.week-load-fill.load-medium  { background: var(--amber, #d97706); }
.week-load-fill.load-heavy   { background: var(--accent); }
"""

# ── JS STATE blocks ─────────────────────────────────────────────────────────

def make_cross_subj_state(cfg):
    """Build crossSubjData, crossSubjActive, CROSS_SUBJ_COLLECTIONS state vars."""
    cross = cfg['cross']
    own   = cfg['own_subj_key']

    # Build crossSubjData initial object
    data_keys = ', '.join(f"\n  {c[2]}: null" for c in cross)
    # Build crossSubjActive initial object — own is true, others false
    active_keys_parts = [f"\n  {own}: true"]
    for c in cross:
        active_keys_parts.append(f"\n  {c[2]}: false")
    active_keys = ','.join(active_keys_parts)

    # Build CROSS_SUBJ_COLLECTIONS
    coll_parts = []
    for c in cross:
        coll_parts.append(
            f"  {c[2]}: {{ col: '{c[0]}', doc: '{cfg['doc']}', label: '{c[1]}' }}"
        )
    coll_str = ',\n'.join(coll_parts)

    return f"""// Cross-subject weekly data cache
var crossSubjData = {{{data_keys}
}};
var crossSubjActive = {{{active_keys}
}};

// Cross-subject Firestore collection map
const CROSS_SUBJ_COLLECTIONS = {{
{coll_str}
}};
"""

# ── JS PACE ALERT functions ──────────────────────────────────────────────────

JS_PACE_ALERT = """// -----------------------------------------------------------
// PACE ALERT HELPERS
// -----------------------------------------------------------
// School term start date — admin can set this via Central Hub settings
// Default: first Monday of September of current year
var TERM_START_DATE = null; // set by admin; falls back to auto-detect

function getTermStartDate() {
  if (TERM_START_DATE) return new Date(TERM_START_DATE);
  // Auto-detect: first Monday of September this year (or last year if before Sep)
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const sep1 = new Date(year, 8, 1);
  const day = sep1.getDay(); // 0=Sun
  const offset = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  return new Date(year, 8, 1 + offset);
}

function getCurrentSchoolWeek() {
  const start = getTermStartDate();
  const now   = new Date();
  const diffMs = now - start;
  if (diffMs < 0) return 0; // term hasn't started
  return Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
}

// Returns: 'overdue' | 'behind' | 'on-track' | 'upcoming' | null
function getPaceStatus(topic) {
  if (!topic.week) return null;
  const topicWeek = parseInt(String(topic.week).replace(/\\D/g, '')) || 0;
  if (!topicWeek) return null;
  const currentWeek = getCurrentSchoolWeek();
  if (topic.status === 'done') return null; // done = no alert
  if (currentWeek > topicWeek + 1) return 'overdue';
  if (currentWeek > topicWeek)     return 'behind';
  if (currentWeek === topicWeek)   return 'on-track';
  return 'upcoming';
}

const PACE_LABELS = {
  overdue:  'Overdue',
  behind:   'Behind',
  'on-track': 'This week',
  upcoming: 'Upcoming',
};

function renderPaceBadge(topic) {
  const status = getPaceStatus(topic);
  if (!status) return '';
  return `<span class="pace-badge ${status}" title="School week ${topic.week} vs current week ${getCurrentSchoolWeek()}">${PACE_LABELS[status]}</span>`;
}

function renderPaceSummary() {
  const pill = document.getElementById('paceSummaryPill');
  if (!pill) return;
  const currentWeek = getCurrentSchoolWeek();
  if (currentWeek <= 0) { pill.style.display = 'none'; return; }

  let overdue = 0, behind = 0;
  DATA.forEach(ch => ch.topics.forEach(t => {
    const s = getPaceStatus(t);
    if (s === 'overdue') overdue++;
    else if (s === 'behind') behind++;
  }));

  if (overdue === 0 && behind === 0) {
    pill.className = 'pace-summary-pill ok';
    pill.textContent = '✓ On track — Week ' + currentWeek;
  } else if (overdue > 0) {
    pill.className = 'pace-summary-pill danger';
    pill.textContent = overdue + ' overdue · ' + behind + ' behind · Wk ' + currentWeek;
  } else {
    pill.className = 'pace-summary-pill';
    pill.textContent = behind + ' behind schedule · Wk ' + currentWeek;
  }
  pill.style.display = 'flex';
}
"""

# ── JS TEACHER NOTES functions ───────────────────────────────────────────────

JS_TEACHER_NOTES = """// -----------------------------------------------------------
// TEACHER NOTES
// -----------------------------------------------------------
function toggleNote(ci, ti) {
  const panel = document.getElementById(`note-panel-${ci}-${ti}`);
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    const ta = document.getElementById(`note-ta-${ci}-${ti}`);
    if (ta) setTimeout(() => ta.focus(), 50);
  }
}

function saveNote(ci, ti) {
  const ta = document.getElementById(`note-ta-${ci}-${ti}`);
  if (!ta) return;
  const note = ta.value.trim();
  DATA[ci].topics[ti].note = note;
  saveState();
  showToast(note ? 'Note saved' : 'Note cleared');
  render();
}

function discardNote(ci, ti) {
  const panel = document.getElementById(`note-panel-${ci}-${ti}`);
  if (panel) panel.classList.remove('open');
  // Revert textarea to saved value
  const ta = document.getElementById(`note-ta-${ci}-${ti}`);
  if (ta) ta.value = DATA[ci].topics[ti].note || '';
}

function deleteNote(ci, ti) {
  DATA[ci].topics[ti].note = '';
  saveState();
  showToast('Note deleted');
  render();
}
"""

# ── JS CLASS MANAGEMENT functions ────────────────────────────────────────────

JS_CLASS_MGMT = """// -----------------------------------------------------------
// CLASS MANAGEMENT
// -----------------------------------------------------------
function buildClassSelector() {
  const wrap   = document.getElementById('classSelectorWrap');
  const select = document.getElementById('classSelect');
  const manBtn = document.getElementById('classManageBtn');
  if (!wrap || !select) return;

  // Always show selector (teachers can switch between All / class views)
  wrap.style.display = 'flex';
  if (manBtn) manBtn.style.display = role === 'admin' ? '' : 'none';

  // Rebuild options
  select.innerHTML = '<option value="default">All Classes</option>';
  classList.forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls;
    opt.textContent = cls;
    if (cls === currentClass) opt.selected = true;
    select.appendChild(opt);
  });
  if (currentClass === 'default') select.value = 'default';
}

function switchClass(cls) {
  currentClass = cls;
  // Notify Firebase module to switch progress path
  if (window.__fbSwitchClass) window.__fbSwitchClass(cls);
}

async function manageClasses() {
  const res = await _showCm({
    title: 'Manage Class Groups',
    msg: 'Enter class names separated by commas (e.g. 7A, 7B, 8A). These define separate progress paths per class.',
    fields: [{ id: 'classes', label: 'Class groups', ph: '7A, 7B, 8A', val: classList.join(', ') }]
  });
  if (!res) return;
  const raw = (res.classes || '').split(',').map(s => s.trim()).filter(Boolean);
  classList = [...new Set(raw)];
  buildClassSelector();
  // Save class list to Firestore structure meta
  if (window.__fbSaveClassList) window.__fbSaveClassList(classList);
  showToast('Class groups saved');
}
"""

# ── JS COVERAGE PANEL functions ──────────────────────────────────────────────

JS_COVERAGE = """// -----------------------------------------------------------
// RENDER - OBJECTIVE COVERAGE REPORT
// -----------------------------------------------------------
let coverageFilter = 'all'; // 'all' | 'uncovered' | 'partial' | 'covered'

function renderCoverage() {
  const el = document.getElementById('coverageReport');
  if (!el) return;

  // Collect all obj codes from all topics
  const codeMap = {}; // code -> [{ ci, ti, topic, status }]
  DATA.forEach((ch, ci) => {
    ch.topics.forEach((t, ti) => {
      const codes = parseObjCodes(t.objective || '');
      codes.forEach(code => {
        if (!codeMap[code]) codeMap[code] = [];
        codeMap[code].push({ ci, ti, topic: t.topic, status: t.status, chapter: ch.chapter });
      });
    });
  });

  const allCodes = Object.keys(codeMap).sort();
  const total    = allCodes.length;
  const covered  = allCodes.filter(c => codeMap[c].every(t => t.status === 'done')).length;
  const partial  = allCodes.filter(c => codeMap[c].some(t => t.status === 'done') && !codeMap[c].every(t => t.status === 'done')).length;
  const uncov    = allCodes.filter(c => codeMap[c].every(t => t.status === 'pending')).length;

  if (!total) {
    el.innerHTML = '<div class="empty"><p style="color:var(--ink-2);font-size:.8rem">No objective codes found. Coordinators can add Cambridge objective codes (e.g. C1.1, E2.3) to topic objectives.</p></div>';
    return;
  }

  // Filter
  const visible = coverageFilter === 'all' ? allCodes
    : allCodes.filter(code => {
        const topics = codeMap[code];
        const allDone = topics.every(t => t.status === 'done');
        const someDone = topics.some(t => t.status === 'done');
        if (coverageFilter === 'covered')   return allDone;
        if (coverageFilter === 'partial')   return someDone && !allDone;
        if (coverageFilter === 'uncovered') return !someDone;
        return true;
      });

  const pct = Math.round(covered / total * 100);

  el.innerHTML = `
    <div class="coverage-summary">
      <div class="cov-stat"><div class="cov-stat-num">${total}</div><div class="cov-stat-label">Total objectives</div></div>
      <div class="cov-stat ok"><div class="cov-stat-num">${covered}</div><div class="cov-stat-label">Fully covered (${pct}%)</div></div>
      <div class="cov-stat"><div class="cov-stat-num" style="color:var(--amber,#d97706)">${partial}</div><div class="cov-stat-label">In progress</div></div>
      <div class="cov-stat danger"><div class="cov-stat-num">${uncov}</div><div class="cov-stat-label">Not started</div></div>
    </div>

    <div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;margin-bottom:16px;box-shadow:var(--shadow-sm)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:.68rem;font-weight:700;color:var(--ink-3)">OVERALL COVERAGE</span>
        <span style="font-size:.72rem;color:var(--ink-2)">${pct}% complete</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--green);border-radius:4px;transition:width .5s"></div>
      </div>
    </div>

    <div class="cov-filter-bar">
      <button class="cov-filter-chip${coverageFilter==='all'?' on':''}" onclick="setCovFilter('all')">All (${total})</button>
      <button class="cov-filter-chip${coverageFilter==='covered'?' on':''}" onclick="setCovFilter('covered')">Covered (${covered})</button>
      <button class="cov-filter-chip${coverageFilter==='partial'?' on':''}" onclick="setCovFilter('partial')">In Progress (${partial})</button>
      <button class="cov-filter-chip${coverageFilter==='uncovered'?' on':''}" onclick="setCovFilter('uncovered')" style="color:${coverageFilter==='uncovered'?'':'var(--accent)'}">Not Started (${uncov})</button>
    </div>

    ${visible.length === 0 ? '<p style="color:var(--ink-3);font-size:.8rem;padding:12px 0">No objectives match this filter.</p>' : ''}

    <table class="coverage-table">
      <thead><tr>
        <th style="width:90px">Code</th>
        <th style="width:100px">Status</th>
        <th>Topics using this objective</th>
      </tr></thead>
      <tbody>
        ${visible.map(code => {
          const topics = codeMap[code];
          const allDone  = topics.every(t => t.status === 'done');
          const someDone = topics.some(t => t.status === 'done');
          const rowClass = allDone ? 'cov-covered' : someDone ? 'cov-partial' : 'cov-uncovered';
          const badge    = allDone ? 'covered' : someDone ? 'partial' : 'uncovered';
          const badgeLabel = allDone ? 'Covered' : someDone ? 'In Progress' : 'Not Started';
          const topicLinks = topics.map(t =>
            `<span class="cov-topic-link ${t.status}" onclick="scrollToChapter(${t.ci})" title="Ch ${t.ci+1}: ${escHtml(t.chapter)}">${escHtml(t.topic.substring(0,40))}${t.topic.length>40?'…':''}</span>`
          ).join('');
          return `<tr class="${rowClass}">
            <td><span class="cov-code">${escHtml(code)}</span></td>
            <td><span class="cov-status-badge ${badge}">${badgeLabel}</span></td>
            <td><div class="cov-topic-links">${topicLinks}</div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function setCovFilter(f) {
  coverageFilter = f;
  renderCoverage();
}
"""

# ── Build renderWeekly for a given config ────────────────────────────────────

def make_render_weekly(cfg):
    """Build the renderWeekly function for a specific file config."""
    own    = cfg['own_subj_key']
    cross  = cfg['cross']

    # Build the "own subject" block inside renderWeekly
    own_block = f"""  // {own.capitalize()} topics (always active if crossSubjActive.{own})
  if (crossSubjActive.{own}) {{
    DATA.forEach(ch => {{
      ch.topics.forEach(t => {{
        const w = t.week ? String(t.week) : null;
        if (!w) return;
        if (!weekMap[w]) weekMap[w] = {{ mathHours: 0, subjTopics: {{}} }};
        if (!weekMap[w].subjTopics.{own}) weekMap[w].subjTopics.{own} = [];
        weekMap[w].subjTopics.{own}.push({{ name: t.topic, chapter: ch.chapter, year: ch.year, hour: t.hour }});
        weekMap[w].mathHours += t.hour;
      }});
    }});
  }}"""

    # Build cross-subject blocks
    cross_subjkeys = [c[2] for c in cross]
    cross_list_str = ', '.join(f"'{k}'" for k in cross_subjkeys)

    cross_block = f"""
  // Other subjects
  [{cross_list_str}].forEach(subj => {{
    if (!crossSubjActive[subj] || !crossSubjData[subj]) return;
    crossSubjData[subj].forEach(ch => {{
      (ch.topics || []).forEach(t => {{
        const w = t.week ? String(t.week) : null;
        if (!w) return;
        if (!weekMap[w]) weekMap[w] = {{ mathHours: 0, subjTopics: {{}} }};
        if (!weekMap[w].subjTopics[subj]) weekMap[w].subjTopics[subj] = [];
        weekMap[w].subjTopics[subj].push({{ name: t.topic, chapter: ch.chapter || '', year: ch.year || '', hour: t.hour || 0 }});
      }});
    }});
  }});"""

    # Build subjColors and subjLabels objects
    subj_colors_parts = [f"  {own}: 'var(--accent)'"]
    subj_labels_parts = [f"  {own}: '{cfg['own_label']}'"]
    for c in cross:
        subj_colors_parts.append(f"  {c[2]}: '{c[3]}'")
        subj_labels_parts.append(f"  {c[2]}: '{c[1]}'")

    subj_colors_str = ',\n'.join(subj_colors_parts)
    subj_labels_str = ',\n'.join(subj_labels_parts)

    # The ordered subject list for rendering (own first, then cross)
    all_subj_keys = [own] + cross_subjkeys
    all_subj_arr  = ', '.join(f"'{k}'" for k in all_subj_keys)

    return f"""// -----------------------------------------------------------
// CROSS-SUBJECT TOGGLE
// -----------------------------------------------------------
function toggleCrossSubj(subj, btn) {{
  crossSubjActive[subj] = !crossSubjActive[subj];
  btn.classList.toggle('on', crossSubjActive[subj]);

  // Lazy-load from Firestore if first activation
  if (crossSubjActive[subj] && subj !== '{own}' && crossSubjData[subj] === null) {{
    const note = document.getElementById('crossSubjLoadingNote');
    if (note) note.style.display = 'inline';
    const col = CROSS_SUBJ_COLLECTIONS[subj];
    // Use window.__fbGetDoc exposed by Firebase module
    if (window.__fbGetDoc) {{
      window.__fbGetDoc(col.col, col.doc).then(chapters => {{
        crossSubjData[subj] = chapters;
        if (note) note.style.display = 'none';
        renderWeekly();
      }}).catch(() => {{
        crossSubjData[subj] = [];
        if (note) note.style.display = 'none';
        showToast('Could not load ' + col.label + ' data');
        renderWeekly();
      }});
    }} else {{
      crossSubjData[subj] = [];
      if (note) note.style.display = 'none';
      renderWeekly();
    }}
    return; // will re-render after load
  }}
  renderWeekly();
}}

// -----------------------------------------------------------
// RENDER - WEEKLY VIEW
// -----------------------------------------------------------
function renderWeekly() {{
  const weekMap = {{}};

{own_block}
{cross_block}

  const weeks = Object.keys(weekMap).sort((a, b) =>
    parseInt(a.replace(/\\D/g,'')) - parseInt(b.replace(/\\D/g,''))
  );

  const subjColors = {{
{subj_colors_str}
}};
  const subjLabels = {{
{subj_labels_str}
}};
  const MAX_HOURS = 12; // max expected hours per week for load bar

  if (!weeks.length) {{
    document.getElementById('weekGrid').innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="opacity:.35"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><p style="font-weight:500;color:var(--ink-2);margin-bottom:6px;">No weekly schedule yet</p><p style="font-size:.75rem;line-height:1.6;">Topics don\\'t have week assignments yet.<br>Coordinators can add week numbers to topics.</p></div>';
    return;
  }}

  document.getElementById('weekGrid').innerHTML = weeks.map(w => {{
    const wData = weekMap[w];
    // Total hours across all active subjects for this week
    let totalHours = 0;
    Object.values(wData.subjTopics).forEach(topics => topics.forEach(t => totalHours += (t.hour || 0)));
    const loadPct = Math.min(100, Math.round(totalHours / MAX_HOURS * 100));
    const loadClass = loadPct >= 85 ? 'load-heavy' : loadPct >= 55 ? 'load-medium' : 'load-ok';
    const currentWeek = getCurrentSchoolWeek();
    const wNum = parseInt(w.replace(/\\D/g,''));
    const isCurrent = wNum === currentWeek;

    let sectionsHtml = '';
    [{all_subj_arr}].forEach(subj => {{
      const topics = wData.subjTopics[subj];
      if (!topics || !topics.length) return;
      const showSep = Object.keys(wData.subjTopics).length > 1;
      if (showSep) sectionsHtml += `<div class="week-card-subj-sep">${{subjLabels[subj]}}</div>`;
      sectionsHtml += topics.map(t => `
        <div class="week-topic-row">
          <div class="wt-dot" style="background:${{subjColors[subj]}}"></div>
          <div class="wt-name">${{escHtml(t.name)}}</div>
          <div class="wt-ch">${{t.chapter ? (t.chapter.match(/^\\d+/)?.[0]||'') : ''}}</div>
        </div>`).join('');
    }});

    return `
    <div class="week-card" style="${{isCurrent ? 'border-color:var(--accent);box-shadow:0 0 0 2px rgba(192,57,43,.12)' : ''}}">
      <div class="week-load-bar"><div class="week-load-fill ${{loadClass}}" style="width:${{loadPct}}%"></div></div>
      <div class="week-card-head" style="${{isCurrent ? 'background:var(--accent)' : ''}}">
        <div class="week-card-title">Week ${{w.replace('Week ','')}}${{isCurrent ? ' ◀ Now' : ''}}</div>
        <div class="week-hours-tag">${{totalHours}}h total</div>
      </div>
      <div class="week-topics-list">${{sectionsHtml}}</div>
    </div>`;
  }}).join('');
}}
"""

# ── Cross-chip HTML for the weekly panel bar ─────────────────────────────────

def make_cross_subj_bar(cfg):
    own   = cfg['own_subj_key']
    label = cfg['own_label']
    cross = cfg['cross']

    chips = [
        f'        <button class="cross-chip on" data-subj="{own}" onclick="toggleCrossSubj(\'{own}\',this)">\n'
        f'          <span class="cross-chip-dot" style="background:var(--accent)"></span>{label}\n'
        f'        </button>'
    ]
    for col, lbl, key, color in cross:
        chips.append(
            f'        <button class="cross-chip" data-subj="{key}" onclick="toggleCrossSubj(\'{key}\',this)">\n'
            f'          <span class="cross-chip-dot" style="background:{color}"></span>{lbl}\n'
            f'        </button>'
        )

    return (
        '      <div class="cross-subj-bar">\n'
        '        <span class="cross-subj-label">Show subjects:</span>\n'
        + '\n'.join(chips) + '\n'
        '        <span id="crossSubjLoadingNote" style="font-size:.65rem;color:var(--ink-3);display:none">Loading other subjects…</span>\n'
        '      </div>\n'
    )

# ── Firebase module helpers for a given config ───────────────────────────────

def make_firebase_helpers(cfg):
    col = cfg['col']
    doc = cfg['doc']
    sk  = cfg['statuses_key']

    return f"""
// -- One-shot document fetch for cross-subject data --
window.__fbGetDoc = async function(colName, docName) {{
  const db = window.db;
  const snap = await getDoc(doc(db, colName, docName));
  if (snap.exists() && Array.isArray(snap.data().chapters)) {{
    return snap.data().chapters;
  }}
  return [];
}};

// -- Class switching: reload user progress from class-specific sub-key --
window.__fbSwitchClass = function(cls) {{
  if (!sharedStructure) return;
  currentClass = cls;
  _startSnapshot(currentUID, currentRole);
}};

// -- Save class list into the shared structure meta --
window.__fbSaveClassList = async function(list) {{
  const db = window.db;
  try {{
    await setDoc(
      doc(db, '{col}', '{doc}'),
      {{ classes: list, updatedAt: serverTimestamp() }},
      {{ merge: true }}
    );
  }} catch(e) {{ console.error('Class list save error:', e); }}
}};
"""

# ── Note row HTML to add after each topic row ────────────────────────────────

NOTE_BTN_SNIPPET = """${renderPaceBadge(t)}
                      <div class="status-pill">"""

NOTE_ROW_SNIPPET = """                <tr class="note-row" id="note-row-${ci}-${ti}">
                  <td colspan="6" style="padding:0 !important; border-bottom: 1px solid var(--border) !important;">
                    <div class="note-panel${t.note ? ' open' : ''}" id="note-panel-${ci}-${ti}">
                      <textarea class="note-textarea" id="note-ta-${ci}-${ti}" placeholder="Write your observation, differentiation note, or class feedback here…">${escHtml(t.note||'')}</textarea>
                      <div class="note-actions">
                        <button class="note-save-btn" onclick="saveNote(${ci},${ti})">Save Note</button>
                        <button class="note-discard-btn" onclick="discardNote(${ci},${ti})">Cancel</button>
                        ${t.note ? `<button class="note-discard-btn" style="color:var(--accent)" onclick="deleteNote(${ci},${ti})">Delete</button>` : ''}
                      </div>
                    </div>
                  </td>
                </tr>"""

# ── Main migration logic ─────────────────────────────────────────────────────

def migrate_file(filename, cfg):
    path = os.path.join(BASE, filename)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()

    original_lines = src.count('\n')
    changes = []

    # ── 1. CSS: add missing CSS blocks before closing </style> of the first <style> block
    # Find the end of the first style block (the one that has .layout etc.)
    first_style_end = src.find('</style>')

    css_to_add = ''
    if '/* ─── TEACHER NOTES' not in src:
        css_to_add += CSS_TEACHER_NOTES
        changes.append('CSS: Teacher Notes')
    if '/* ─── PACE ALERT BADGES' not in src:
        css_to_add += CSS_PACE_ALERT
        changes.append('CSS: Pace Alert Badges')
    if '/* ─── CLASS SELECTOR' not in src:
        css_to_add += CSS_CLASS_SELECTOR
        changes.append('CSS: Class Selector')
    if '/* ─── OBJECTIVE COVERAGE PANEL' not in src:
        css_to_add += CSS_COVERAGE_PANEL
        changes.append('CSS: Coverage Panel')
    if '/* ─── WEEKLY VIEW' not in src and '.cross-subj-bar' not in src:
        css_to_add += CSS_CROSS_SUBJ
        changes.append('CSS: Cross-subj / Weekly View')

    if css_to_add and first_style_end != -1:
        src = src[:first_style_end] + css_to_add + '\n' + src[first_style_end:]

    # ── 2. JS STATE: add after "var DATA = [];"
    state_block = make_cross_subj_state(cfg)
    if 'crossSubjData' not in src:
        # Insert after the "var DATA = [];" line + the "var role" line
        # Find the pattern: "var role = 'teacher'; // ..."
        # Then find the first blank line after that and insert state
        role_match = re.search(r"(var role = '[^']+';[^\n]*\n)", src)
        if role_match:
            insert_at = role_match.end()
            # Skip over existing state lines like filterYear etc. to find a good insertion spot
            # Insert right after the role line
            src = src[:insert_at] + '\n// Class-based progress\nvar currentClass = \'default\'; // \'default\' = shared / all classes\nvar classList    = [];        // populated from Firestore meta doc (admin-managed)\n\n' + state_block + src[insert_at:]
            changes.append('JS STATE: crossSubjData, classList, CROSS_SUBJ_COLLECTIONS')

    # ── 3. JS: PACE ALERT helpers — insert before "// PERSIST" block
    if 'function getTermStartDate' not in src:
        persist_match = re.search(r'(// -{3,}\s*\n// PERSIST)', src)
        if persist_match:
            src = src[:persist_match.start()] + JS_PACE_ALERT + '\n' + src[persist_match.start():]
            changes.append('JS: Pace Alert helpers')

    # ── 4. JS: TEACHER NOTES — insert before "// CLASS MANAGEMENT" or before "function resetProgress"
    if 'function toggleNote' not in src:
        # Try inserting before resetProgress
        reset_match = re.search(r'(function resetProgress\b)', src)
        if reset_match:
            src = src[:reset_match.start()] + JS_TEACHER_NOTES + '\n' + src[reset_match.start():]
            changes.append('JS: Teacher Notes functions')

    # ── 5. Replace renderWeekly + add toggleCrossSubj
    new_render_weekly = make_render_weekly(cfg)
    if 'toggleCrossSubj' not in src:
        # Find the existing renderWeekly function and replace it entirely
        # The function starts with the comment block before it
        rw_match = re.search(
            r'// -{3,}\s*\n// RENDER - WEEKLY VIEW\s*\n// -{3,}\s*\nfunction renderWeekly\(\) \{',
            src
        )
        if rw_match:
            # Find the end of renderWeekly — the next top-level function start
            func_end = find_function_end(src, rw_match.start())
            src = src[:rw_match.start()] + new_render_weekly + '\n' + src[func_end:]
            changes.append('JS: toggleCrossSubj + new renderWeekly')
        else:
            # Try simpler pattern
            rw_match2 = re.search(r'function renderWeekly\(\) \{', src)
            if rw_match2:
                func_end = find_function_end(src, rw_match2.start())
                # Also remove the comment block before it
                comment_start = find_comment_before(src, rw_match2.start())
                src = src[:comment_start] + new_render_weekly + '\n' + src[func_end:]
                changes.append('JS: toggleCrossSubj + new renderWeekly (simple)')

    # ── 6. JS: Coverage panel functions
    if 'function renderCoverage' not in src:
        # Insert before "// INTERACTIONS" block
        inter_match = re.search(r'// -{3,}\s*\n// INTERACTIONS', src)
        if inter_match:
            src = src[:inter_match.start()] + JS_COVERAGE + '\n' + src[inter_match.start():]
            changes.append('JS: renderCoverage + setCovFilter')

    # ── 7. JS: Class management functions
    if 'function buildClassSelector' not in src:
        # Insert before "function resetProgress" (which now is after teacher notes)
        reset_match = re.search(r'(function resetProgress\b)', src)
        if reset_match:
            src = src[:reset_match.start()] + JS_CLASS_MGMT + '\n' + src[reset_match.start():]
            changes.append('JS: buildClassSelector, switchClass, manageClasses')

    # ── 8. HTML changes
    # 8a. Topbar: add paceSummaryPill + classSelectorWrap before role-badge
    if 'id="paceSummaryPill"' not in src:
        role_badge_match = re.search(r'(\s+)<div class="role-badge" id="roleBadge">', src)
        if role_badge_match:
            indent = role_badge_match.group(1)
            topbar_inserts = (
                f'{indent}<div id="paceSummaryPill" class="pace-summary-pill" style="display:none" title="Pace status based on current school week"></div>\n'
                f'{indent}<div class="class-selector-wrap" id="classSelectorWrap" style="display:none">\n'
                f'{indent}  <label class="class-selector-label" for="classSelect">Class:</label>\n'
                f'{indent}  <select class="class-select" id="classSelect" onchange="switchClass(this.value)">\n'
                f'{indent}    <option value="default">All Classes</option>\n'
                f'{indent}  </select>\n'
                f'{indent}  <button class="class-manage-btn" id="classManageBtn" onclick="manageClasses()" style="display:none" title="Add/remove class groups">⚙</button>\n'
                f'{indent}</div>\n'
            )
            src = src[:role_badge_match.start(1)] + '\n' + topbar_inserts + indent + src[role_badge_match.start(1)+1:]
            changes.append('HTML: paceSummaryPill + classSelectorWrap in topbar')

    # 8b. Tab group: add "Obj Coverage" tab
    if "switchView('coverage'" not in src:
        # Find the Weekly View tab button and add after it
        weekly_tab_match = re.search(
            r'(<button class="tab-btn" onclick="switchView\(\'weekly\',this\)">Weekly View</button>)',
            src
        )
        if weekly_tab_match:
            src = src[:weekly_tab_match.end()] + '\n        <button class="tab-btn" onclick="switchView(\'coverage\',this)">Obj Coverage</button>' + src[weekly_tab_match.end():]
            changes.append('HTML: Obj Coverage tab button')

    # 8c. Coverage panel HTML before weekly panel
    if 'id="panel-coverage"' not in src:
        weekly_panel_match = re.search(r'(\s+)<!-- WEEKLY PANEL -->', src)
        if not weekly_panel_match:
            weekly_panel_match = re.search(r'(\s+)<div class="panel" id="panel-weekly">', src)
        if weekly_panel_match:
            indent = '    '
            coverage_panel = (
                f'\n{indent}<!-- COVERAGE PANEL -->\n'
                f'{indent}<div class="panel" id="panel-coverage">\n'
                f'{indent}  <div id="coverageReport"></div>\n'
                f'{indent}</div>\n\n'
            )
            src = src[:weekly_panel_match.start()] + coverage_panel + src[weekly_panel_match.start():]
            changes.append('HTML: Coverage panel div')

    # 8d. Cross-subject toggle bar in weekly panel
    if 'class="cross-subj-bar"' not in src:
        week_grid_match = re.search(r'(<div class="week-grid" id="weekGrid"></div>)', src)
        if week_grid_match:
            cross_bar = make_cross_subj_bar(cfg)
            src = src[:week_grid_match.start()] + cross_bar + '      ' + src[week_grid_match.start():]
            changes.append('HTML: cross-subj-bar in weekly panel')

    # ── 9. renderPaceBadge in topic rows (add before status-pill div)
    if 'renderPaceBadge' not in src:
        # The target files have a line like: "${t.week ? ... : ''}" and then the status-pill div
        # We need to find the week badge span and add renderPaceBadge after it
        # Pattern: the week badge + blank + status-pill (multiline approach)
        week_badge_pat = re.compile(
            r"(\$\{t\.week \? `<span[^`]+>Week \$\{t\.week\}</span>` : ''\})\s*\n(\s+)(<div class=\"status-pill\">)",
            re.MULTILINE
        )
        week_badge_match = week_badge_pat.search(src)
        if week_badge_match:
            replacement = (
                week_badge_match.group(1) + '\n'
                + week_badge_match.group(2) + '${renderPaceBadge(t)}\n'
                + week_badge_match.group(2) + week_badge_match.group(3)
            )
            src = src[:week_badge_match.start()] + replacement + src[week_badge_match.end():]
            changes.append('HTML: renderPaceBadge in topic rows')

    # ── 9b. Note button in topic rows (add after status-pill close + before end of status div)
    if 'note-btn' not in src:
        # Find the closing </div> of the status-pill inside the topic row
        # Pattern: </div> followed by a linebreak and closing of the outer status div
        # Looking for: </div>\n                    </div> pattern in the pacing table rows
        # The target: after the status-pill div closing, add note-btn
        sp_close_pat = re.compile(
            r'(</div>\s*\n)(\s+)(</div>\s*\n\s*</td>\s*\n\s*<td></td>\s*\n\s*<td></td>\s*\n\s*<td></td>\s*\n\s*<td></td>)',
            re.MULTILINE
        )
        sp_match = sp_close_pat.search(src)
        if sp_match:
            indent2 = sp_match.group(2)
            note_btn = (
                f'{sp_match.group(1)}'
                f'{indent2}<button class="note-btn${{t.note ? \' has-note\' : \'\'}}" onclick="toggleNote(${{ci}},${{ti}})" title="${{t.note ? \'Edit note\' : \'Add teacher note\'}}">✎ ${{t.note ? \'Note\' : \'Add note\'}}</button>\n'
                f'{indent2}'
            )
            src = src[:sp_match.start()] + note_btn + src[sp_match.start(1+1):]
            changes.append('HTML: note-btn in topic rows')

    # ── 9c. Add note-row after the resources row in topic rows
    if 'note-row' not in src:
        # Find the res-row closing and add note-row after it
        res_row_close = re.compile(
            r'(</tr>\s*\n\s*<tr class="add-topic-row">)',
            re.MULTILINE
        )
        # We need the note-row BEFORE add-topic-row (there's only one add-topic-row per chapter)
        # This approach: find the pattern where res-row ends and add-topic-row begins
        note_row_html = (
            '                <tr class="note-row" id="note-row-${ci}-${ti}">\n'
            '                  <td colspan="6" style="padding:0 !important; border-bottom: 1px solid var(--border) !important;">\n'
            '                    <div class="note-panel${t.note ? \' open\' : \'\'}" id="note-panel-${ci}-${ti}">\n'
            '                      <textarea class="note-textarea" id="note-ta-${ci}-${ti}" placeholder="Write your observation, differentiation note, or class feedback here…">${escHtml(t.note||\'\'||\'\'  )}</textarea>\n'
            '                      <div class="note-actions">\n'
            '                        <button class="note-save-btn" onclick="saveNote(${ci},${ti})">Save Note</button>\n'
            '                        <button class="note-discard-btn" onclick="discardNote(${ci},${ti})">Cancel</button>\n'
            '                        ${t.note ? `<button class="note-discard-btn" style="color:var(--accent)" onclick="deleteNote(${ci},${ti})">Delete</button>` : \'\'}\n'
            '                      </div>\n'
            '                    </div>\n'
            '                  </td>\n'
            '                </tr>\n'
        )
        # Better: find the res-row closing (the </tr> just before add-topic-row inside the topics map)
        # The res-row is identified by renderResourcesHtml call in the td
        res_row_pat = re.compile(
            r'(<tr class="res-row[^"]*"[^>]*>\s*\n\s*<td colspan="6">\$\{renderResourcesHtml[^\}]+\}</td>\s*\n\s*</tr>)',
            re.MULTILINE
        )
        res_match = res_row_pat.search(src)
        if res_match:
            src = src[:res_match.end()] + '\n' + note_row_html + src[res_match.end():]
            changes.append('HTML: note-row after res-row')

    # ── 10. render() — add renderPaceSummary() and renderCoverage()
    render_fn_match = re.search(r'function render\(\) \{\s*\n', src)
    if render_fn_match:
        fn_start = render_fn_match.end()
        # Check if renderPaceSummary is already there
        if 'renderPaceSummary' not in src:
            # Add renderPaceSummary() after renderProgress()
            src = src[:fn_start] + '  renderPaceSummary();\n' + src[fn_start:]
            changes.append('JS render(): added renderPaceSummary()')
        if 'renderCoverage()' not in src:
            # Find end of render() body and add renderCoverage() before closing brace
            render_end = find_function_end(src, render_fn_match.start())
            # The closing brace is at render_end - length of "}\n" at end
            # Find the last } in the render function
            close_brace_pos = src.rfind('}', render_fn_match.start(), render_end)
            if close_brace_pos != -1:
                src = src[:close_brace_pos] + '  renderCoverage();\n' + src[close_brace_pos:]
                changes.append('JS render(): added renderCoverage()')

    # ── 11. applyRole: add buildClassSelector() before render()
    if 'buildClassSelector' not in src:
        apply_role_match = re.search(r'function applyRole\(r\) \{', src)
        if apply_role_match:
            fn_end = find_function_end(src, apply_role_match.start())
            close_pos = src.rfind('}', apply_role_match.start(), fn_end)
            # Find the render() call inside applyRole
            render_call = re.search(r'(\n\s+render\(\);)', src[apply_role_match.start():fn_end])
            if render_call:
                abs_pos = apply_role_match.start() + render_call.start()
                src = src[:abs_pos] + '\n  buildClassSelector();' + src[abs_pos:]
                changes.append('JS applyRole(): added buildClassSelector()')

    # ── 12. Firebase module: add getDoc import + helpers
    # 12a. Add getDoc to import
    if 'getDoc,' not in src and '  getDoc,' not in src:
        import_match = re.search(r'(import \{[^}]+\} from "https://www\.gstatic\.com/firebasejs[^"]+/firebase-firestore\.js";)', src, re.DOTALL)
        if import_match:
            old_import = import_match.group(1)
            if 'getDoc' not in old_import:
                new_import = old_import.replace('  doc,', '  doc,\n  getDoc,')
                src = src[:import_match.start()] + new_import + src[import_match.end():]
                changes.append('Firebase: added getDoc import')

    # 12b. Add note merge in _mergeAndRender
    merge_pat = re.compile(
        r"(status: userStatuses\[`\$\{ci\}-\$\{ti\}`\][^\n]*\n)(\s+\}\)\),\s*\n)",
        re.MULTILINE
    )
    if 'note:   userStatuses' not in src:
        merge_match = merge_pat.search(src)
        if merge_match:
            src = src[:merge_match.end(1)] + "      note:   userStatuses[`note-${ci}-${ti}`]  || '',\n" + src[merge_match.end(1):]
            changes.append('Firebase _mergeAndRender: added note field')

    # 12c. Add note save in __fbSaveState
    if "note-${ci}-${ti}" not in src:
        note_save_pat = re.compile(
            r'(if \(t\.status && t\.status !== \'pending\'\) \{\s*\n\s+newStatuses\[`\$\{ci\}-\$\{ti\}`\] = t\.status;\s*\n\s+\})',
            re.MULTILINE
        )
        note_save_match = note_save_pat.search(src)
        if note_save_match:
            note_save_insert = '\n      if (t.note && t.note.trim()) {\n        newStatuses[`note-${ci}-${ti}`] = t.note.trim();\n      }'
            src = src[:note_save_match.end()] + note_save_insert + src[note_save_match.end():]
            changes.append('Firebase __fbSaveState: save notes')

    # 12d. Strip note from coordinator structure save (note + status destructure)
    struct_strip_pat = re.compile(
        r'topics: ch\.topics\.map\(\(\{ status, \.\.\.rest \}\) => rest\)',
        re.MULTILINE
    )
    if struct_strip_pat.search(src):
        src = struct_strip_pat.sub(
            'topics: ch.topics.map(({ status, note, ...rest }) => rest)',
            src
        )
        changes.append('Firebase: strip note from structure save')

    # 12e. Class-scoped progress key — update progress snapshot to use _progressKey()
    # and update save to use class-scoped key
    sk = cfg['statuses_key']
    col = cfg['col']
    doc_id = cfg['doc']

    # Replace the simple statuses read with _progressKey()-based read
    if '_progressKey()' not in src:
        # Add _progressKey() helper inside _startSnapshot
        # Find the unsubUserProg assignment and add helper before it
        unsub_up = re.search(r'(  // -{2,} Per-user progress listener|  // -- Per-user progress listener)', src)
        if unsub_up:
            prog_key_fn = (
                f"\n  // Per-user progress listener — key is class-scoped\n"
                f"  function _progressKey() {{\n"
                f"    return currentClass && currentClass !== 'default'\n"
                f"      ? `{sk}_${{currentClass.replace(/\\s/g,'_')}}`\n"
                f"      : '{sk}';\n"
                f"  }}\n"
            )
            src = src[:unsub_up.start()] + prog_key_fn + src[unsub_up.start():]
            changes.append('Firebase: added _progressKey() helper')

        # Update the statuses read in snapshot
        statuses_read_pat = re.compile(
            rf"userStatuses\s*=\s*\(snap\.exists\(\) && snap\.data\(\)\.{re.escape(sk)}\)\s*\n?\s*\? snap\.data\(\)\.{re.escape(sk)}\s*\n?\s*: \{{",
            re.MULTILINE
        )
        # Also handle multi-line forms
        statuses_read_pat2 = re.compile(
            rf"userStatuses\s*=\s*\(?snap\.exists\(\) && snap\.data\(\)\.{re.escape(sk)}\)?\s*\n?\s*\? snap\.data\(\)\.{re.escape(sk)}\s*\n?\s*: \{{",
            re.MULTILINE
        )
        # Try single-line match
        sl_pat = re.compile(
            rf"userStatuses\s*=\s*\(?snap\.exists\(\)[^\n]*\.{re.escape(sk)}\)?\s*\n?\s*\? snap\.data\(\)\.{re.escape(sk)}[^:]*: \{{",
            re.MULTILINE
        )
        sl_match = sl_pat.search(src)
        if sl_match:
            new_read = (
                f"userStatuses  = (snap.exists() && snap.data()[_progressKey()])\n"
                f"       ? snap.data()[_progressKey()] : {{"
            )
            src = src[:sl_match.start()] + new_read + src[sl_match.end():]
            changes.append('Firebase: class-scoped statuses read')

    # 12f. Class-scoped progress key in __fbSaveState
    if cfg['statuses_key'] + ': newStatuses' in src and 'progressKey' not in src:
        # Replace direct key usage with progressKey variable
        save_key_pat = re.compile(
            rf"await setDoc\(\s*\n?\s*doc\([^,]+, 'userProgress', currentUID\),\s*\n?\s*\{{ {re.escape(sk)}: newStatuses",
            re.MULTILINE
        )
        if save_key_pat.search(src):
            # Add progressKey variable before the setDoc call
            setdoc_match = save_key_pat.search(src)
            prog_key_var = (
                f"  // 2. Save user's own progress (class-scoped key)\n"
                f"  const progressKey = currentClass && currentClass !== 'default'\n"
                f"    ? `{sk}_${{currentClass.replace(/\\s/g,'_')}}`\n"
                f"    : '{sk}';\n"
            )
            # Find the comment "// 2. Save user's own progress" to replace
            save_comment_match = re.search(r'  // 2\. Save user.*own progress[^\n]*\n', src)
            if save_comment_match:
                src = src[:save_comment_match.start()] + prog_key_var + src[save_comment_match.end():]
                # Now replace the statuses key in setDoc
                src = re.sub(
                    rf'\{{ {re.escape(sk)}: newStatuses',
                    '{ [progressKey]: newStatuses',
                    src
                )
                changes.append('Firebase: class-scoped save key')

    # 12g. Add classList loading from structure snapshot
    if 'classList = snap.data().classes' not in src:
        struct_snap_ok = re.search(
            r"(sharedStructure = snap\.exists\(\) && Array\.isArray\(snap\.data\(\)\.chapters\)\s*\n?\s*\? snap\.data\(\)\.chapters : \[\];)",
            src
        )
        if struct_snap_ok:
            src = src[:struct_snap_ok.end()] + (
                '\n    // Load class list from structure meta\n'
                '    if (snap.exists() && Array.isArray(snap.data().classes)) {\n'
                '      classList = snap.data().classes;\n'
                '    }'
            ) + src[struct_snap_ok.end():]
            changes.append('Firebase: classList loading from structure snap')

    # 12h. Add window.__fbGetDoc, __fbSwitchClass, __fbSaveClassList
    if 'window.__fbGetDoc' not in src:
        # Insert before authReady listener
        auth_ready_match = re.search(r"// -- auth-guard[^\n]*\ndocument\.addEventListener\('authReady'", src)
        if auth_ready_match:
            fb_helpers = make_firebase_helpers(cfg)
            src = src[:auth_ready_match.start()] + fb_helpers + '\n' + src[auth_ready_match.start():]
            changes.append('Firebase: __fbGetDoc, __fbSwitchClass, __fbSaveClassList')

    # 12i. Change coord → admin in authReady appRole assignment
    # Change: 'teachers_admin' ? 'coord' : 'teacher' → 'teachers_admin' ? 'admin' : 'teacher'
    src = src.replace(
        "profile.role_teachershub === 'teachers_admin' ? 'coord' : 'teacher'",
        "profile.role_teachershub === 'teachers_admin' ? 'admin' : 'teacher'"
    )
    # Change role-dot class assignments
    src = src.replace(
        "roleDot.className = 'role-dot ' + (appRole === 'coord' ? 'role-dot-coord' : 'role-dot-teacher')",
        "roleDot.className = 'role-dot ' + (appRole === 'admin' ? 'role-dot-admin' : 'role-dot-teacher')"
    )
    src = src.replace(
        "roleLabel.textContent = appRole === 'coord' ? 'Coordinator' : 'Teacher'",
        "roleLabel.textContent = appRole === 'admin' ? 'Admin' : 'Teacher'"
    )

    # 12j. Change coord → admin everywhere in the JS (role checks, css classes)
    # CSS class: .coord-mode → .admin-mode
    src = src.replace('.coord-mode', '.admin-mode')
    # JS role checks
    src = re.sub(r"\brole === 'coord'\b", "role === 'admin'", src)
    src = re.sub(r"\bcurrentRole === 'coord'\b", "currentRole === 'admin'", src)
    src = re.sub(r"\bappRole = .+? \? 'coord'", lambda m: m.group(0).replace("'coord'", "'admin'"), src)
    # The coord in role variable initial value
    src = re.sub(r"var role = 'teacher'; // 'teacher' \| 'coord'", "var role = 'teacher'; // 'teacher' | 'admin'", src)
    src = re.sub(r"let currentRole\s*= 'teacher';", "let currentRole = 'teacher';", src)
    # applyRole if r === 'coord'
    src = re.sub(r"if \(r === 'coord'\)", "if (r === 'admin')", src)
    src = re.sub(r"r === 'coord'", "r === 'admin'", src)
    # role-dot-coord → role-dot-admin
    src = src.replace('role-dot-coord', 'role-dot-admin')
    src = src.replace("dot.className     = 'role-dot coord'", "dot.className     = 'role-dot role-dot-admin'")
    src = src.replace("dot.className     = 'role-dot teacher'", "dot.className     = 'role-dot role-dot-teacher'")
    src = re.sub(r"label\.textContent = 'Coordinator'", "label.textContent = 'Admin'", src)
    # document.body.classList.add/remove('coord-mode') already handled above via .coord-mode → .admin-mode
    # but the JS classList calls also need fixing
    src = src.replace("classList.add('coord-mode')", "classList.add('admin-mode')")
    src = src.replace("classList.remove('coord-mode')", "classList.remove('admin-mode')")
    # role !== 'coord'
    src = re.sub(r"\brole !== 'coord'\b", "role !== 'admin'", src)

    # Fix role badge initial label ('Coordinator' → 'Admin') in applyRole
    src = re.sub(r"label\.textContent = 'Coordinator';", "label.textContent = 'Admin';", src)

    # Also add the loadingScreen hide inside _mergeAndRender (some files have it, some don't)
    if "document.getElementById('loadingScreen').style.display = 'none'" not in src:
        apply_role_in_merge = re.search(r"(applyRole\(appRole\);   // sets role var, updates badge, calls render\(\))", src)
        if apply_role_in_merge:
            src = src[:apply_role_in_merge.start()] + "document.getElementById('loadingScreen').style.display = 'none';\n    " + src[apply_role_in_merge.start():]
            changes.append('Firebase _mergeAndRender: hide loadingScreen on first load')

    # 12k. Add loadTimeout fallback (some files are missing it)
    if '_loadTimeout' not in src:
        # Add fallback before the closing brace of _startSnapshot
        tryrender_pat = re.search(r"(  // -- Per-user progress listener|  unsubUserProg = onSnapshot\(userProgRef)", src)
        # Find the closing brace of _startSnapshot function
        start_snap_match = re.search(r'function _startSnapshot\(uid, appRole\) \{', src)
        if start_snap_match:
            fn_end = find_function_end(src, start_snap_match.start())
            close_pos = fn_end - 2  # position just before final "}\n"
            fallback = (
                '\n\n  // Fallback: if Firestore snapshots don\'t return within 8s, unblock the UI\n'
                '  const _loadTimeout = setTimeout(() => {\n'
                '    if (!structureReady || !progressReady) {\n'
                '      sharedStructure = sharedStructure || [];\n'
                '      userStatuses    = userStatuses    || {};\n'
                '      structureReady  = true;\n'
                '      progressReady   = true;\n'
                '      document.getElementById(\'loadingScreen\').style.display = \'none\';\n'
                '      applyRole(appRole);\n'
                '    }\n'
                '  }, 8000);\n'
            )
            # Find the close brace of _startSnapshot
            close_brace = src.rfind('}\n', start_snap_match.start(), fn_end)
            if close_brace != -1:
                # Check there's no _loadTimeout already
                src = src[:close_brace] + fallback + src[close_brace:]
                changes.append('Firebase: added _loadTimeout fallback')

    new_lines = src.count('\n')
    diff = new_lines - original_lines

    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)

    return original_lines, new_lines, diff, changes

# ── Helper: find the end of a JS function starting at pos ────────────────────

def find_function_end(src, start_pos):
    """Return the index just after the closing brace of a JS function."""
    depth = 0
    i = src.find('{', start_pos)
    if i == -1:
        return len(src)
    while i < len(src):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return len(src)

def find_comment_before(src, pos):
    """Find the start of a // --- comment block just before pos."""
    # Look backwards for the comment
    last_newline = src.rfind('\n', 0, pos)
    if last_newline == -1:
        return pos
    # Check the line just before
    prev_line_end = last_newline
    prev_line_start = src.rfind('\n', 0, prev_line_end)
    prev_line = src[prev_line_start+1:prev_line_end]
    if re.match(r'\s*//', prev_line):
        # It's a comment line — find how far back the block goes
        block_start = prev_line_start
        while True:
            ll_end = block_start
            ll_start = src.rfind('\n', 0, ll_end)
            ll = src[ll_start+1:ll_end]
            if re.match(r'\s*//', ll):
                block_start = ll_start
            else:
                break
        return block_start + 1
    return pos

# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('Eduversal Teachers Hub - Pacing Page Migration')
    print('=' * 60)
    total_changes = 0

    for filename, cfg in FILE_CONFIGS.items():
        path = os.path.join(BASE, filename)
        if not os.path.exists(path):
            print(f'  SKIP  {filename} (not found)')
            continue
        try:
            orig, new, diff, changes = migrate_file(filename, cfg)
            sign = '+' if diff >= 0 else ''
            print(f'\n{filename}')
            print(f'  Lines: {orig} -> {new} ({sign}{diff})')
            if changes:
                for c in changes:
                    print(f'  + {c}')
            else:
                print('  (no changes needed)')
            total_changes += len(changes)
        except Exception as e:
            import traceback
            print(f'  ERROR in {filename}: {e}')
            traceback.print_exc()

    print('\n' + '=' * 60)
    print(f'Total modifications applied: {total_changes}')
    print('Done.')
