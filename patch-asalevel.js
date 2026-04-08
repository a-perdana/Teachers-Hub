/**
 * patch-asalevel.js
 * Applies all new features from igcse-math-pacing.html to the 4 AS/A-Level pacing files.
 * Run: node "Teachers Hub/patch-asalevel.js"
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// Per-subject config
const SUBJECTS = [
  {
    file: 'asalevel-math-pacing.html',
    lsKey: 'asalevel_math_exam_dates',
    papers: [
      { id: 'paper1', label: 'Paper 1 (Pure 1)', type: 'date' },
      { id: 'paper2', label: 'Paper 2 (Pure 2)', type: 'date' },
      { id: 'paper3', label: 'Paper 3 (Statistics/Mechanics)', type: 'date' },
    ],
    examDialogMsg: 'Enter Cambridge AS & A Level Mathematics 9709 exam dates (leave blank to skip).',
    paperChips: `
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper2' },`,
    saveExamDates: `  if (res.paper1) examDates.paper1 = res.paper1;
  if (res.paper2) examDates.paper2 = res.paper2;
  if (res.paper3) examDates.paper3 = res.paper3;`,
  },
  {
    file: 'asalevel-biology-pacing.html',
    lsKey: 'asalevel_biology_exam_dates',
    papers: [
      { id: 'paper1', label: 'Paper 1', type: 'date' },
      { id: 'paper2', label: 'Paper 2', type: 'date' },
      { id: 'paper3', label: 'Paper 3', type: 'date' },
      { id: 'paper4', label: 'Paper 4 (A2)', type: 'date' },
    ],
    examDialogMsg: 'Enter Cambridge AS & A Level Biology 9700 exam dates (leave blank to skip).',
    paperChips: `
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper4' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },`,
    saveExamDates: `  if (res.paper1) examDates.paper1 = res.paper1;
  if (res.paper2) examDates.paper2 = res.paper2;
  if (res.paper3) examDates.paper3 = res.paper3;
  if (res.paper4) examDates.paper4 = res.paper4;`,
  },
  {
    file: 'asalevel-chemistry-pacing.html',
    lsKey: 'asalevel_chemistry_exam_dates',
    papers: [
      { id: 'paper1', label: 'Paper 1', type: 'date' },
      { id: 'paper2', label: 'Paper 2', type: 'date' },
      { id: 'paper3', label: 'Paper 3', type: 'date' },
      { id: 'paper4', label: 'Paper 4 (A2)', type: 'date' },
    ],
    examDialogMsg: 'Enter Cambridge AS & A Level Chemistry 9701 exam dates (leave blank to skip).',
    paperChips: `
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper4' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },`,
    saveExamDates: `  if (res.paper1) examDates.paper1 = res.paper1;
  if (res.paper2) examDates.paper2 = res.paper2;
  if (res.paper3) examDates.paper3 = res.paper3;
  if (res.paper4) examDates.paper4 = res.paper4;`,
  },
  {
    file: 'asalevel-physics-pacing.html',
    lsKey: 'asalevel_physics_exam_dates',
    papers: [
      { id: 'paper1', label: 'Paper 1', type: 'date' },
      { id: 'paper2', label: 'Paper 2', type: 'date' },
      { id: 'paper3', label: 'Paper 3', type: 'date' },
      { id: 'paper4', label: 'Paper 4 (A2)', type: 'date' },
    ],
    examDialogMsg: 'Enter Cambridge AS & A Level Physics 9702 exam dates (leave blank to skip).',
    paperChips: `
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper4' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },`,
    saveExamDates: `  if (res.paper1) examDates.paper1 = res.paper1;
  if (res.paper2) examDates.paper2 = res.paper2;
  if (res.paper3) examDates.paper3 = res.paper3;
  if (res.paper4) examDates.paper4 = res.paper4;`,
  },
];

// ─── CSS blocks to add before </style> (before navbar.js script) ────────────

const NEW_CSS = `
/* ─── IYI-1: Weekly saat büyük ve belirgin ─────── */
.week-hours-tag {
  font-size: .88rem !important;
  font-family: 'DM Mono', monospace;
  font-weight: 700 !important;
  background: rgba(255,255,255,.22) !important;
  padding: 3px 9px !important; border-radius: 6px;
  letter-spacing: .02em;
}
.week-card-head { padding: 10px 16px !important; }

