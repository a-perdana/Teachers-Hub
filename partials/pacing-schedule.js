// pacing-schedule.js
// Shared pacing schedule helper — loaded by pacing pages and weekly-checklist.
// Pure utility: no Firebase imports. Accepts pre-loaded Firestore data.

/**
 * Load teaching_schedule/main and return parsed week arrays.
 * Uses window.__fbFS (exposed by the pacing template module) or falls back to
 * a direct CDN import for pages that don't have __fbFS (e.g. weekly-checklist).
 *
 * @param {object} db   - Firestore instance (window.db)
 * @returns {Promise<{teachingWeeks: Array, skippedWeeks: Array}>}
 */
window.loadTeachingSchedule = async function(db) {
  let getDoc, doc;
  if (window.__fbFS) {
    ({ getDoc, doc } = window.__fbFS);
  } else {
    const m = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    getDoc = m.getDoc; doc = m.doc;
  }
  try {
    const snap = await getDoc(doc(db, 'teaching_schedule', 'main'));
    if (!snap.exists()) {
      window._teachingScheduleCache = { teachingWeeks: [], skippedWeeks: [] };
      return window._teachingScheduleCache;
    }
    const data = snap.data();
    const teachingWeeks = (data.weeks || []).map(w => ({
      weekNo:    w.weekNo,
      semLabel:  w.semLabel  || '',
      semWeekNo: w.semWeekNo || w.weekNo,
      mon: new Date(w.mon + 'T00:00:00'),
      fri: new Date(w.fri + 'T23:59:59'),
    }));
    const skippedWeeks = (data.skippedWeeks || []).map(w => ({
      reason: w.reason || 'Holiday',
      mon: new Date(w.mon + 'T00:00:00'),
      fri: new Date(w.fri + 'T23:59:59'),
    }));
    window._teachingScheduleCache = { teachingWeeks, skippedWeeks };
    return window._teachingScheduleCache;
  } catch (e) {
    console.warn('pacing-schedule: could not load teaching_schedule/main', e);
    window._teachingScheduleCache = { teachingWeeks: [], skippedWeeks: [] };
    return window._teachingScheduleCache;
  }
};

/**
 * Returns the current school week as { semester, week } using the loaded
 * teaching schedule. Year-relative semWeekNo (Y7 W5 and Y8 W5 both come back
 * as week=5 — the topic's `t.year` distinguishes them via cumulative reset
 * which is already handled by the syllabus push).
 *
 * Falls back to the next teaching week if today lands on a skipped week
 * (public holiday): teachers expect "we are on holiday, next week is W13"
 * not "W12 still" or "W13 already".
 *
 * Returns null if no schedule is loaded yet, or if the academic year has
 * not started.
 */
window.getCurrentSchoolWeekInfo = function() {
  const cache = window._teachingScheduleCache;
  if (!cache || !cache.teachingWeeks || !cache.teachingWeeks.length) return null;
  const now = new Date();
  // 1) Today inside a teaching week → return that week.
  const idx = cache.teachingWeeks.findIndex(w => now >= w.mon && now <= w.fri);
  if (idx >= 0) {
    const w = cache.teachingWeeks[idx];
    return { semLabel: w.semLabel, semester: _parseSem(w.semLabel), week: w.semWeekNo };
  }
  // 2) Today before academic year starts.
  if (now < cache.teachingWeeks[0].mon) return null;
  // 3) Today is in a holiday gap → next teaching week.
  const nextW = cache.teachingWeeks.find(w => w.mon > now);
  if (nextW) return { semLabel: nextW.semLabel, semester: _parseSem(nextW.semLabel), week: nextW.semWeekNo };
  // 4) Past the last teaching week of the year.
  const lastW = cache.teachingWeeks[cache.teachingWeeks.length - 1];
  return { semLabel: lastW.semLabel, semester: _parseSem(lastW.semLabel), week: lastW.semWeekNo + 1 };
};

function _parseSem(label) {
  if (!label) return null;
  const m = String(label).match(/(\d+|I{1,3}|IV)/i);
  if (!m) return null;
  const t = m[1].toUpperCase();
  if (t === 'I')   return 1;
  if (t === 'II')  return 2;
  if (t === 'III') return 3;
  if (t === 'IV')  return 4;
  const n = parseInt(t, 10);
  return isNaN(n) ? null : n;
}

