// =============================================================
// pacing-shared.js — shared JS for all pacing guide pages
// Injected via <!-- PACING_SHARED_JS --> placeholder.
//
// Each page defines these config variables BEFORE this script:
//   window.PACING_CONFIG = {
//     examLocalKey: 'igcse_math_exam_dates',   // localStorage key
//     examPapers:   [                           // papers for this subject
//       { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
//       { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
//       { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
//     ],
//     hasSyllabusFilter: true,  // IGCSE only — shows Core/Extended UI
//   };
// =============================================================

// ── Exam Countdown ──────────────────────────────────────────
function renderExamCountdown() {
  const bar = document.getElementById('examCountdownBar');
  if (!bar) return;
  const chips = document.getElementById('examChipsWrap');
  const warn  = document.getElementById('examUncoveredWarn');
  if (!chips) return;

  const cfg    = window.PACING_CONFIG || {};
  const papers = cfg.examPapers || [];
  const now    = new Date();
  let anyDate  = false;
  let minDays  = Infinity;

  chips.innerHTML = papers.map(p => {
    const d = examDates[p.key];
    if (!d) return '';
    anyDate = true;
    const target = new Date(d);
    const days = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (days < minDays) minDays = days;
    const isDanger = days <= 30 && days >= 0;
    const cls = isDanger ? 'danger' : p.cls;
    const label = days < 0 ? 'Passed' : days === 0 ? 'TODAY' : days + 'd';
    return `<span class="exam-chip ${cls}" title="${p.label}: ${d}"><span class="exam-chip-days">${label}</span><span class="exam-chip-label">${p.label}</span></span>`;
  }).join('');

  if (!anyDate) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.classList.toggle('danger-zone', minDays <= 30 && minDays >= 0);

  const uncovered = DATA.reduce((n, ch) => n + ch.topics.filter(t => t.status !== 'done').length, 0);
  if (warn) {
    if (uncovered > 0 && minDays > 0 && minDays <= 60) {
      warn.textContent = '⚠ ' + uncovered + ' topics not yet done';
      warn.style.display = 'flex';
    } else {
      warn.style.display = 'none';
    }
  }
}

async function manageExamDates() {
  const cfg    = window.PACING_CONFIG || {};
  const papers = cfg.examPapers || [];
  const res = await _showCm({
    title: 'Set Cambridge Exam Dates',
    msg: 'Enter exam dates for this subject (leave blank to skip).',
    fields: papers.map(p => ({
      id: p.key,
      label: p.label + ' date (YYYY-MM-DD)',
      type: 'date',
      val: examDates[p.key] || '',
    })),
    okLabel: 'Save Dates',
  });
  if (!res) return;
  papers.forEach(p => { if (res[p.key]) examDates[p.key] = res[p.key]; });
  localStorage.setItem((cfg.examLocalKey || 'pacing_exam_dates'), JSON.stringify(examDates));
  renderExamCountdown();
  showToast('Exam dates saved');
}

// ── Syllabus Filter (IGCSE Core/Extended only) ───────────────
function setSyllabusFilter(val) {
  syllabusFilter = val;
  Object.keys(chPageMap).forEach(k => { chPageMap[k] = 0; });
  chapterPage = 0;
  renderPacing();
  renderCoverage();
}

function getTopicSyllabus(t) {
  const codes = parseObjCodes(t.objective || '');
  const hasC = codes.some(c => c.startsWith('C'));
  const hasE = codes.some(c => c.startsWith('E'));
  if (hasC && hasE) return 'both';
  if (hasE) return 'extended';
  if (hasC) return 'core';
  return 'both';
}

function matchesSyllabusFilter(t) {
  if (!window.PACING_CONFIG || !window.PACING_CONFIG.hasSyllabusFilter) return true;
  if (syllabusFilter === 'all') return true;
  const s = getTopicSyllabus(t);
  if (s === 'both') return true;
  return s === syllabusFilter;
}

// ── Diagnostic Tag ───────────────────────────────────────────
var DIAG_LABELS = { weak: '⚠ Weak', review: '↺ Review', good: '✓ Good', '': 'Diagnose' };

