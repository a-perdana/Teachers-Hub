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
    if (!snap.exists()) return { teachingWeeks: [], skippedWeeks: [] };
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
    return { teachingWeeks, skippedWeeks };
  } catch (e) {
    console.warn('pacing-schedule: could not load teaching_schedule/main', e);
    return { teachingWeeks: [], skippedWeeks: [] };
  }
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
window.getActiveTopicsForDate = function(chapters, weeklyHours, teachingWeeks, targetDate) {
  if (!chapters || !chapters.length || !weeklyHours || weeklyHours <= 0 || !teachingWeeks.length) return [];

  // Find which teaching week contains targetDate
  const today = new Date(targetDate);
  today.setHours(12, 0, 0, 0);
  const activeWeekIdx = teachingWeeks.findIndex(w => today >= w.mon && today <= w.fri);
  if (activeWeekIdx === -1) return []; // today is a holiday or break

  const weekEntry = teachingWeeks[activeWeekIdx];
  const active = [];
  let cumulative = 0;

  chapters.forEach((ch, ci) => {
    (ch.topics || []).forEach((t, ti) => {
      if (t.type === 'buffer') { cumulative += (t.duration || t.hour || 0); return; }
      const duration    = t.duration || t.hour || 0;
      if (!duration) { return; }
      const startWkIdx  = Math.floor(cumulative / weeklyHours);
      const endWkIdx    = Math.floor((cumulative + duration - 1) / weeklyHours);
      if (activeWeekIdx >= startWkIdx && activeWeekIdx <= endWkIdx) {
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

  container.innerHTML = `
    <div class="this-week-header">
      <div class="this-week-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        This Week
      </div>
      <div class="this-week-label">${escHtml(weekLabel)}</div>
    </div>
    <div class="tw-topics">${rows}</div>`;
  container.style.display = '';

  // Expose toggle handler on window so the inline onclick can reach it
  window.__twToggle = function(subjKey, chId, tId, currentlyDone) {
    onToggle(chId, tId, !currentlyDone);
  };
};

// Safe HTML escape (mirrors the one in pacing-shared.js — safe to call if that one isn't loaded)
if (typeof window.escHtml !== 'function') {
  window.escHtml = function(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };
}