/**
 * Compares a topic's planned (semester, week) against the current school
 * week and returns 'overdue' | 'behind' | 'on-track' | 'upcoming' | null.
 *
 * Topics without a semester field fall back to comparing only `week`
 * within the current semester — preserves backward compat for legacy data
 * before the syllabus push existed.
 */
window.getTopicPaceStatus = function(topic, current) {
  if (!current) return null;
  if (topic.status === 'done') return null;
  const tWeek = parseInt(String(topic.week ?? '').replace(/\D/g, ''), 10);
  if (!tWeek) return null;
  const tSem = topic.semester || null;
  if (tSem && current.semester) {
    if (tSem < current.semester) return 'overdue';
    if (tSem > current.semester) return 'upcoming';
  }
  // Same semester (or unknown) — compare weeks
  if (current.week > tWeek + 1) return 'overdue';
  if (current.week > tWeek)     return 'behind';
  if (current.week === tWeek)   return 'on-track';
  return 'upcoming';
};

/**
 * Given the pacing chapters array, weeklyHours, and the teaching_schedule weeks array,
 * returns topics active in the calendar week containing targetDate.
 *
 * @param {Array}  chapters       - From Firestore pacing doc (chapters[])
 * @param {number} weeklyHours    - Lesson hours per week (from pacing doc root)
 * @param {Array}  teachingWeeks  - From loadTeachingSchedule() — parsed Date objects
 * @param {Date}   targetDate     - Usually new Date()
 * @returns {Array} activeTopics  - [{ci, ti, chId, tId, chTitle, topicTitle, hours, weekEntry}]
 */
window.getActiveTopicsForDate = function(chapters, weeklyHours, teachingWeeks, targetDate, opts) {
  if (!chapters || !chapters.length || !weeklyHours || weeklyHours <= 0 || !teachingWeeks.length) return [];

  const yearFilter = opts && opts.yearFilter && opts.yearFilter !== 'all' ? opts.yearFilter : null;

  // Trust "Book N" prefix in chapter title over any (potentially mis-tagged)
  // ch.year field, falling back to ch.year only when the title has no prefix.
  function chYear(ch) {
    if (!ch) return null;
    const m = String(ch.chapter || '').match(/^Book\s+(\d{1,2})\b/i);
    if (m) return `Year ${m[1]}`;
    return ch.year || null;
  }

  // Find which teaching week contains targetDate
  const today = new Date(targetDate);
  today.setHours(12, 0, 0, 0);
  const activeWeekIdx = teachingWeeks.findIndex(w => today >= w.mon && today <= w.fri);
  if (activeWeekIdx === -1) return []; // today is a holiday or break

  const weekEntry = teachingWeeks[activeWeekIdx];
  const active = [];
  // Year-aware cumulative: each year resets to 0 so a Y7 teacher sees the
  // topic that lands in this week of *Y7's* schedule, not the chapter that
  // happens to fall in Y7+Y8 cumulative weekN.
  let cumulative = 0;
  let lastYear = null;

  chapters.forEach((ch, ci) => {
    const thisYear = chYear(ch);
    if (lastYear !== null && thisYear !== lastYear) cumulative = 0;
    lastYear = thisYear;

    const includeChapter = !yearFilter || thisYear === yearFilter;

    (ch.topics || []).forEach((t, ti) => {
      if (t.type === 'buffer') { cumulative += (t.duration || t.hour || 0); return; }
      const duration    = t.duration || t.hour || 0;
      if (!duration) { return; }
      const startWkIdx  = Math.floor(cumulative / weeklyHours);
      const endWkIdx    = Math.floor((cumulative + duration - 1) / weeklyHours);
      if (includeChapter && activeWeekIdx >= startWkIdx && activeWeekIdx <= endWkIdx) {
        active.push({
          ci, ti,
          chId:       ch.id   || null,
          tId:        t.id    || null,
          chTitle:    ch.chapter || ch.title || `Chapter ${ci + 1}`,
          topicTitle: t.topic || t.title || `Topic ${ti + 1}`,
          hours:      duration,
          weekEntry,
        });
      }
      cumulative += duration;
    });
  });

  return active;
};

/**
 * Find a skipped week that contains targetDate, if any.
 * Returns the skipped week object or null.
 */
window.getSkippedWeekForDate = function(skippedWeeks, targetDate) {
  const today = new Date(targetDate);
  today.setHours(12, 0, 0, 0);
  return skippedWeeks.find(w => today >= w.mon && today <= w.fri) || null;
};