function renderDiagBtn(ci, ti, t) {
  const d = t.diag || '';
  const cls = d ? 'diag-btn diag-' + d : 'diag-btn';
  const label = DIAG_LABELS[d] || 'Diagnose';
  return `<div style="position:relative;display:inline-block">
    <button class="${cls}" id="diag-btn-${ci}-${ti}" onclick="toggleDiagMenu(${ci},${ti},event)" title="Set diagnostic tag for this topic">${label}</button>
    <div class="diag-dropdown" id="diag-dd-${ci}-${ti}">
      <div class="diag-dd-item" onclick="setDiag(${ci},${ti},'weak')"><span class="diag-dd-dot weak"></span>Weak — needs reteaching</div>
      <div class="diag-dd-item" onclick="setDiag(${ci},${ti},'review')"><span class="diag-dd-dot review"></span>Review — revisit briefly</div>
      <div class="diag-dd-item" onclick="setDiag(${ci},${ti},'good')"><span class="diag-dd-dot good"></span>Good — class mastered it</div>
      <div class="diag-dd-item" onclick="setDiag(${ci},${ti},'')"><span class="diag-dd-dot clear"></span>Clear tag</div>
    </div>
  </div>`;
}

function toggleDiagMenu(ci, ti, e) {
  e.stopPropagation();
  document.querySelectorAll('.diag-dropdown.open').forEach(el => {
    if (el.id !== `diag-dd-${ci}-${ti}`) el.classList.remove('open');
  });
  const dd = document.getElementById(`diag-dd-${ci}-${ti}`);
  if (dd) dd.classList.toggle('open');
}

function setDiag(ci, ti, val) {
  DATA[ci].topics[ti].diag = val;
  const dd = document.getElementById(`diag-dd-${ci}-${ti}`);
  if (dd) dd.classList.remove('open');
  saveState();
  const btn = document.getElementById(`diag-btn-${ci}-${ti}`);
  if (btn) {
    btn.className = val ? 'diag-btn diag-' + val : 'diag-btn';
    btn.textContent = DIAG_LABELS[val] || 'Diagnose';
  }
  showToast(val ? 'Diagnostic tag: ' + DIAG_LABELS[val] : 'Tag cleared');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.diag-dropdown.open').forEach(el => el.classList.remove('open'));
});

// ── Coordinator Public Note ──────────────────────────────────
function renderCoordNoteRow(ci, ti, t) {
  const hasNote = !!(t.coordNote && t.coordNote.trim());
  if (!hasNote && role !== 'admin') return '';
  return `<tr class="coord-note-row" id="coord-row-${ci}-${ti}">
    <td colspan="2">
      <div class="coord-note-panel">
        <div class="coord-note-header">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Coordinator Note
        </div>
        ${role === 'admin'
          ? `<textarea class="coord-note-textarea" id="coord-ta-${ci}-${ti}" placeholder="Write a shared note visible to all teachers (e.g. 'Add 2 extra lessons — this topic was weak in 2024 exams')…">${escHtml(t.coordNote || '')}</textarea>
             <div class="coord-note-actions">
               <button class="coord-note-save" onclick="saveCoordNote(${ci},${ti})">Save Note</button>
               <button class="coord-note-cancel" onclick="clearCoordNote(${ci},${ti})">Clear</button>
             </div>`
          : `<div class="coord-note-text">${escHtml(t.coordNote || '')}</div>`
        }
      </div>
    </td>
  </tr>`;
}

function saveCoordNote(ci, ti) {
  const ta = document.getElementById(`coord-ta-${ci}-${ti}`);
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
  const row = document.getElementById(`coord-row-${ci}-${ti}`);
  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';
}

// ── Actual Hours + Variance Report ──────────────────────────
function renderActualHoursMeta(ci, ti, t) {
  const planned = t.hour || 1;
  const actual  = t.actualHour != null ? t.actualHour : null;
  let cls = '', diffLabel = '';
  if (actual !== null) {
    const diff = actual - planned;
    if (diff > 0)      { cls = 'over';  diffLabel = '+' + diff + 'h'; }
    else if (diff < 0) { cls = 'under'; diffLabel = diff + 'h'; }
    else               { cls = 'match'; diffLabel = '✓'; }
  }
  return `<span class="actual-hours-meta ${cls}" title="Actual lesson hours spent — click to edit">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
    Actual:
    <input class="actual-inp" type="number" min="0" max="99" value="${actual !== null ? actual : ''}"
      placeholder="—"
      onchange="setActualHours(${ci},${ti},this.value)"
      onclick="event.stopPropagation()"
      title="Actual hours spent on this topic">h
    ${diffLabel ? `<span style="font-size:.6rem;opacity:.8">(${diffLabel})</span>` : ''}
  </span>`;
}

function setActualHours(ci, ti, val) {
  const n = parseInt(val);
  DATA[ci].topics[ti].actualHour = isNaN(n) || n < 0 ? null : n;
  saveState();
  const wrap = document.querySelector(`#row-${ci}-${ti} .actual-hours-meta`);
  if (wrap) {
    const t = DATA[ci].topics[ti];
    const diff = (t.actualHour || 0) - (t.hour || 1);
    if (t.actualHour !== null) {
      wrap.className = 'actual-hours-meta ' + (diff > 0 ? 'over' : diff < 0 ? 'under' : 'match');
    }
  }
  showToast('Actual hours updated');
}

