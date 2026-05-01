// pacing-week-timeline.js
// Shared week timeline (Sem I/II rails of clickable Week N pills) used by
// every pacing template. Each template just calls window.renderWeekTimeline
// from inside its own render() — no per-page copies of this logic.
//
// Required globals on the page (provided by the pacing template):
//   DATA                      Array of chapter objects.
//   _chapterYear(ch)          Returns the chapter's "Year N" string.
//   _effectiveYearFilter()    Returns 'all' or 'Year N'.
//   chPageMap                 Map of ci -> intra-chapter page index.
//   PAGE_SIZE                 Topic page size (used by intra-chapter paging).
//   scrollToChapter(ci)       Scrolls + paginates to a chapter.
//   SUBJECT_CONFIG            Read off window.SUBJECT_CONFIG.
//   window._teachingScheduleCache, window.getCurrentSchoolWeekInfo()
//
// The element to render into is #weekTimeline.

(function () {
  function _semFromLabel(label) {
    const m = String(label || '').match(/(\d+|I{1,3}|IV)/i);
    if (!m) return 0;
    const t = m[1].toUpperCase();
    if (t === 'I')   return 1;
    if (t === 'II')  return 2;
    if (t === 'III') return 3;
    if (t === 'IV')  return 4;
    return parseInt(t, 10) || 0;
  }
  function _semRoman(s) {
    if (s === 1) return 'I';
    if (s === 2) return 'II';
    if (s === 3) return 'III';
    if (s === 4) return 'IV';
    return String(s);
  }
  function _esc(s) {
    if (typeof window.escHtml === 'function') return window.escHtml(s);
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.renderWeekTimeline = function renderWeekTimeline() {
    const el = document.getElementById('weekTimeline');
    if (!el) return;
    const _eyf = (typeof _effectiveYearFilter === 'function') ? _effectiveYearFilter() : 'all';

    // Timeline only makes sense once a year is locked in — otherwise
    // "Week 5" is ambiguous between Year A and Year B of the level.
    if (_eyf === 'all') { el.style.display = 'none'; el.innerHTML = ''; return; }

    // Map (semester, week) -> first topic that lands there. Both t.week and
    // schedule semWeekNo reset every semester, so we MUST key on (sem, w) —
    // otherwise Sem II W12 would silently jump to Sem I W12.
    const key = (sem, w) => `${sem || 0}|${w}`;
    const semWeekToTopic = {};
    const maxWeekBySem  = {};
    const data = window.DATA || [];
    data.forEach((ch, ci) => {
      if (_chapterYear(ch) !== _eyf) return;
      (ch.topics || []).forEach((t, ti) => {
        const w = parseInt(t.week, 10);
        if (!w || isNaN(w)) return;
        const sem = parseInt(t.semester, 10) || 0;
        const k = key(sem, w);
        if (w > (maxWeekBySem[sem] || 0)) maxWeekBySem[sem] = w;
        if (!semWeekToTopic[k]) semWeekToTopic[k] = { ci, ti };
      });
    });

    // Per-semester upper bound: prefer the teaching schedule (so empty weeks
    // are shown muted), fall back to whatever the topics give us.
    const sched = window._teachingScheduleCache;
    const schedBySem = {};
    if (sched && sched.teachingWeeks && sched.teachingWeeks.length) {
      sched.teachingWeeks.forEach(w => {
        const sem = _semFromLabel(w.semLabel);
        if (w.semWeekNo > (schedBySem[sem] || 0)) schedBySem[sem] = w.semWeekNo;
      });
    }

    const semSet = new Set([
      ...Object.keys(schedBySem).map(n => parseInt(n, 10)),
      ...Object.keys(maxWeekBySem).map(n => parseInt(n, 10)),
    ]);
    const sems = [...semSet].filter(s => s > 0).sort((a, b) => a - b);

    if (!sems.length) {
      const upper = Math.max(maxWeekBySem[0] || 0, 0);
      if (!upper) { el.style.display = 'none'; el.innerHTML = ''; return; }
      sems.push(0);
      schedBySem[0] = upper;
    }

    const curInfo = window.getCurrentSchoolWeekInfo && window.getCurrentSchoolWeekInfo();
    const curSem  = curInfo ? (curInfo.semester || 0) : 0;
    const curWeek = curInfo ? curInfo.week : 0;

    const semBlocksHtml = sems.map(sem => {
      const upper = Math.max(schedBySem[sem] || 0, maxWeekBySem[sem] || 0);
      if (!upper) return '';
      const weekNos = Array.from({ length: upper }, (_, i) => i + 1);
      const pills = weekNos.map(w => {
        const hasTopic = !!semWeekToTopic[key(sem, w)];
        const isCurrent = sem === curSem && w === curWeek;
        const cls = ['wk-pill'];
        if (isCurrent) cls.push('is-current');
        if (hasTopic) cls.push('has-topic'); else cls.push('is-empty');
        const title = hasTopic
          ? `Jump to Sem ${_semRoman(sem)} · Week ${w}${isCurrent ? ' (this week)' : ''}`
          : `Sem ${_semRoman(sem)} · Week ${w} — no topics scheduled`;
        return `<button type="button" class="${cls.join(' ')}" data-sem="${sem}" data-week="${w}" ${hasTopic ? '' : 'disabled aria-disabled="true"'} title="${title}">${w}</button>`;
      }).join('');
      const semLbl = sem ? `Sem ${_semRoman(sem)}` : 'Weeks';
      const isActiveSem = sem === curSem;
      return `
        <div class="wk-tl-sem${isActiveSem ? ' is-active-sem' : ''}">
          <span class="wk-tl-sem-label">${semLbl}</span>
          <div class="wk-tl-pills">${pills}</div>
        </div>`;
    }).join('');

    // Per-subject collapsed-or-not preference (mirrors the This Week widget).
    const subjKey = (window.SUBJECT_CONFIG && window.SUBJECT_CONFIG.subjectKey) || 'default';
    const tlStoreKey = `wk_tl_collapsed_${subjKey}`;
    const tlStored   = localStorage.getItem(tlStoreKey);
    const tlCollapsed = tlStored === '1'; // open by default on first visit

    el.innerHTML = `
      <div class="wk-tl-header" role="button" tabindex="0" aria-expanded="${!tlCollapsed}">
        <span class="wk-tl-label">${_esc(_eyf)} timeline</span>
        <span class="wk-tl-caret" aria-hidden="true">▾</span>
      </div>
      <div class="wk-tl-body">
        <div class="wk-tl-rail">${semBlocksHtml}</div>
      </div>`;
    el.classList.toggle('wk-tl-collapsed', tlCollapsed);
    el.style.display = '';

    // Wire clicks via event delegation. innerHTML wipes the body every render,
    // but the listener stays bound on #weekTimeline — sentinel guards the bind.
    if (!el.__wkTlBound) {
      el.addEventListener('click', (ev) => {
        const head = ev.target.closest('.wk-tl-header');
        if (head) {
          const nowCollapsed = !el.classList.contains('wk-tl-collapsed');
          el.classList.toggle('wk-tl-collapsed', nowCollapsed);
          head.setAttribute('aria-expanded', String(!nowCollapsed));
          try { localStorage.setItem(tlStoreKey, nowCollapsed ? '1' : '0'); } catch {}
          return;
        }
        const btn = ev.target.closest('.wk-pill');
        if (!btn || btn.disabled) return;
        const w   = parseInt(btn.dataset.week, 10);
        const sem = parseInt(btn.dataset.sem, 10) || 0;
        if (w) window.jumpToWeek(w, sem);
      });
      el.addEventListener('keydown', (ev) => {
        if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList.contains('wk-tl-header')) {
          ev.preventDefault();
          ev.target.click();
        }
      });
      el.__wkTlBound = true;
    }

    // Land on "now" instead of week 1 every render.
    if (curWeek) {
      const cur = el.querySelector('.wk-pill.is-current');
      if (cur && typeof cur.scrollIntoView === 'function') {
        cur.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
      }
    }
  };

  window.jumpToWeek = function jumpToWeek(w, sem) {
    const _eyf = (typeof _effectiveYearFilter === 'function') ? _effectiveYearFilter() : 'all';
    if (_eyf === 'all') return;
    const wantSem = sem || 0;
    let target = null;
    const data = window.DATA || [];
    data.some((ch, ci) => {
      if (_chapterYear(ch) !== _eyf) return false;
      return (ch.topics || []).some((t, ti) => {
        const tw   = parseInt(t.week, 10);
        const tsem = parseInt(t.semester, 10) || 0;
        if (tw === w && (wantSem === 0 || tsem === wantSem)) { target = { ci, ti }; return true; }
        return false;
      });
    });
    if (!target) return;

    // scrollToChapter only restores chapter pagination, not the topic-page
    // inside the chapter — flip both before the scroll so the row exists.
    if (typeof window.PAGE_SIZE === 'number' && window.PAGE_SIZE > 0 && window.chPageMap) {
      window.chPageMap[target.ci] = Math.floor(target.ti / window.PAGE_SIZE);
    }

    // If the target chapter is fully done while hide-completed is on,
    // renderPacing skips it and the chapter element won't exist for
    // scrollToChapter to find. Override hide-completed so the jump always
    // lands on something visible.
    const targetCh = data[target.ci];
    const targetAllDone = targetCh && targetCh.topics && targetCh.topics.length > 0
      && targetCh.topics.every(t => t.status === 'done');
    if (window.hideCompleted && targetAllDone && typeof window.toggleHideCompleted === 'function') {
      window.toggleHideCompleted(false);
    }

    if (typeof window.scrollToChapter === 'function') {
      window.scrollToChapter(target.ci);
    }
    setTimeout(() => {
      const row = document.getElementById(`row-${target.ci}-${target.ti}`);
      if (!row) return;
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('wk-jump-flash');
      setTimeout(() => row.classList.remove('wk-jump-flash'), 1600);
    }, 250);
  };
})();