/* ─── EXAM COUNTDOWN BANNER ────────────────────── */
.exam-countdown-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 24px; background: #fff8e6;
  border-bottom: 1px solid #f0dea0;
  font-size: .72rem;
}
.exam-countdown-bar.danger-zone { background: #fff0f0; border-color: #f5c6c1; }
.exam-countdown-label { font-weight: 700; color: var(--ink-3); font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; flex-shrink: 0; }
.exam-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 100px;
  font-size: .68rem; font-weight: 600; cursor: default;
  border: 1px solid;
}
.exam-chip.paper1 { background: #f2ecfb; color: #6c3fa0; border-color: #d5c3f0; }
.exam-chip.paper2 { background: var(--blue-2); color: var(--blue); border-color: #c2d8f5; }
.exam-chip.paper4 { background: #fff8e6; color: #b45309; border-color: #f0dea0; }
.exam-chip.danger { background: #fff0f0; color: var(--accent); border-color: #f5c6c1; }
.exam-chip-days { font-family: 'DM Mono', monospace; font-size: .82rem; font-weight: 700; }
.exam-chip-label { font-weight: 500; }
.exam-countdown-uncovered {
  margin-left: auto; display: flex; align-items: center; gap: 4px;
  font-size: .68rem; color: var(--accent); font-weight: 600; white-space: nowrap;
}
.exam-manage-btn {
  background: none; border: 1px solid var(--border); border-radius: 5px;
  font-size: .65rem; color: var(--ink-3); padding: 2px 8px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; transition: all .12s; white-space: nowrap;
}
.exam-manage-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-2); }

/* ─── DIAGNOSTIC TAG ────────────────────────────── */
.diag-btn {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: .6rem; font-weight: 600; padding: 2px 7px;
  border-radius: 100px; border: 1px solid var(--border);
  background: var(--paper); color: var(--ink-3);
  cursor: pointer; transition: all .12s; flex-shrink: 0;
  position: relative;
}
.diag-btn:hover { border-color: var(--ink-2); color: var(--ink); }
.diag-btn.diag-weak    { background: #fff0f0; color: var(--accent); border-color: #f5c6c1; }
.diag-btn.diag-review  { background: #fff8e6; color: #b45309; border-color: #f0dea0; }
.diag-btn.diag-good    { background: #e6f5ed; color: #1e7a4a; border: 1px solid #b6e4c8; }
.diag-dropdown {
  position: absolute; bottom: calc(100% + 4px); left: 0; z-index: 500;
  background: white; border: 1px solid var(--border);
  border-radius: 8px; box-shadow: var(--shadow);
  padding: 4px; min-width: 170px; display: none;
}
.diag-dropdown.open { display: block; }
.diag-dd-item {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 10px; border-radius: 5px;
  font-size: .72rem; font-weight: 500; cursor: pointer;
  transition: background .1s; white-space: nowrap;
}
.diag-dd-item:hover { background: var(--paper); }
.diag-dd-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.diag-dd-dot.weak   { background: var(--accent); }
.diag-dd-dot.review { background: #d97706; }
.diag-dd-dot.good   { background: var(--green); }
.diag-dd-dot.clear  { background: var(--border); }

/* ─── COORDINATOR PUBLIC NOTE ───────────────────── */
.coord-note-row td { padding: 0 !important; border-bottom: 1px solid var(--border) !important; }
.coord-note-panel {
  padding: 8px 18px 10px;
  background: #f6f0fc;
  border-bottom: 1px dashed #d5c3f0;
}
.coord-note-header {
  display: flex; align-items: center; gap: 6px;
  font-size: .6rem; font-weight: 700; color: #6c3fa0;
  text-transform: uppercase; letter-spacing: .07em;
  margin-bottom: 5px;
}
.coord-note-text {
  font-size: .78rem; color: #4a2d7a; line-height: 1.55;
  white-space: pre-wrap;
}
.coord-note-textarea {
  width: 100%; min-height: 56px; resize: vertical;
  font-family: 'DM Sans', sans-serif; font-size: .78rem;
  line-height: 1.55; color: var(--ink);
  border: 1px solid #d5c3f0; border-radius: 6px;
  padding: 7px 9px; background: white; outline: none;
  transition: border-color .12s;
}
.coord-note-textarea:focus { border-color: #9b72d0; }
.coord-note-actions { display: flex; gap: 6px; margin-top: 5px; }
.coord-note-save {
  font-family: 'DM Sans', sans-serif; font-size: .7rem;
  padding: 3px 11px; border-radius: 5px;
  background: #6c3fa0; color: white; border: none; cursor: pointer;
}
.coord-note-save:hover { background: #5a3380; }
.coord-note-cancel {
  font-family: 'DM Sans', sans-serif; font-size: .7rem;
  padding: 3px 8px; border-radius: 5px;
  background: none; border: 1px solid #d5c3f0; color: #6c3fa0; cursor: pointer;
}
.coord-btn {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: .6rem; font-weight: 600; padding: 2px 7px;
  border-radius: 100px; border: 1px solid #d5c3f0;
  background: #f2ecfb; color: #6c3fa0;
  cursor: pointer; transition: all .12s; flex-shrink: 0;
}
.coord-btn:hover { background: #e5d9f8; border-color: #9b72d0; }
.coord-btn.has-coord { background: #9b72d0; color: white; border-color: #9b72d0; }
/* only admins can edit coord notes */
.coord-note-textarea, .coord-note-actions { display: none; }
.admin-mode .coord-note-textarea, .admin-mode .coord-note-actions { display: flex; }
.admin-mode .coord-note-textarea { display: block; }

/* ─── ACTUAL HOURS TRACKING ─────────────────────── */
.actual-hours-meta {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .62rem; font-weight: 600; padding: 2px 7px;
  border-radius: 100px; border: 1px dashed var(--border);
  background: var(--paper); color: var(--ink-3); flex-shrink: 0; cursor: pointer;
  transition: all .12s;
}
.actual-hours-meta:hover { border-color: var(--ink-2); color: var(--ink); }
.actual-hours-meta.over  { background: #fff0f0; color: var(--accent); border-color: #f5c6c1; border-style: solid; }
.actual-hours-meta.under { background: #e6f5ed; color: #1e7a4a; border-color: #b6e4c8; border-style: solid; }
.actual-hours-meta.match { background: var(--green-2); color: var(--green); border-color: #b6e4c8; border-style: solid; }
.actual-inp {
  width: 30px; font-family: 'DM Mono', monospace; font-size: .7rem;
  border: none; background: transparent; color: inherit;
  outline: none; text-align: center; padding: 0;
  -moz-appearance: textfield; appearance: textfield;
}
.actual-inp::-webkit-inner-spin-button { display: none; }

/* ─── SAVE FEEDBACK FLASH ───────────────────────── */
@keyframes saveFlashOk {
  0%,100% { box-shadow: none; }
  25%  { box-shadow: inset 0 0 0 2px rgba(30,122,74,.55); background: #f0faf5 !important; }
}
@keyframes saveFlashFail {
  0%,100% { box-shadow: none; }
  25%  { box-shadow: inset 0 0 0 2px rgba(192,57,43,.55); background: #fff4f4 !important; }
}
.editable.save-ok   { animation: saveFlashOk   1.1s ease; border-radius: 4px; }
.editable.save-fail { animation: saveFlashFail 1.1s ease; border-radius: 4px; }

/* ─── SEARCH RESULT COUNT ───────────────────────── */
.search-result-count {
  font-size: .65rem; color: var(--ink-3); padding: 4px 0 0 2px;
  font-weight: 500; min-height: 16px;
}
.search-result-count.has-results { color: var(--accent); font-weight: 600; }

/* ─── VARIANCE REPORT (panel) ───────────────────── */
#panel-variance { padding: 20px 24px; }
.variance-summary {
  display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
}
.var-stat {
  flex: 1; min-width: 110px;
  background: white; border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 18px;
  box-shadow: var(--shadow-sm);
}
.var-stat-num { font-size: 1.5rem; font-weight: 700; line-height: 1; color: var(--ink); }
.var-stat-label { font-size: .65rem; color: var(--ink-3); margin-top: 4px; font-weight: 500; }
.var-stat.over  .var-stat-num { color: var(--accent); }
.var-stat.under .var-stat-num { color: var(--green); }
.var-stat.ok    .var-stat-num { color: #b45309; }
.variance-table {
  width: 100%; border-collapse: collapse;
  background: white; border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.variance-table th {
  font-size: .62rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  color: var(--ink-3); padding: 9px 14px; text-align: left;
  border-bottom: 1px solid var(--border); background: #fafaf8;
}
.variance-table td {
  padding: 9px 14px; border-bottom: 1px solid var(--border);
  font-size: .8rem; vertical-align: middle;
}
.variance-table tr:last-child td { border-bottom: none; }
.var-diff-badge {
  font-size: .65rem; font-weight: 700; padding: 2px 8px;
  border-radius: 100px; white-space: nowrap;
}
.var-diff-badge.over   { background: #fff0f0; color: var(--accent); border: 1px solid #f5c6c1; }
.var-diff-badge.under  { background: #e6f5ed; color: var(--green); border: 1px solid #b6e4c8; }
.var-diff-badge.match  { background: var(--paper-2); color: var(--ink-2); border: 1px solid var(--border); }
`;

// ─── NEW JS to inject before function saveState() ──────────────────────────

function buildNewJS(subj) {
  const paperFields = subj.papers.map(p => `      { id: '${p.id}', label: '${p.label}', type: '${p.type}', val: examDates.${p.id} || '' },`).join('\n');

  return `
// -----------------------------------------------------------
// EXAM COUNTDOWN
// -----------------------------------------------------------
function renderExamCountdown() {
  const bar = document.getElementById('examCountdownBar');
  if (!bar) return;
  const chips = document.getElementById('examChipsWrap');
  const warn  = document.getElementById('examUncoveredWarn');
  if (!chips) return;

  const papers = [${subj.paperChips}
  ];
  const now = new Date();
  let anyDate = false;
  let minDays = Infinity;

  chips.innerHTML = papers.map(p => {
    const d = examDates[p.key];
    if (!d) return '';
    anyDate = true;
    const target = new Date(d);
    const diffMs = target - now;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < minDays) minDays = days;
    const isDanger = days <= 30 && days >= 0;
    const cls = isDanger ? 'danger' : p.cls;
    const label = days < 0 ? 'Passed' : days === 0 ? 'TODAY' : days + 'd';
    return \`<span class="exam-chip \${cls}" title="\${p.label}: \${d}"><span class="exam-chip-days">\${label}</span><span class="exam-chip-label">\${p.label}</span></span>\`;
  }).join('');

  if (!anyDate) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.classList.toggle('danger-zone', minDays <= 30 && minDays >= 0);

  const uncovered = DATA.reduce((n, ch) => n + ch.topics.filter(t => t.status !== 'done').length, 0);
  if (warn) {
    if (uncovered > 0 && minDays > 0 && minDays <= 60) {
      warn.textContent = '\\u26a0 ' + uncovered + ' topics not yet done';
      warn.style.display = 'flex';
    } else {
      warn.style.display = 'none';
    }
  }
}

async function manageExamDates() {
  const res = await _showCm({
    title: 'Set Cambridge Exam Dates',
    msg: '${subj.examDialogMsg}',
    fields: [
${paperFields}
    ],
    okLabel: 'Save Dates',
  });
  if (!res) return;
${subj.saveExamDates}
  localStorage.setItem('${subj.lsKey}', JSON.stringify(examDates));
  renderExamCountdown();
  showToast('Exam dates saved');
}

// -----------------------------------------------------------
// DIAGNOSTIC TAG
// -----------------------------------------------------------
const DIAG_LABELS = { weak: '\\u26a0 Weak', review: '\\u21ba Review', good: '\\u2713 Good', '': 'Diagnose' };

function renderDiagBtn(ci, ti, t) {
  const d = t.diag || '';
  const cls = d ? 'diag-btn diag-' + d : 'diag-btn';
  const label = DIAG_LABELS[d] || 'Diagnose';
  return \`<div style="position:relative;display:inline-block">
    <button class="\${cls}" id="diag-btn-\${ci}-\${ti}" onclick="toggleDiagMenu(\${ci},\${ti},event)" title="Set diagnostic tag for this topic">\${label}</button>
    <div class="diag-dropdown" id="diag-dd-\${ci}-\${ti}">
      <div class="diag-dd-item" onclick="setDiag(\${ci},\${ti},'weak')"><span class="diag-dd-dot weak"></span>Weak \\u2014 needs reteaching</div>
      <div class="diag-dd-item" onclick="setDiag(\${ci},\${ti},'review')"><span class="diag-dd-dot review"></span>Review \\u2014 revisit briefly</div>
      <div class="diag-dd-item" onclick="setDiag(\${ci},\${ti},'good')"><span class="diag-dd-dot good"></span>Good \\u2014 class mastered it</div>
      <div class="diag-dd-item" onclick="setDiag(\${ci},\${ti},'')"><span class="diag-dd-dot clear"></span>Clear tag</div>
    </div>
  </div>\`;
}

function toggleDiagMenu(ci, ti, e) {
  e.stopPropagation();
  document.querySelectorAll('.diag-dropdown.open').forEach(el => {
    if (el.id !== \`diag-dd-\${ci}-\${ti}\`) el.classList.remove('open');
  });
  const dd = document.getElementById(\`diag-dd-\${ci}-\${ti}\`);
  if (dd) dd.classList.toggle('open');
}

function setDiag(ci, ti, val) {
  DATA[ci].topics[ti].diag = val;
  const dd = document.getElementById(\`diag-dd-\${ci}-\${ti}\`);
  if (dd) dd.classList.remove('open');
  saveState();
  const btn = document.getElementById(\`diag-btn-\${ci}-\${ti}\`);
  if (btn) {
    btn.className = val ? 'diag-btn diag-' + val : 'diag-btn';
    btn.textContent = DIAG_LABELS[val] || 'Diagnose';
  }
  showToast(val ? 'Diagnostic tag: ' + (DIAG_LABELS[val]||val) : 'Tag cleared');
}

// Close diag dropdown on outside click
document.addEventListener('click', () => {
  document.querySelectorAll('.diag-dropdown.open').forEach(el => el.classList.remove('open'));
});

// -----------------------------------------------------------
// COORDINATOR PUBLIC NOTE
// -----------------------------------------------------------
function renderCoordNoteRow(ci, ti, t) {
  const hasNote = !!(t.coordNote && t.coordNote.trim());
  if (!hasNote && role !== 'admin') return '';
  return \`<tr class="coord-note-row" id="coord-row-\${ci}-\${ti}">
    <td colspan="2">
      <div class="coord-note-panel">
        <div class="coord-note-header">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Coordinator Note
        </div>
        \${role === 'admin'
          ? \`<textarea class="coord-note-textarea" id="coord-ta-\${ci}-\${ti}" placeholder="Write a shared note visible to all teachers...">\${escHtml(t.coordNote || '')}</textarea>
             <div class="coord-note-actions">
               <button class="coord-note-save" onclick="saveCoordNote(\${ci},\${ti})">Save Note</button>
               <button class="coord-note-cancel" onclick="clearCoordNote(\${ci},\${ti})">Clear</button>
             </div>\`
          : \`<div class="coord-note-text">\${escHtml(t.coordNote || '')}</div>\`
        }
      </div>
    </td>
  </tr>\`;
}

function saveCoordNote(ci, ti) {
  const ta = document.getElementById(\`coord-ta-\${ci}-\${ti}\`);
  if (!ta) return;
  DATA[ci].topics[ti].coordNote = ta.value.trim();
  saveState();
  showToast('Coordinator note saved');
  render();
}

function clearCoordNote(ci, ti) {
  DATA[ci].topics[ti].coordNote = '';
  saveState();
  showToast('Coordinator note cleared');
  render();
}

function toggleCoordNote(ci, ti) {
  const row = document.getElementById(\`coord-row-\${ci}-\${ti}\`);
  if (row) {
    row.style.display = row.style.display === 'none' ? '' : 'none';
  }
}

// -----------------------------------------------------------
// ACTUAL HOURS + VARIANCE REPORT
// -----------------------------------------------------------
function renderActualHoursMeta(ci, ti, t) {
  const planned = t.hour || 1;
  const actual  = t.actualHour || null;
  let cls = '';
  let diffLabel = '';
  if (actual !== null) {
    const diff = actual - planned;
    if (diff > 0)       { cls = 'over';  diffLabel = '+' + diff + 'h'; }
    else if (diff < 0)  { cls = 'under'; diffLabel = diff + 'h'; }
    else                { cls = 'match'; diffLabel = '\\u2713'; }
  }
  return \`<span class="actual-hours-meta \${cls}" title="Actual lesson hours spent">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
    Actual:
    <input class="actual-inp" type="number" min="0" max="99" value="\${actual !== null ? actual : ''}"
      placeholder="\\u2014"
      onchange="setActualHours(\${ci},\${ti},this.value)"
      onclick="event.stopPropagation()"
      title="Actual hours spent on this topic">h
    \${diffLabel ? \`<span style="font-size:.6rem;opacity:.8">(\${diffLabel})</span>\` : ''}
  </span>\`;
}

function setActualHours(ci, ti, val) {
  const n = parseInt(val);
  DATA[ci].topics[ti].actualHour = isNaN(n) || n < 0 ? null : n;
  saveState();
  const wrap = document.querySelector(\`#row-\${ci}-\${ti} .actual-hours-meta\`);
  if (wrap) {
    const t = DATA[ci].topics[ti];
    const planned = t.hour || 1;
    const actual  = t.actualHour;
    if (actual !== null) {
      const diff = actual - planned;
      wrap.className = 'actual-hours-meta ' + (diff > 0 ? 'over' : diff < 0 ? 'under' : 'match');
    }
  }
  showToast('Actual hours updated');
}

function renderVariance() {
  const el = document.getElementById('varianceReport');
  if (!el) return;

  const rows = [];
  let totalPlanned = 0, totalActual = 0, overCount = 0, underCount = 0, matchCount = 0;

  DATA.forEach((ch, ci) => {
    ch.topics.forEach((t, ti) => {
      if (t.actualHour === null || t.actualHour === undefined) return;
      const planned = t.hour || 1;
      const actual  = t.actualHour;
      const diff    = actual - planned;
      totalPlanned += planned;
      totalActual  += actual;
      if (diff > 0) overCount++;
      else if (diff < 0) underCount++;
      else matchCount++;
      rows.push({ ch: ch.chapter, topic: t.topic, planned, actual, diff, ci, ti });
    });
  });

  if (!rows.length) {
    el.innerHTML = '<div class="empty" style="padding:40px 0"><p style="font-weight:500;color:var(--ink-2);margin-bottom:6px">No actual hours recorded yet</p><p style="font-size:.75rem;color:var(--ink-3);line-height:1.6">Teachers can log actual lesson hours on each topic in the Pacing Guide view.<br>Use the <strong>Actual: \\u2014h</strong> field next to each topic\\'s planned hours.</p></div>';
    return;
  }

  const totalDiff = totalActual - totalPlanned;
  el.innerHTML = '<div class="variance-summary">' +
    '<div class="var-stat"><div class="var-stat-num">' + totalPlanned + 'h</div><div class="var-stat-label">Total Planned</div></div>' +
    '<div class="var-stat ' + (totalDiff > 0 ? 'over' : totalDiff < 0 ? 'under' : 'ok') + '"><div class="var-stat-num">' + totalActual + 'h</div><div class="var-stat-label">Total Actual' + (totalDiff !== 0 ? ' (' + (totalDiff > 0 ? '+' : '') + totalDiff + 'h)' : '') + '</div></div>' +
    '<div class="var-stat over"><div class="var-stat-num">' + overCount + '</div><div class="var-stat-label">Over planned</div></div>' +
    '<div class="var-stat under"><div class="var-stat-num">' + underCount + '</div><div class="var-stat-label">Under planned</div></div>' +
    '<div class="var-stat ok"><div class="var-stat-num">' + matchCount + '</div><div class="var-stat-label">On target</div></div>' +
    '</div>' +
    '<table class="variance-table"><thead><tr><th>Chapter</th><th>Topic</th><th style="width:80px;text-align:center">Planned</th><th style="width:80px;text-align:center">Actual</th><th style="width:100px">Variance</th></tr></thead><tbody>' +
    rows.map(r => {
      const cls = r.diff > 0 ? 'over' : r.diff < 0 ? 'under' : 'match';
      const lbl = r.diff > 0 ? '+' + r.diff + 'h over' : r.diff < 0 ? Math.abs(r.diff) + 'h under' : 'On target';
      return '<tr><td style="font-size:.72rem;color:var(--ink-3)">' + escHtml(r.ch.replace(/^\\d+\\.\\s*/,'').substring(0,30)) + '</td><td><a style="color:var(--ink);font-weight:500;cursor:pointer;text-decoration:none" onclick="scrollToChapter(' + r.ci + ')">' + escHtml(r.topic) + '</a></td><td style="text-align:center;font-family:\'DM Mono\',monospace">' + r.planned + 'h</td><td style="text-align:center;font-family:\'DM Mono\',monospace;font-weight:600">' + r.actual + 'h</td><td><span class="var-diff-badge ' + cls + '">' + lbl + '</span></td></tr>';
    }).join('') +
    '</tbody></table>';
}

function updateSearchResultCount(topicCount, clear) {
  const el = document.getElementById('searchResultCount');
  if (!el) return;
  if (clear || !searchQ) { el.textContent = ''; el.className = 'search-result-count'; return; }
  const chCount = DATA.filter(ch => ch.topics.some(t => {
    const q = searchQ.toLowerCase();
    return t.topic.toLowerCase().includes(q) || (t.objective||'').toLowerCase().includes(q);
  })).length;
  if (topicCount === 0) {
    el.textContent = 'No results found';
    el.className = 'search-result-count has-results';
  } else {
    el.textContent = topicCount + ' topic' + (topicCount !== 1 ? 's' : '') + ' in ' + chCount + ' chapter' + (chCount !== 1 ? 's' : '');
    el.className = 'search-result-count has-results';
  }
}

`;
}

function r(str) {
  // Escape a literal string for use in a RegExp
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patch(subj) {
  const filePath = path.join(DIR, subj.file);
  let raw = fs.readFileSync(filePath, 'utf8');
  const isCRLF = raw.includes('\r\n');
  // Normalize to LF for processing
  let html = raw.replace(/\r\n/g, '\n');

  // 1. Add CSS before the last </style> that precedes <script src="partials/navbar.js">
  // Find the </style> + whitespace + <script src="partials/navbar.js"> pattern
  html = html.replace(
    '\n</style>\n\n<script src="partials/navbar.js">',
    NEW_CSS + '\n</style>\n\n<script src="partials/navbar.js">'
  );

  // 2. Add exam countdown banner HTML after </header>
  const examBannerHtml = `
<!-- -- EXAM COUNTDOWN BANNER ---------------------- -->
<div class="exam-countdown-bar" id="examCountdownBar" style="display:none">
  <span class="exam-countdown-label">Cambridge Exams:</span>
  <span id="examChipsWrap"></span>
  <span class="exam-countdown-uncovered" id="examUncoveredWarn" style="display:none"></span>
  <button class="exam-manage-btn" id="examManageBtn" onclick="manageExamDates()" title="Set Cambridge exam dates">&#9998; Set Dates</button>
</div>

`;
  // The header closes and then layout begins
  html = html.replace(
    '</header>\n\n<!-- \u2500\u2500 LAYOUT',
    '</header>\n' + examBannerHtml + '<!-- \u2500\u2500 LAYOUT'
  );

  // 3. Add "Hours Report" tab button
  html = html.replace(
    '<button class="tab-btn" onclick="switchView(\'coverage\',this)">Obj Coverage</button>\n      </div>',
    '<button class="tab-btn" onclick="switchView(\'coverage\',this)">Obj Coverage</button>\n        <button class="tab-btn" onclick="switchView(\'variance\',this)">Hours Report</button>\n      </div>'
  );

  // 4. Add variance panel after coverage panel
  const variancePanelHtml = `    <!-- VARIANCE / HOURS REPORT PANEL -->
    <div class="panel" id="panel-variance">
      <div id="varianceReport"></div>
    </div>

`;
  html = html.replace(
    '    <!-- COVERAGE PANEL -->\n    <div class="panel" id="panel-coverage">\n      <div id="coverageReport"></div>\n    </div>\n\n\n\n    <!-- WEEKLY PANEL -->',
    '    <!-- COVERAGE PANEL -->\n    <div class="panel" id="panel-coverage">\n      <div id="coverageReport"></div>\n    </div>\n\n' + variancePanelHtml + '    <!-- WEEKLY PANEL -->'
  );

  // 5. Add search result count div after searchClear button
  html = html.replace(
    '<button class="search-clear" id="searchClear" onclick="clearSearch()" title="Clear">&#215;</button>\n      </div>',
    '<button class="search-clear" id="searchClear" onclick="clearSearch()" title="Clear">&#215;</button>\n      </div>\n      <div class="search-result-count" id="searchResultCount"></div>'
  );

  // 6. Fix classSelectorWrap: remove style="display:none"
  html = html.replace(
    '<div class="class-selector-wrap" id="classSelectorWrap" style="display:none">',
    '<div class="class-selector-wrap" id="classSelectorWrap">'
  );

  // 7. Add examDates var to STATE section (after 'let searchQ')
  // In the state block
  const stateInsertAfter = `let filterStatus = 'all';\nlet searchQ      = '';`;
  const examDatesLine = `\n\n// Cambridge Exam Dates — stored in localStorage (per-browser, admin-set)\nvar examDates = JSON.parse(localStorage.getItem('${subj.lsKey}') || 'null') || {};`;
  if (!html.includes(subj.lsKey)) {
    html = html.replace(stateInsertAfter, stateInsertAfter + examDatesLine);
  }

  // 8. Add new JS functions before function saveState()
  const newJS = buildNewJS(subj);
  const saveStateMarker = '// -----------------------------------------------------------\n// PERSIST - delegates to Firebase module\n// -----------------------------------------------------------\nfunction saveState() {\n  if (window.__fbSaveState) window.__fbSaveState(DATA);\n}';
  if (html.includes(saveStateMarker) && !html.includes('function renderExamCountdown()')) {
    html = html.replace(saveStateMarker, newJS + saveStateMarker);
  }

  // 9. Update saveState() to return promise
  html = html.replace(
    'function saveState() {\n  if (window.__fbSaveState) window.__fbSaveState(DATA);\n}',
    'function saveState() {\n  if (window.__fbSaveState) return window.__fbSaveState(DATA);\n  return Promise.resolve();\n}'
  );

  // 10. Update saveEdit() to have flash feedback (replace the simple version)
  const oldSaveEdit = `function saveEdit(el, ci, ti, field) {
  if (role !== 'admin') return;
  let val = el.innerText.trim();
  if (field === 'hour') val = parseInt(val) || DATA[ci].topics[ti].hour;
  DATA[ci].topics[ti][field] = val;
  saveState();
  showToast('Saved');
  setTimeout(render, 200);
}`;
  const newSaveEdit = `function saveEdit(el, ci, ti, field) {
  if (role !== 'admin') return;
  let val = el.innerText.trim();
  if (field === 'hour') val = parseInt(val) || DATA[ci].topics[ti].hour;
  DATA[ci].topics[ti][field] = val;

  // Visual save feedback
  el.classList.remove('save-ok', 'save-fail');
  void el.offsetWidth;
  el.classList.add('save-ok');
  setTimeout(() => el.classList.remove('save-ok'), 1200);

  if (window.__fbSaveState) {
    window.__fbSaveState(DATA).catch(() => {
      el.classList.remove('save-ok');
      el.classList.add('save-fail');
      setTimeout(() => el.classList.remove('save-fail'), 1200);
      showToast('Save failed \u2014 check connection');
    });
  }
}`;
  html = html.replace(oldSaveEdit, newSaveEdit);

  // 11. Update clearSearch to call updateSearchResultCount
  html = html.replace(
    `function clearSearch(){\n  var inp=document.getElementById('searchInput');\n  if(inp)inp.value='';\n  var clr=document.getElementById('searchClear');\n  if(clr)clr.classList.remove('visible');\n  searchQ='';\n  renderPacing();renderNav();\n}`,
    `function clearSearch(){\n  var inp=document.getElementById('searchInput');\n  if(inp)inp.value='';\n  var clr=document.getElementById('searchClear');\n  if(clr)clr.classList.remove('visible');\n  searchQ='';\n  renderPacing();renderNav();\n  updateSearchResultCount(0, true);\n}`
  );

  // 12. Update handleSearch to reset page maps
  html = html.replace(
    `let _searchDebounce;\nfunction handleSearch(val) {\n  searchQ = val;\n  const clrBtn = document.getElementById('searchClear');\n  if (clrBtn) clrBtn.classList.toggle('visible', val.length > 0);\n  clearTimeout(_searchDebounce);\n  _searchDebounce = setTimeout(() => { renderPacing(); renderNav(); }, 180);\n}`,
    `let _searchDebounce;\nfunction handleSearch(val) {\n  searchQ = val;\n  Object.keys(chPageMap).forEach(k => { chPageMap[k] = 0; });\n  const clrBtn = document.getElementById('searchClear');\n  if (clrBtn) clrBtn.classList.toggle('visible', val.length > 0);\n  clearTimeout(_searchDebounce);\n  _searchDebounce = setTimeout(() => { renderPacing(); renderNav(); }, 180);\n}`
  );

  // 13. Update renderPacing: "Lesson Hours: ${t.hour}" -> "Planned: ${t.hour}h"
  html = html.replace(/>Lesson Hours: \${t\.hour}<\/span>/g, '>Planned: ${t.hour}h</span>');

  // 14. Add renderActualHoursMeta after planned hours span in renderPacing
  // Look for the title="Hours" pattern  (asalevel files use "Lesson Hours" → now "Planned: ${t.hour}h")
  // In the meta-line div of renderPacing, after the planned hours editable span
  html = html.replace(
    `        title="Hours"\n                      >Planned: \${t.hour}h</span>\n                      \${t.week ? \`<span style="font-size:.64rem;font-weight:600`,
    `        title="Hours"\n                      >Planned: \${t.hour}h</span>\n                      \${renderActualHoursMeta(ci, ti, t)}\n                      \${t.week ? \`<span style="font-size:.64rem;font-weight:600`
  );

  // 15. Add renderDiagBtn and coord-btn after note-btn in meta-line
  // Find the note button in renderPacing
  const noteBtn = `<button class="note-btn\${t.note ? ' has-note' : ''}" onclick="toggleNote(\${ci},\${ti})" title="\${t.note ? 'Edit note' : 'Add teacher note'}">&#9998; \${t.note ? 'Note' : 'Add note'}</button>
                    </div>`;
  const noteBtnNew = `<button class="note-btn\${t.note ? ' has-note' : ''}" onclick="toggleNote(\${ci},\${ti})" title="\${t.note ? 'Edit note' : 'Add teacher note'}">&#9998; \${t.note ? 'Note' : 'Add note'}</button>
                      \${renderDiagBtn(ci, ti, t)}
                      \${(t.coordNote || role === 'admin') ? \`<button class="coord-btn\${t.coordNote ? ' has-coord' : ''}" onclick="toggleCoordNote(\${ci},\${ti})" title="Coordinator shared note">&#9432; \${t.coordNote ? 'Coord Note' : 'Add Coord Note'}</button>\` : ''}
                    </div>`;
  html = html.replace(noteBtn, noteBtnNew);

  // 16. Add renderCoordNoteRow after res-row (before note-row)
  const resRowEnd = `<tr class="res-row\${!hasRes && !t.activity ? ' empty-res' : ''}" id="res-row-\${ci}-\${ti}">
                  <td colspan="6">\${renderResourcesHtml(ci, ti, t)}</td>
                </tr>
                <tr class="note-row"`;
  const resRowEndNew = `<tr class="res-row\${!hasRes && !t.activity ? ' empty-res' : ''}" id="res-row-\${ci}-\${ti}">
                  <td colspan="6">\${renderResourcesHtml(ci, ti, t)}</td>
                </tr>
                \${renderCoordNoteRow(ci, ti, t)}
                <tr class="note-row"`;
  html = html.replace(resRowEnd, resRowEndNew);

  // 17. Add search count update in renderPacing after container.innerHTML = html
  html = html.replace(
    `  container.innerHTML = html;\n\n  // Paginator goes into the mount point`,
    `  container.innerHTML = html;\n\n  // Update search result count\n  if (searchQ) {\n    const totalMatchedTopics = DATA.reduce((n, ch) => n + ch.topics.filter(t => {\n      const q = searchQ.toLowerCase();\n      return t.topic.toLowerCase().includes(q) || (t.objective||'').toLowerCase().includes(q);\n    }).length, 0);\n    updateSearchResultCount(totalMatchedTopics, false);\n  } else {\n    updateSearchResultCount(0, true);\n  }\n\n  // Paginator goes into the mount point`
  );

  // 18. Update scrollToChapter to improved version
  const oldScrollToChapter = `function scrollToChapter(ci) {
  switchViewById('pacing');
  setTimeout(() => {
    const el = document.getElementById(\`ch-\${ci}\`);
    if (el) { el.classList.remove('collapsed'); el.scrollIntoView({behavior:'smooth', block:'start'}); }
  }, 50);
}`;
  const newScrollToChapter = `function scrollToChapter(ci) {
  // Switch to pacing tab (update button state too)
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('on'));
  const pacingTab = document.querySelector('.tab-btn[onclick*="pacing"]');
  if (pacingTab) pacingTab.classList.add('on');
  switchViewById('pacing');

  // Make sure chapter is on the visible page
  const filteredChIndices = DATA.map((ch, idx) => idx).filter(idx => {
    const ch = DATA[idx];
    if (filterYear !== 'all' && ch.year !== filterYear) return false;
    return ch.topics.length > 0;
  });
  const pos = filteredChIndices.indexOf(ci);
  if (pos >= 0) chapterPage = Math.floor(pos / getChapterPageSize());
  renderPacing();

  setTimeout(() => {
    const el = document.getElementById(\`ch-\${ci}\`);
    if (!el) return;
    el.classList.remove('collapsed');
    el.style.transition = 'box-shadow .2s';
    el.style.boxShadow = '0 0 0 3px rgba(192,57,43,.35)';
    setTimeout(() => { el.style.boxShadow = ''; }, 1200);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}`;
  html = html.replace(oldScrollToChapter, newScrollToChapter);

  // 19. Update buildClassSelector to always visible + empty hint
  const oldBuildClassSelector = `function buildClassSelector() {
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
}`;
  const newBuildClassSelector = `function buildClassSelector() {
  const wrap   = document.getElementById('classSelectorWrap');
  const select = document.getElementById('classSelect');
  const manBtn = document.getElementById('classManageBtn');
  if (!wrap || !select) return;

  // Always visible
  wrap.style.display = 'flex';
  if (manBtn) manBtn.style.display = role === 'admin' ? '' : 'none';

  // Rebuild options
  if (classList.length === 0) {
    select.innerHTML = '<option value="default">All Classes</option>';
    if (role === 'admin') {
      const hint = document.createElement('option');
      hint.value = ''; hint.disabled = true;
      hint.textContent = '\u2014 click \u2699 to add classes \u2014';
      select.appendChild(hint);
    }
  } else {
    select.innerHTML = '<option value="default">All Classes</option>';
    classList.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = cls;
      if (cls === currentClass) opt.selected = true;
      select.appendChild(opt);
    });
  }
  if (currentClass === 'default') select.value = 'default';
}`;
  html = html.replace(oldBuildClassSelector, newBuildClassSelector);

  // 20. Update render() to add renderExamCountdown and renderVariance
  html = html.replace(
    `function render() {
  renderProgress();
  renderPaceSummary();
  renderNav();
  renderPacing();
  renderWeekly();
  renderCoverage();
}`,
    `function render() {
  renderProgress();
  renderPaceSummary();
  renderExamCountdown();
  renderNav();
  renderPacing();
  renderWeekly();
  renderCoverage();
  renderVariance();
}`
  );

  // 21. Add closeSidebar() if missing
  if (!html.includes('function closeSidebar()')) {
    html = html.replace(
      '// Re-render on resize so gallery cols and page size stay correct',
      `function closeSidebar() {
  const layout = document.getElementById('appLayout');
  if (layout && window.innerWidth <= 768) layout.classList.add('sidebar-collapsed');
}

// Re-render on resize so gallery cols and page size stay correct`
    );
  }

  // 22. Add Escape key handler if missing
  if (!html.includes('closeSidebar()') || !html.includes("e.key === 'Escape'")) {
    html = html.replace(
      `document.addEventListener('keydown', function(e) {
  if (e.key==='Enter' && document.getElementById('cmModal').classList.contains('open')) {`,
      `document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('objModal').classList.remove('open');
    if (document.getElementById('cmModal').classList.contains('open')) _cmDone(false);
    closeSidebar();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key==='Enter' && document.getElementById('cmModal').classList.contains('open')) {`
    );
  }

  // 23. Fix Firebase _mergeAndRender to include diag and actualHour
  const oldMerge = `window.DATA = sharedStructure.map((ch, ci) => ({
    ...ch,
    topics: ch.topics.map((t, ti) => ({
      ...t,
      status: userStatuses[\`\${ci}-\${ti}\`] || 'pending',
      note:   userStatuses[\`note-\${ci}-\${ti}\`]  || '',
    })),
  }));`;
  const newMerge = `window.DATA = sharedStructure.map((ch, ci) => ({
    ...ch,
    topics: ch.topics.map((t, ti) => ({
      ...t,
      status:     userStatuses[\`\${ci}-\${ti}\`]           || 'pending',
      note:       userStatuses[\`note-\${ci}-\${ti}\`]       || '',
      diag:       userStatuses[\`diag-\${ci}-\${ti}\`]       || '',
      actualHour: userStatuses[\`actual-\${ci}-\${ti}\`] != null
                    ? Number(userStatuses[\`actual-\${ci}-\${ti}\`]) : null,
      // coordNote comes from sharedStructure (admin-written, same for all users)
    })),
  }));`;
  html = html.replace(oldMerge, newMerge);

  // 24. Fix Firebase __fbSaveState forEach to save diag and actualHour
  const oldForEach = `  data.forEach((ch, ci) => {
    ch.topics.forEach((t, ti) => {
      if (t.status && t.status !== 'pending') {
        newStatuses[\`\${ci}-\${ti}\`] = t.status;
      }
      if (t.note && t.note.trim()) {
        newStatuses[\`note-\${ci}-\${ti}\`] = t.note.trim();
      }
    });
  });`;
  const newForEach = `  data.forEach((ch, ci) => {
    ch.topics.forEach((t, ti) => {
      if (t.status && t.status !== 'pending') {
        newStatuses[\`\${ci}-\${ti}\`] = t.status;
      }
      if (t.note && t.note.trim()) {
        newStatuses[\`note-\${ci}-\${ti}\`] = t.note.trim();
      }
      if (t.diag && t.diag.trim()) {
        newStatuses[\`diag-\${ci}-\${ti}\`] = t.diag.trim();
      }
      if (t.actualHour !== null && t.actualHour !== undefined) {
        newStatuses[\`actual-\${ci}-\${ti}\`] = t.actualHour;
      }
    });
  });`;
  html = html.replace(oldForEach, newForEach);

  // 25. Fix Firebase __fbSaveState structureOnly to strip diag, actualHour
  html = html.replace(
    `      topics: ch.topics.map(({ status, note, ...rest }) => rest),`,
    `      topics: ch.topics.map(({ status, note, diag, actualHour, ...rest }) => rest),`
  );

  // 26. Fix asalevel-math broken snapshot handler (missing closing brace)
  if (subj.file === 'asalevel-math-pacing.html') {
    // The structure listener is malformed - fix it
    html = html.replace(
      `  // Load class list from structure meta
    if (snap.exists() && Array.isArray(snap.data().classes)) {
      classList = snap.data().classes;
    \n\n  // Fallback: if Firestore snapshots don't return within 8s, unblock the UI
  const _loadTimeout = setTimeout(() => {
    if (!structureReady || !progressReady) {
      sharedStructure = sharedStructure || [];
      userStatuses    = userStatuses    || {};
      structureReady  = true;
      progressReady   = true;
      document.getElementById('loadingScreen').style.display = 'none';
      applyRole(appRole);
    }
  }, 8000);
}
    structureReady = true;
    tryRender();`,
      `  // Load class list from structure meta
    if (snap.exists() && Array.isArray(snap.data().classes)) {
      classList = snap.data().classes;
    }
    structureReady = true;
    tryRender();`
    );

    // Add fallback timeout if now missing from the math file
    if (!html.includes("// Fallback: if Firestore snapshots don't return within 8s")) {
      html = html.replace(
        `  // -- Per-user progress listener --`,
        `  // Fallback: if Firestore snapshots don't return within 8s, unblock the UI
  setTimeout(() => {
    if (!structureReady || !progressReady) {
      sharedStructure = sharedStructure || [];
      userStatuses    = userStatuses    || {};
      structureReady  = true;
      progressReady   = true;
      const _ls = document.getElementById('loadingScreen'); if (_ls) _ls.style.display = 'none';
      applyRole(appRole);
    }
  }, 8000);

  // -- Per-user progress listener --`
      );
    }
  }

  // Restore CRLF if original was CRLF
  if (isCRLF) html = html.replace(/\n/g, '\r\n');

  // Verify key items
  const checks = [
    ['exam-countdown-bar', 'Exam countdown bar HTML'],
    ['panel-variance', 'Variance panel HTML'],
    ['searchResultCount', 'Search result count HTML'],
    ['renderExamCountdown', 'renderExamCountdown function'],
    ['renderVariance', 'renderVariance function'],
    ['renderDiagBtn', 'renderDiagBtn function'],
    ['renderCoordNoteRow', 'renderCoordNoteRow function'],
    ['renderActualHoursMeta', 'renderActualHoursMeta function'],
    ['updateSearchResultCount', 'updateSearchResultCount function'],
    ['closeSidebar', 'closeSidebar function'],
    [subj.lsKey, 'localStorage key'],
    ['week-hours-tag', 'week-hours-tag CSS'],
    ['.exam-countdown-bar', 'exam countdown CSS'],
    ['.diag-btn', 'diag-btn CSS'],
    ['.coord-note-row', 'coord-note CSS'],
    ['.actual-hours-meta', 'actual-hours CSS'],
    ['saveFlashOk', 'saveFlash CSS'],
    ['.variance-table', 'variance-table CSS'],
    ['renderVariance();', 'renderVariance call in render()'],
    ['renderExamCountdown();', 'renderExamCountdown call in render()'],
    ['diag-', 'diag fields in _mergeAndRender'],
    ['actualHour', 'actualHour in _mergeAndRender'],
    ['Hours Report', 'Hours Report tab button'],
    ['Planned: ${t.hour}h', 'Planned hours label'],
  ];

  let allOk = true;
  const failures = [];
  checks.forEach(([needle, desc]) => {
    if (!html.includes(needle)) {
      failures.push(`  MISSING: ${desc} (${needle})`);
      allOk = false;
    }
  });

  failures.forEach(f => console.error(f));

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  ${allOk ? '\u2713 OK' : '\u26a0 WARNINGS'}: ${subj.file}${allOk ? '' : ' (' + failures.length + ' missing)'}`);
}

console.log('Patching AS/A-Level pacing files...\n');
SUBJECTS.forEach(s => {
  process.stdout.write(`Processing: ${s.file}... `);
  try {
    patch(s);
  } catch(e) {
    console.error(`\n  ERROR processing ${s.file}:`, e.message);
    console.error(e.stack);
  }
});
console.log('\nDone.');