/**
 * Render the "This Week" widget into a container element.
 *
 * @param {HTMLElement} container
 * @param {Array}  activeTopics   - From getActiveTopicsForDate()
 * @param {object} pacingDone     - Map of "chId.tId" → true, from userProgress.pacingDone_<subjectKey>
 * @param {string} subjectLabel   - Display label e.g. "Mathematics"
 * @param {string} subjectKey     - e.g. "math"
 * @param {function} onToggle     - Called with (chId, tId, isDone) when button clicked
 * @param {object|null} skippedWeek - From getSkippedWeekForDate(), or null
 */
window.renderThisWeekWidget = function(container, activeTopics, pacingDone, subjectLabel, subjectKey, onToggle, skippedWeek) {
  if (!container) return;

  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const weekLabel = activeTopics.length > 0
    ? (() => {
        const w = activeTopics[0].weekEntry;
        return `${w.semLabel ? w.semLabel + ' · ' : ''}Week ${w.semWeekNo}: ${fmt(w.mon)} – ${fmt(w.fri)}`;
      })()
    : '';

  if (skippedWeek && !activeTopics.length) {
    container.innerHTML = `
      <div class="this-week-break">
        <span class="this-week-break-icon">${/ease/i.test(skippedWeek.reason) ? '📝' : /camp/i.test(skippedWeek.reason) ? '🏕️' : '🏖️'}</span>
        <span><strong>${skippedWeek.reason}</strong> — No scheduled topics this week.</span>
      </div>`;
    container.style.display = '';
    return;
  }

  if (!activeTopics.length) {
    container.style.display = 'none';
    return;
  }

  const rows = activeTopics.map(t => {
    const key     = t.chId && t.tId ? `${t.chId}.${t.tId}` : null;
    const isDone  = key ? !!(pacingDone && pacingDone[key]) : false;
    const noId    = !key;
    return `
      <div class="tw-topic-row ${isDone ? 'tw-done' : ''}">
        <div class="tw-topic-info">
          <div class="tw-topic-ch">${escHtml(t.chTitle)}</div>
          <div class="tw-topic-title">${escHtml(t.topicTitle)}</div>
          <div class="tw-topic-hours">${t.hours}h planned</div>
        </div>
        <button class="tw-done-btn ${isDone ? 'tw-done-active' : ''}"
          ${noId ? 'disabled title="Topic has no stable ID yet — open pacing page to activate"' : ''}
          onclick="window.__twToggle('${subjectKey}','${t.chId}','${t.tId}',${isDone})">
          ${isDone ? '✓ Done' : 'Mark Done'}
        </button>
      </div>`;
  }).join('');

  // Collapsed by default to save vertical space; users can expand on demand.
  // Preference is per-subject so a teacher who wants it open in Math doesn't
  // re-open it on every visit.
  const storeKey = `tw_collapsed_${subjectKey || 'default'}`;
  const stored   = localStorage.getItem(storeKey);
  const collapsed = stored == null ? true : stored === '1';
  const count = activeTopics.length;

  container.innerHTML = `
    <div class="this-week-header" role="button" tabindex="0" aria-expanded="${!collapsed}" onclick="window.__twToggleCollapse('${storeKey}', this.parentElement)">
      <div class="this-week-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        This Week
        <span class="tw-count">${count}</span>
      </div>
      <div class="this-week-label">${escHtml(weekLabel)}</div>
      <span class="tw-caret" aria-hidden="true">▾</span>
    </div>
    <div class="tw-topics">${rows}</div>`;
  container.classList.toggle('tw-collapsed', collapsed);
  container.style.display = '';

  // Expose toggle handler on window so the inline onclick can reach it
  window.__twToggle = function(subjKey, chId, tId, currentlyDone) {
    onToggle(chId, tId, !currentlyDone);
  };
};

// Toggle the This Week panel open/closed and persist the preference per
// subject. Defined once globally so each render's inline onclick can find it.
window.__twToggleCollapse = function(storeKey, panel) {
  if (!panel) return;
  const nowCollapsed = !panel.classList.contains('tw-collapsed');
  panel.classList.toggle('tw-collapsed', nowCollapsed);
  const head = panel.querySelector('.this-week-header');
  if (head) head.setAttribute('aria-expanded', String(!nowCollapsed));
  try { localStorage.setItem(storeKey, nowCollapsed ? '1' : '0'); } catch {}
};

// Safe HTML escape (mirrors the one in pacing-shared.js — safe to call if that one isn't loaded)
if (typeof window.escHtml !== 'function') {
  window.escHtml = function(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };
}
