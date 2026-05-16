/**
 * academic-calendar-readonly.js
 *
 * Shared read-only Academic Calendar surface for AH + TH.
 * Mount: <div id="academic-calendar-mount"></div>
 *
 * Source of truth: `calendar_events` Firestore collection (CH /academic-calendar
 * is the admin/authoring surface; AH/TH only read). Mirrors CH's strip view
 * (2-month grid) + 1-month grid + list view with department/category filters.
 *
 * Loaded AFTER firebase-config.js + auth-guard.js (this hub's standard
 * pattern). Listens for the hub-appropriate authReady event (AH/TH dispatch
 * on `document`) and pulls `window.db` from the guard.
 *
 * Single source maintained at shared-design/; each hub's build.js copies it
 * to the hub's deployed bundle alongside cambridge-crossref.js / tokens.css.
 * Do NOT hand-edit per-hub copies — edit shared-design/ and rebuild.
 */

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────
  const COLLECTION = 'calendar_events';
  const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW_LABELS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const STORAGE_VIEW = 'eduversalAcademicCalView';
  const STORAGE_FILTERS = 'eduversalAcademicCalFilters';

  const DEPT_PALETTE = {
    'Academic':                 { color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
    'Admin/Operations':         { color:'#0f766e', bg:'#f0fdfa', border:'#99f6e4' },
    'After School Activities':  { color:'#a855f7', bg:'#faf5ff', border:'#e9d5ff' },
    'Working Alumni':           { color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
    'Guidance':                 { color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
    'Eduparent':                { color:'#65a30d', bg:'#f7fee7', border:'#d9f99d' },
    'Community Development':    { color:'#15803d', bg:'#f0fdf4', border:'#bbf7d0' },
    'EduOS':                    { color:'#ea580c', bg:'#fff7ed', border:'#fed7aa' },
    'Career Planning':          { color:'#ca8a04', bg:'#fefce8', border:'#fde68a' },
    'AFT':                      { color:'#475569', bg:'#f1f5f9', border:'#cbd5e1' },
    'University Alumni':        { color:'#db2777', bg:'#fdf2f8', border:'#fbcfe8' },
    'Marketing':                { color:'#92400e', bg:'#fffbeb', border:'#fde68a' },
    'College Counseling':       { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
    'Cambridge':                { color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
  };
  const DEFAULT_DEPT = { color:'#64748b', bg:'#f1f5f9', border:'#cbd5e1' };

  const CATEGORY_OVERRIDES = {
    'Public Holiday': { color:'#dc2626', bg:'#fef2f2', border:'#fecaca' },
    'Assessment':     { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  };

  // ── State ────────────────────────────────────────────────────────────────
  let events = [];
  let loaded = false;
  let view = 'strip';
  let stripAnchor = monthKey(new Date());
  let monthAnchor = monthKey(new Date());
  let activeFilters = null; // Set<string>; null = all
  let activeCatFilters = null;

  try {
    const saved = localStorage.getItem(STORAGE_VIEW);
    if (saved && ['strip', 'month', 'list'].includes(saved)) view = saved;
  } catch (_) {}

  try {
    const savedFilters = JSON.parse(localStorage.getItem(STORAGE_FILTERS) || 'null');
    if (savedFilters && Array.isArray(savedFilters.depts)) activeFilters = new Set(savedFilters.depts);
    if (savedFilters && Array.isArray(savedFilters.cats))  activeCatFilters = new Set(savedFilters.cats);
  } catch (_) {}

  // ── Utilities ────────────────────────────────────────────────────────────
  function monthKey(d) { return d.getFullYear() * 12 + d.getMonth(); }
  function unMonthKey(k) { return { year: Math.floor(k / 12), month: k % 12 }; }
  function isoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function parseIso(iso) {
    const s = String(iso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function spans(ev, dateIso) {
    const ds = String(ev.date_start || '').slice(0, 10);
    const de = String(ev.date_end || ev.date_start || '').slice(0, 10);
    return ds <= dateIso && dateIso <= de;
  }
  function getStyle(ev) {
    if (CATEGORY_OVERRIDES[ev.category]) return CATEGORY_OVERRIDES[ev.category];
    return DEPT_PALETTE[ev.department] || DEFAULT_DEPT;
  }
  function eventMatchesFilters(ev) {
    if (CATEGORY_OVERRIDES[ev.category]) {
      return !activeCatFilters || activeCatFilters.has(ev.category);
    }
    return !activeFilters || activeFilters.has(ev.department);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function persistFilters() {
    try {
      localStorage.setItem(STORAGE_FILTERS, JSON.stringify({
        depts: activeFilters ? Array.from(activeFilters) : null,
        cats:  activeCatFilters ? Array.from(activeCatFilters) : null,
      }));
    } catch (_) {}
  }
  function persistView() {
    try { localStorage.setItem(STORAGE_VIEW, view); } catch (_) {}
  }

  // ── Data load ────────────────────────────────────────────────────────────
  async function loadEvents() {
    const db = window.db;
    if (!db) throw new Error('window.db not ready');
    // Lazy-import Firestore client. AH/TH pages already loaded it via auth-guard.js,
    // but it's safer to pull it from the SDK module here so we don't depend on
    // the consuming page having imported getDocs/collection/query/orderBy.
    const fs = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const snap = await fs.getDocs(fs.query(fs.collection(db, COLLECTION), fs.orderBy('date_start')));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e && e.date_start);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render() {
    const mount = document.getElementById('academic-calendar-mount');
    if (!mount) return;
    if (!loaded) {
      mount.innerHTML = `<div class="ec-loading">Loading academic calendar…</div>`;
      return;
    }
    mount.innerHTML = chrome() + filtersBar() + viewBody() + listLegend();
    wireChrome();
  }

  let filtersOpen = false;

  function chrome() {
    const counts = countsByYear();
    const yearChips = Object.entries(counts).sort()
      .map(([y, n]) => `<span class="ec-year-chip" title="${escapeHtml(y)} — ${n} events"><span class="ec-year-dot"></span>${escapeHtml(y)}<span class="ec-year-count">${n}</span></span>`)
      .join('');

    const viewBtns = [
      ['strip', '2-Mo'],
      ['month', '1-Mo'],
      ['list',  'List'],
    ].map(([v, label]) => `<button class="ec-view-btn${view === v ? ' is-active' : ''}" data-view="${v}" title="${label === '2-Mo' ? '2-Month' : label === '1-Mo' ? '1-Month' : 'List'} view">${label}</button>`).join('');

    let navUI = '';
    if (view === 'strip') {
      const a = unMonthKey(stripAnchor);
      const b = unMonthKey(stripAnchor + 1);
      navUI = `
        <button class="ec-nav-btn ec-nav-arrow" data-strip-nav="-1" title="Previous 2 months">‹</button>
        <span class="ec-nav-label">${MONTHS_SHORT[a.month]} ${a.year} – ${MONTHS_SHORT[b.month]} ${b.year}</span>
        <button class="ec-nav-btn ec-nav-arrow" data-strip-nav="1" title="Next 2 months">›</button>
        <button class="ec-nav-btn ec-nav-today" data-strip-nav="today" title="Jump to today">Today</button>
      `;
    } else if (view === 'month') {
      const a = unMonthKey(monthAnchor);
      navUI = `
        <button class="ec-nav-btn ec-nav-arrow" data-month-nav="-1" title="Previous month">‹</button>
        <span class="ec-nav-label">${MONTHS_SHORT[a.month]} ${a.year}</span>
        <button class="ec-nav-btn ec-nav-arrow" data-month-nav="1" title="Next month">›</button>
        <button class="ec-nav-btn ec-nav-today" data-month-nav="today" title="Jump to today">Today</button>
      `;
    } else {
      navUI = `<span class="ec-nav-label ec-nav-label-list">All events · sorted by date</span>`;
    }

    // Compact filter trigger — count of active vs total
    const totals = filterTotals();
    const allActive = !activeFilters && !activeCatFilters;
    const activeCount = (activeFilters ? activeFilters.size : totals.depts) + (activeCatFilters ? activeCatFilters.size : totals.cats);
    const totalCount = totals.depts + totals.cats;
    const filterLabel = allActive
      ? `Filter`
      : `Filter <span class="ec-filter-active-badge">${activeCount}/${totalCount}</span>`;

    return `
      <div class="ec-chrome ec-chrome-compact">
        <div class="ec-chrome-row">
          ${yearChips ? `<div class="ec-year-chips">${yearChips}</div>` : '<span class="ec-empty-pill">No events</span>'}
          <div class="ec-nav-cluster">${navUI}</div>
          <div class="ec-chrome-actions">
            <button class="ec-filter-trigger${allActive ? '' : ' is-active'}${filtersOpen ? ' is-open' : ''}" data-toggle-filters title="Toggle filters">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              ${filterLabel}
            </button>
            <div class="ec-view-switch" role="tablist">${viewBtns}</div>
          </div>
        </div>
        ${filtersOpen ? filtersDropdown() : ''}
      </div>
    `;
  }

  function filterTotals() {
    if (events.length === 0) return { depts: 0, cats: 0 };
    const depts = new Set(events.map(e => e.department).filter(Boolean)
      .filter(d => !Object.keys(CATEGORY_OVERRIDES).some(c => events.find(e => e.department === d && e.category === c))));
    const cats  = new Set(events.map(e => e.category).filter(c => CATEGORY_OVERRIDES[c]));
    return { depts: depts.size, cats: cats.size };
  }

  function filtersDropdown() {
    if (events.length === 0) return '';
    const depts = Array.from(new Set(events.map(e => e.department).filter(Boolean)
      .filter(d => !Object.keys(CATEGORY_OVERRIDES).some(c => events.find(e => e.department === d && e.category === c))))).sort();
    const cats  = Array.from(new Set(events.map(e => e.category).filter(c => CATEGORY_OVERRIDES[c]))).sort();

    const deptChips = depts.map(d => {
      const st = DEPT_PALETTE[d] || DEFAULT_DEPT;
      const active = !activeFilters || activeFilters.has(d);
      return `<button class="ec-chip${active ? ' is-active' : ''}" data-dept="${escapeHtml(d)}" style="--c:${st.color};--bg:${st.bg};--br:${st.border}"><span class="ec-chip-dot"></span>${escapeHtml(d)}</button>`;
    }).join('');
    const catChips = cats.map(c => {
      const st = CATEGORY_OVERRIDES[c];
      const active = !activeCatFilters || activeCatFilters.has(c);
      return `<button class="ec-chip${active ? ' is-active' : ''}" data-cat="${escapeHtml(c)}" style="--c:${st.color};--bg:${st.bg};--br:${st.border}"><span class="ec-chip-dot"></span>${escapeHtml(c)}</button>`;
    }).join('');

    return `
      <div class="ec-filters-dropdown">
        <div class="ec-filter-row">
          <span class="ec-filter-label">Depts</span>
          <div class="ec-chips">${deptChips}</div>
          <button class="ec-filter-reset" data-reset="dept" ${activeFilters ? '' : 'disabled'}>Reset</button>
        </div>
        <div class="ec-filter-row">
          <span class="ec-filter-label">Cats</span>
          <div class="ec-chips">${catChips}</div>
          <button class="ec-filter-reset" data-reset="cat" ${activeCatFilters ? '' : 'disabled'}>Reset</button>
        </div>
      </div>
    `;
  }

  function filtersBar() { return ''; /* moved into chrome dropdown */ }

  function viewBody() {
    if (events.length === 0) {
      return `<div class="ec-empty"><div class="ec-empty-icon">📅</div><div>No events in Firestore yet.</div><div class="ec-empty-hint">CH admin can sync from Sheets at /academic-calendar.</div></div>`;
    }
    if (view === 'strip') return stripView();
    if (view === 'month') return monthView();
    return listView();
  }

  function stripView() {
    const a = unMonthKey(stripAnchor);
    const b = unMonthKey(stripAnchor + 1);
    return `<div class="ec-strip">${monthCard(a.year, a.month)}${monthCard(b.year, b.month)}</div>`;
  }
  function monthView() {
    const a = unMonthKey(monthAnchor);
    return `<div class="ec-month-solo">${monthCard(a.year, a.month, true)}</div>`;
  }

  function monthCard(year, month, solo) {
    const firstDow = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push('<div class="ec-cell ec-cell-empty"></div>');
    for (let d = 1; d <= lastDate; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => spans(e, iso) && eventMatchesFilters(e));
      const hasEv = dayEvents.length > 0;
      const today = iso === isoDate(new Date());
      const st = hasEv ? getStyle(dayEvents[0]) : null;
      cells.push(`
        <div class="ec-cell${hasEv ? ' ec-has' : ''}${today ? ' ec-today' : ''}" ${hasEv ? `style="--c:${st.color};--bg:${st.bg};--br:${st.border}"` : ''}>
          <span class="ec-cell-num">${d}</span>
          ${hasEv ? `<span class="ec-cell-count">${dayEvents.length}</span>` : ''}
        </div>
      `);
    }
    const monthEvents = events
      .filter(e => eventMatchesFilters(e))
      .filter(e => {
        const ds = parseIso(e.date_start);
        const de = parseIso(e.date_end || e.date_start) || ds;
        if (!ds || !de) return false;
        const monthStart = new Date(year, month, 1);
        const monthEnd   = new Date(year, month + 1, 0);
        return de >= monthStart && ds <= monthEnd;
      })
      .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));

    const eventsList = monthEvents.map(e => {
      const st = getStyle(e);
      const ds = parseIso(e.date_start);
      const de = parseIso(e.date_end || e.date_start);
      let dateLabel;
      if (!de || isoDate(ds) === isoDate(de)) dateLabel = String(ds.getDate());
      else if (ds.getMonth() === de.getMonth()) dateLabel = `${ds.getDate()}–${de.getDate()}`;
      else dateLabel = `${ds.getDate()} ${MONTHS_SHORT[ds.getMonth()]}–${de.getDate()} ${MONTHS_SHORT[de.getMonth()]}`;
      return `
        <div class="ec-ev" style="--c:${st.color};--bg:${st.bg};--br:${st.border}">
          <span class="ec-ev-date">${dateLabel}</span>
          <span class="ec-ev-title">${escapeHtml(e.title)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="ec-month${solo ? ' ec-month-solo-card' : ''}">
        <div class="ec-month-head">${MONTHS_LONG[month]} ${year}</div>
        <div class="ec-dow">${DOW_LABELS.map(d => `<div class="ec-dow-cell">${d}</div>`).join('')}</div>
        <div class="ec-grid">${cells.join('')}</div>
        <div class="ec-month-events">
          ${monthEvents.length === 0 ? '<div class="ec-month-empty">No events.</div>' : eventsList}
        </div>
      </div>
    `;
  }

  function listView() {
    const todayIso = isoDate(new Date());
    const filtered = events
      .filter(e => eventMatchesFilters(e))
      .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));

    if (filtered.length === 0) return `<div class="ec-empty"><div>No events match current filters.</div></div>`;

    // Group by month
    const groups = {};
    filtered.forEach(e => {
      const k = String(e.date_start).slice(0, 7);
      if (!groups[k]) groups[k] = [];
      groups[k].push(e);
    });

    const html = Object.entries(groups).map(([ym, evs]) => {
      const [y, m] = ym.split('-').map(Number);
      const rows = evs.map(e => {
        const st = getStyle(e);
        const ds = parseIso(e.date_start);
        const de = parseIso(e.date_end || e.date_start);
        let dateLabel;
        if (!de || isoDate(ds) === isoDate(de)) dateLabel = `${ds.getDate()} ${MONTHS_SHORT[ds.getMonth()]}`;
        else if (ds.getMonth() === de.getMonth()) dateLabel = `${ds.getDate()}–${de.getDate()} ${MONTHS_SHORT[ds.getMonth()]}`;
        else dateLabel = `${ds.getDate()} ${MONTHS_SHORT[ds.getMonth()]} – ${de.getDate()} ${MONTHS_SHORT[de.getMonth()]}`;
        const past = String(e.date_end || e.date_start) < todayIso;
        return `
          <div class="ec-list-row${past ? ' ec-past' : ''}" style="--c:${st.color};--bg:${st.bg};--br:${st.border}">
            <div class="ec-list-date">${dateLabel}</div>
            <div class="ec-list-title">${escapeHtml(e.title)}</div>
            <div class="ec-list-meta">
              <span class="ec-tag" style="background:${st.bg};color:${st.color};border-color:${st.border}">${escapeHtml(e.department || '—')}</span>
              <span class="ec-tag ec-tag-cat">${escapeHtml(e.category || '—')}</span>
            </div>
          </div>
        `;
      }).join('');
      return `
        <div class="ec-list-group">
          <div class="ec-list-head">${MONTHS_LONG[m - 1]} ${y} <span class="ec-list-count">${evs.length}</span></div>
          ${rows}
        </div>
      `;
    }).join('');

    return `<div class="ec-list">${html}</div>`;
  }

  function listLegend() {
    return ''; // chips already serve as legend
  }

  function countsByYear() {
    const out = {};
    events.forEach(e => {
      const y = e.academicYear || '(unstamped)';
      out[y] = (out[y] || 0) + 1;
    });
    return out;
  }

  // ── Wiring ───────────────────────────────────────────────────────────────
  function wireChrome() {
    const root = document.getElementById('academic-calendar-mount');
    if (!root) return;

    root.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        view = btn.getAttribute('data-view');
        persistView();
        render();
      });
    });

    const toggleBtn = root.querySelector('[data-toggle-filters]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        filtersOpen = !filtersOpen;
        render();
      });
    }
    // Close on outside click
    if (filtersOpen) {
      const closer = (ev) => {
        const inside = ev.target.closest('.ec-chrome');
        if (!inside) {
          filtersOpen = false;
          document.removeEventListener('click', closer);
          render();
        }
      };
      setTimeout(() => document.addEventListener('click', closer), 0);
    }

    root.querySelectorAll('[data-strip-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-strip-nav');
        if (v === 'today') stripAnchor = monthKey(new Date());
        else stripAnchor += parseInt(v, 10) * 2;
        render();
      });
    });

    root.querySelectorAll('[data-month-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-month-nav');
        if (v === 'today') monthAnchor = monthKey(new Date());
        else monthAnchor += parseInt(v, 10);
        render();
      });
    });

    root.querySelectorAll('[data-dept]').forEach(chip => {
      chip.addEventListener('click', () => {
        const dept = chip.getAttribute('data-dept');
        const allDepts = Array.from(new Set(events.map(e => e.department).filter(Boolean)
          .filter(d => !Object.keys(CATEGORY_OVERRIDES).some(c => events.find(e => e.department === d && e.category === c)))));
        if (!activeFilters) activeFilters = new Set(allDepts);
        if (activeFilters.has(dept)) activeFilters.delete(dept);
        else activeFilters.add(dept);
        if (activeFilters.size === allDepts.length) activeFilters = null;
        persistFilters();
        render();
      });
    });

    root.querySelectorAll('[data-cat]').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-cat');
        const allCats = Array.from(new Set(events.map(e => e.category).filter(c => CATEGORY_OVERRIDES[c])));
        if (!activeCatFilters) activeCatFilters = new Set(allCats);
        if (activeCatFilters.has(cat)) activeCatFilters.delete(cat);
        else activeCatFilters.add(cat);
        if (activeCatFilters.size === allCats.length) activeCatFilters = null;
        persistFilters();
        render();
      });
    });

    root.querySelectorAll('[data-reset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const which = btn.getAttribute('data-reset');
        if (which === 'dept') activeFilters = null;
        if (which === 'cat')  activeCatFilters = null;
        persistFilters();
        render();
      });
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  async function boot() {
    render();
    try {
      events = await loadEvents();
      loaded = true;
      render();
    } catch (err) {
      console.error('[academic-calendar] load failed:', err);
      const mount = document.getElementById('academic-calendar-mount');
      if (mount) mount.innerHTML = `<div class="ec-empty"><div class="ec-empty-icon">⚠️</div><div>Could not load calendar events.</div><div class="ec-empty-hint">${escapeHtml(err.message || String(err))}</div></div>`;
    }
  }

  // AH/TH/CH all dispatch authReady on `document`. SH is the exception (window).
  // This script is currently consumed by AH/TH only.
  if (window.db) boot();
  else document.addEventListener('authReady', boot, { once: true });

  // ── Styles ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'academic-calendar-readonly-styles';
  style.textContent = `
    #academic-calendar-mount { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; color: #0f172a; max-width: 1280px; margin: 0 auto; padding: 12px 16px 16px; box-sizing: border-box; }
    .ec-loading { padding: 48px; text-align: center; color: #64748b; font-size: 14px; }
    .ec-empty { padding: 48px 24px; text-align: center; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; }
    .ec-empty-icon { font-size: 40px; margin-bottom: 12px; }
    .ec-empty-hint { font-size: 12px; margin-top: 6px; color: #94a3b8; }
    .ec-empty-pill { font-size: 11px; padding: 4px 10px; background: #fef3c7; color: #92400e; border-radius: 999px; }

    /* Compact one-row chrome */
    .ec-chrome { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(15,23,42,0.04); position: relative; }
    .ec-chrome-row { display: flex; align-items: center; gap: 16px; padding: 8px 12px; flex-wrap: nowrap; }

    .ec-year-chips { display: flex; gap: 4px; flex-shrink: 0; }
    .ec-year-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 7px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.02em; }
    .ec-year-dot { width: 5px; height: 5px; border-radius: 50%; background: #2563eb; }
    .ec-year-count { padding: 0 5px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; color: #0f172a; font-size: 9px; }

    .ec-nav-cluster { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center; min-width: 0; }
    .ec-nav-btn { padding: 4px 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; font-family: inherit; line-height: 1.4; }
    .ec-nav-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
    .ec-nav-arrow { padding: 2px 9px; font-size: 16px; line-height: 1; font-weight: 600; }
    .ec-nav-label { font-size: 13px; font-weight: 700; color: #0f172a; padding: 0 6px; white-space: nowrap; }
    .ec-nav-label-list { color: #64748b; font-weight: 500; font-style: italic; }
    .ec-nav-today { margin-left: 4px; }

    .ec-chrome-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .ec-filter-trigger { display: inline-flex; align-items: center; padding: 5px 11px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; font-family: inherit; }
    .ec-filter-trigger:hover { background: #f8fafc; border-color: #cbd5e1; }
    .ec-filter-trigger.is-active { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
    .ec-filter-trigger.is-open { background: #2563eb; border-color: #2563eb; color: #fff; }
    .ec-filter-active-badge { margin-left: 6px; padding: 1px 6px; background: rgba(255,255,255,0.25); border-radius: 999px; font-size: 10px; font-weight: 700; }
    .ec-filter-trigger:not(.is-open) .ec-filter-active-badge { background: #2563eb; color: #fff; }
    .ec-view-switch { display: flex; gap: 2px; background: #f1f5f9; padding: 2px; border-radius: 6px; }
    .ec-view-btn { padding: 4px 10px; border: none; background: transparent; font-size: 11px; font-weight: 700; color: #64748b; border-radius: 4px; cursor: pointer; font-family: inherit; letter-spacing: 0.02em; }
    .ec-view-btn.is-active { background: #fff; color: #0f172a; box-shadow: 0 1px 2px rgba(15,23,42,0.08); }

    /* Filter dropdown */
    .ec-filters-dropdown { position: absolute; top: calc(100% + 4px); right: 12px; left: auto; width: min(720px, calc(100vw - 32px)); background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; box-shadow: 0 8px 28px -8px rgba(15,23,42,0.18); z-index: 50; }
    .ec-filter-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: nowrap; padding: 6px 0; }
    .ec-filter-row + .ec-filter-row { border-top: 1px dashed #f1f5f9; }
    .ec-filter-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; min-width: 42px; padding-top: 5px; flex-shrink: 0; }
    .ec-chips { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
    .ec-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; background: var(--bg, #f1f5f9); border: 1px solid var(--br, #e2e8f0); color: var(--c, #475569); border-radius: 999px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; opacity: 0.45; transition: opacity 0.12s; }
    .ec-chip.is-active { opacity: 1; }
    .ec-chip:hover { opacity: 1; }
    .ec-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--c, #64748b); }
    .ec-filter-reset { padding: 3px 9px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 11px; font-weight: 600; color: #64748b; cursor: pointer; font-family: inherit; flex-shrink: 0; align-self: flex-start; }
    .ec-filter-reset:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Mobile: drop year chips + collapse nav cluster */
    @media (max-width: 720px) {
      .ec-chrome-row { flex-wrap: wrap; gap: 8px; padding: 8px 10px; }
      .ec-year-chips { order: 3; width: 100%; justify-content: flex-start; }
      .ec-nav-cluster { order: 1; flex: 1; justify-content: flex-start; }
      .ec-chrome-actions { order: 2; }
      .ec-nav-label { font-size: 12px; }
      .ec-filters-dropdown { right: 8px; left: 8px; width: auto; }
    }

    /* Strip + month views */
    .ec-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media (max-width: 900px) { .ec-strip { grid-template-columns: 1fr; } }
    .ec-month-solo { max-width: 720px; margin: 0 auto; }
    .ec-month { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
    .ec-month-head { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%); color: #fff; padding: 10px 14px; font-size: 14px; font-weight: 800; letter-spacing: -0.01em; }
    .ec-dow { display: grid; grid-template-columns: repeat(7, 1fr); padding: 6px 8px 4px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .ec-dow-cell { text-align: center; font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }
    .ec-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 6px; background: #fff; }
    .ec-cell { aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: #fff; border-radius: 6px; font-size: 12px; color: #475569; position: relative; border: 1px dashed transparent; }
    .ec-cell-empty { background: transparent; }
    .ec-cell.ec-has { background: var(--bg); border: 1px solid var(--br); color: var(--c); font-weight: 700; cursor: default; }
    .ec-cell.ec-today { outline: 2px solid #2563eb; outline-offset: -2px; }
    .ec-cell-num { font-size: 13px; }
    .ec-cell-count { font-size: 9px; padding: 1px 5px; background: rgba(255,255,255,0.7); border-radius: 999px; }
    .ec-month-events { padding: 8px 12px 12px; border-top: 1px solid #f1f5f9; max-height: 200px; overflow-y: auto; }
    .ec-month-empty { font-size: 11px; color: #94a3b8; font-style: italic; padding: 4px 0; }
    .ec-ev { display: flex; gap: 8px; align-items: baseline; padding: 4px 6px; font-size: 11px; border-radius: 4px; }
    .ec-ev + .ec-ev { margin-top: 2px; }
    .ec-ev-date { color: var(--c); font-weight: 800; min-width: 38px; }
    .ec-ev-title { color: #0f172a; }

    /* List view */
    .ec-list { display: flex; flex-direction: column; gap: 16px; }
    .ec-list-group { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
    .ec-list-head { padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; }
    .ec-list-count { padding: 2px 8px; background: #2563eb; color: #fff; border-radius: 999px; font-size: 10px; }
    .ec-list-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 12px; align-items: center; padding: 10px 16px; border-top: 1px solid #f1f5f9; }
    .ec-list-row:first-child { border-top: none; }
    .ec-list-row.ec-past { opacity: 0.55; }
    .ec-list-date { font-size: 12px; font-weight: 800; color: var(--c); }
    .ec-list-title { font-size: 13px; font-weight: 600; color: #0f172a; }
    .ec-list-meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .ec-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; border: 1px solid; }
    .ec-tag-cat { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
    @media (max-width: 640px) {
      .ec-list-row { grid-template-columns: 1fr; gap: 4px; }
      .ec-list-meta { margin-top: 4px; }
    }
  `;
  document.head.appendChild(style);
})();