function renderVariance() {
  const el = document.getElementById('varianceReport');
  if (!el) return;

  // ── GLH Projection (Cambridge IGCSE = 130 Guided Learning Hours) ──
  const GLH_TARGET = 130;
  const allTopicsFlat = DATA.flatMap(ch => ch.topics);
  const totalTopics   = allTopicsFlat.length;
  const doneTopics    = allTopicsFlat.filter(t => t.status === 'done').length;
  const totalPlannedAll = allTopicsFlat.reduce((s, t) => s + (t.duration ?? t.hour ?? 1), 0);

  // Actual hours logged so far (across all topics with actualHour set)
  const loggedTopics  = allTopicsFlat.filter(t => t.actualHour != null);
  const actualSoFar   = loggedTopics.reduce((s, t) => s + t.actualHour, 0);
  const plannedSoFar  = loggedTopics.reduce((s, t) => s + (t.duration ?? t.hour ?? 1), 0);

  // Pace ratio: if actual > 0, compute how actual compares to planned
  const paceRatio = plannedSoFar > 0 ? actualSoFar / plannedSoFar : 1;
  // Projected total = remaining planned hours * paceRatio + actual so far
  const remainingPlanned = totalPlannedAll - plannedSoFar;
  const projectedTotal   = Math.round(actualSoFar + remainingPlanned * paceRatio);

  const glhPct        = Math.min(100, Math.round(totalPlannedAll / GLH_TARGET * 100));
  const projPct       = Math.min(100, Math.round(projectedTotal  / GLH_TARGET * 100));
  const donePct       = Math.min(100, Math.round(doneTopics / Math.max(totalTopics, 1) * 100));

  const glhOverPct    = projectedTotal > GLH_TARGET
    ? Math.min(100, Math.round((projectedTotal - GLH_TARGET) / GLH_TARGET * 100 * 5))
    : 0;

  const projClass = projectedTotal > GLH_TARGET + 10 ? 'over'
                  : projectedTotal < GLH_TARGET - 10 ? 'warn'
                  : 'ok';
  const projColor = projClass === 'over' ? '#c0392b' : projClass === 'warn' ? '#d97706' : '#16a34a';

  const glhBannerHtml = `
    <div class="glh-banner">
      <div class="glh-banner-head">
        <span class="glh-banner-title">Cambridge Guided Learning Hours — 0580 IGCSE Mathematics</span>
        <span class="glh-banner-nums">${totalPlannedAll}h planned · ${actualSoFar}h logged · <strong style="color:${projColor}">${projectedTotal}h projected</strong> vs ${GLH_TARGET}h target</span>
      </div>
      <div class="glh-track">
        <div class="glh-fill-planned" style="width:${glhPct}%;background:var(--border);position:absolute;inset:0;border-radius:5px"></div>
        <div class="glh-fill-planned" style="width:${Math.min(100,glhPct)}%;background:#bfdbfe;border-radius:5px"></div>
        <div class="glh-fill-projected" style="width:${projPct}%;background:${projColor};left:0"></div>
      </div>
      <div class="glh-legend">
        <div class="glh-legend-item"><div class="glh-legend-dot" style="background:#bfdbfe"></div>Planned hours (${totalPlannedAll}h = ${glhPct}% of ${GLH_TARGET}h)</div>
        <div class="glh-legend-item"><div class="glh-legend-dot" style="background:${projColor}"></div>Projected total at current pace (${projectedTotal}h)</div>
        <div class="glh-legend-item"><div class="glh-legend-dot" style="background:var(--border)"></div>Cambridge GLH target: ${GLH_TARGET}h</div>
      </div>
      <div class="glh-stat-row">
        <div class="glh-stat"><div class="glh-stat-num">${GLH_TARGET}h</div><div class="glh-stat-label">Cambridge GLH Target</div></div>
        <div class="glh-stat"><div class="glh-stat-num">${totalPlannedAll}h</div><div class="glh-stat-label">Total Planned</div></div>
        <div class="glh-stat ${projClass}"><div class="glh-stat-num">${projectedTotal}h</div><div class="glh-stat-label">Projected at Pace${projectedTotal !== totalPlannedAll && loggedTopics.length ? ' (extrapolated)' : ''}</div></div>
        <div class="glh-stat"><div class="glh-stat-num">${donePct}%</div><div class="glh-stat-label">Topics Complete (${doneTopics}/${totalTopics})</div></div>
        <div class="glh-stat ${projectedTotal > GLH_TARGET ? 'over' : projectedTotal < GLH_TARGET - 5 ? 'warn' : 'ok'}">
          <div class="glh-stat-num">${projectedTotal > GLH_TARGET ? '+' : ''}${projectedTotal - GLH_TARGET}h</div>
          <div class="glh-stat-label">${projectedTotal > GLH_TARGET ? 'Over target' : projectedTotal < GLH_TARGET ? 'Under target' : 'On target'}</div>
        </div>
      </div>
    </div>`;

  // ── Per-topic variance table ──
  const rows = [];
  let totalPlanned = 0, totalActual = 0, overCount = 0, underCount = 0, matchCount = 0;

  DATA.forEach((ch, ci) => {
    ch.topics.forEach((t, ti) => {
      if (t.actualHour === null || t.actualHour === undefined) return;
      const planned = t.duration ?? t.hour ?? 1;
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
    el.innerHTML = glhBannerHtml + `<div class="empty" style="padding:40px 0">
      <div class="empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="opacity:.35"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <p style="font-weight:500;color:var(--ink-2);margin-bottom:6px">No actual hours recorded yet</p>
      <p style="font-size:.75rem;color:var(--ink-3);line-height:1.6">Log actual lesson hours using the <strong>Actual: —h</strong> field on each topic to enable pace projection.</p>
    </div>`;
    return;
  }

  const totalDiff = totalActual - totalPlanned;
  el.innerHTML = glhBannerHtml + `
    <div class="variance-summary">
      <div class="var-stat"><div class="var-stat-num">${totalPlanned}h</div><div class="var-stat-label">Logged Planned</div></div>
      <div class="var-stat ${totalDiff > 0 ? 'over' : totalDiff < 0 ? 'under' : 'ok'}">
        <div class="var-stat-num">${totalActual}h</div>
        <div class="var-stat-label">Logged Actual${totalDiff !== 0 ? ' (' + (totalDiff > 0 ? '+' : '') + totalDiff + 'h)' : ''}</div>
      </div>
      <div class="var-stat over"><div class="var-stat-num">${overCount}</div><div class="var-stat-label">Over planned</div></div>
      <div class="var-stat under"><div class="var-stat-num">${underCount}</div><div class="var-stat-label">Under planned</div></div>
      <div class="var-stat ok"><div class="var-stat-num">${matchCount}</div><div class="var-stat-label">On target</div></div>
    </div>
    <table class="variance-table">
      <thead><tr>
        <th>Chapter</th><th>Topic</th>
        <th style="width:80px;text-align:center">Planned</th>
        <th style="width:80px;text-align:center">Actual</th>
        <th style="width:100px">Variance</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => {
          const cls = r.diff > 0 ? 'over' : r.diff < 0 ? 'under' : 'match';
          const label = r.diff > 0 ? '+' + r.diff + 'h over' : r.diff < 0 ? Math.abs(r.diff) + 'h under' : 'On target';
          return `<tr>
            <td style="font-size:.72rem;color:var(--ink-3)">${escHtml(r.ch.replace(/^\d+\.\s*/,'').substring(0,30))}</td>
            <td><a style="color:var(--ink);font-weight:500;cursor:pointer;text-decoration:none" onclick="scrollToChapter(${r.ci})">${escHtml(r.topic)}</a></td>
            <td style="text-align:center;font-family:'DM Mono',monospace">${r.planned}h</td>
            <td style="text-align:center;font-family:'DM Mono',monospace;font-weight:600">${r.actual}h</td>
            <td><span class="var-diff-badge ${cls}">${label}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ── Topbar padding sync (no-op kept for call-site compatibility) ──
function syncTopbarPadding() {}

// ── Search Result Count ──────────────────────────────────────
function updateSearchResultCount(topicCount, clear) {
  const el = document.getElementById('searchResultCount');
  if (!el) return;
  if (clear || !searchQ) { el.textContent = ''; el.className = 'search-result-count'; return; }
  const chCount = DATA.filter(ch => ch.topics.some(t => {
    if (!matchesSyllabusFilter(t)) return false;
    const q = searchQ.toLowerCase();
    return t.topic.toLowerCase().includes(q) || (t.objective || '').toLowerCase().includes(q);
  })).length;
  el.textContent = topicCount === 0
    ? 'No results found'
    : `${topicCount} topic${topicCount !== 1 ? 's' : ''} in ${chCount} chapter${chCount !== 1 ? 's' : ''}`;
  el.className = 'search-result-count has-results';
}

// ── Sidebar helper ───────────────────────────────────────────
function closeSidebar() {
  const layout = document.getElementById('appLayout');
  if (layout && window.innerWidth <= 768) layout.classList.add('sidebar-collapsed');
}
