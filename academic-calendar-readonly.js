/**
 * academic-calendar-readonly.js
 *
 * Shared read-only Academic Calendar surface for AH + TH.
 *
 * Visual contract: mirrors CH /academic-calendar so the three hubs feel
 * like the same page minus admin tooling. Renders the CH hero banner
 * (navy gradient with eyebrow + Lora title + view switch) + filter
 * chip row + StripView (2-Month with current-month highlight,
 * continuation-cell dashed borders, multi-event dots, per-month foot
 * panel) + MonthView + ListView. NO admin buttons (sync / settings /
 * add) — those live exclusively at CH.
 *
 * Mount: <div id="academic-calendar-mount"></div>
 *
 * Source of truth: `calendar_events` Firestore collection. AH/TH wrappers
 * load this script via <script src="academic-calendar-readonly.js" defer>;
 * the wrapper's <body> must NOT carry inline `style="display:none"`
 * unless the wrapper also pairs it with `body.style.display = ''` in
 * authReady (see memory/feedback_body_display_pattern.md).
 *
 * Master source lives at monorepo /shared-design/; each hub's build.js
 * copies it to dist/. Edit the master + run sync-tokens.js --apply.
 */

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────
  const COLLECTION = 'calendar_events';
  const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW_LABELS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const STORAGE_VIEW    = 'eduversalAcademicCalView';
  const STORAGE_FILTERS = 'eduversalAcademicCalFilters';

  // CH's reduced taxonomy — events outside these 4 departments fall back
  // to 'Academic' colouring (mirrors CH's getEventStyle fallback).
  const DEPARTMENTS = {
    'Academic':            { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Academic' },
    'College Counseling':  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'College Counseling' },
    'Admin/Operations':    { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Admin / Operations' },
    'Cambridge':           { color: '#0891B2', bg: '#E0F9FF', border: '#A5F3FC', label: 'Cambridge' },
  };
  const CATEGORY_OVERRIDES = {
    'Public Holiday': { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    'Assessment':     { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  };
  // Filter keys live across both maps. Active = present in the Set. We
  // start with all 6 active by default.
  const ALL_FILTER_KEYS = [
    ...Object.keys(DEPARTMENTS),
    ...Object.keys(CATEGORY_OVERRIDES),
  ];

  // ── State ────────────────────────────────────────────────────────────────
  let events = [];
  let loaded = false;
  let view = 'strip';
  let stripAnchor = monthKey(new Date());
  let monthAnchor = monthKey(new Date());
  let activeFilters = new Set(ALL_FILTER_KEYS); // start fully on
  let popoverDay = null; // { year, month, day, events } when a tile is clicked

  try {
    const saved = localStorage.getItem(STORAGE_VIEW);
    if (saved && ['strip', 'month', 'list', 'all'].includes(saved)) view = saved;
  } catch (_) {}

  try {
    const savedFilters = JSON.parse(localStorage.getItem(STORAGE_FILTERS) || 'null');
    if (Array.isArray(savedFilters)) activeFilters = new Set(savedFilters.filter(k => ALL_FILTER_KEYS.includes(k)));
  } catch (_) {}

  // ── Utilities ────────────────────────────────────────────────────────────
  function monthKey(d) { return d.getFullYear() * 12 + d.getMonth(); }
  function unMonthKey(k) { return { year: Math.floor(k / 12), month: ((k % 12) + 12) % 12 }; }
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
  function eventFilterKey(ev) {
    if (CATEGORY_OVERRIDES[ev.category]) return ev.category;
    if (DEPARTMENTS[ev.department])      return ev.department;
    return 'Academic'; // fallback bucket — same as CH getEventStyle
  }
  function getEventStyle(ev) {
    if (CATEGORY_OVERRIDES[ev.category]) return CATEGORY_OVERRIDES[ev.category];
    return DEPARTMENTS[ev.department] || DEPARTMENTS['Academic'];
  }
  function eventMatchesFilters(ev) {
    return activeFilters.has(eventFilterKey(ev));
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function persistFilters() {
    try { localStorage.setItem(STORAGE_FILTERS, JSON.stringify(Array.from(activeFilters))); } catch (_) {}
  }
  function persistView() {
    try { localStorage.setItem(STORAGE_VIEW, view); } catch (_) {}
  }
  // ── Data load ────────────────────────────────────────────────────────────
  async function loadEvents() {
    const db = window.db;
    if (!db) throw new Error('window.db not ready');
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
    mount.innerHTML = hero() + viewBody() + popoverHtml();
    wireChrome();
  }

  // ── Popover (event detail) ───────────────────────────────────────────────
  function popoverHtml() {
    if (!popoverDay) return '';
    const { year, month, day, events: dayEvents, singleEvent } = popoverDay;
    const headDate = `${day} ${MONTHS_LONG[month]} ${year}`;
    const rows = dayEvents.map(ev => {
      const st = getEventStyle(ev);
      const ds = parseIso(ev.date_start);
      const de = parseIso(ev.date_end || ev.date_start) || ds;
      let span;
      if (isoDate(ds) === isoDate(de)) {
        span = `${ds.getDate()} ${MONTHS_SHORT[ds.getMonth()]} ${ds.getFullYear()}`;
      } else if (ds.getMonth() === de.getMonth() && ds.getFullYear() === de.getFullYear()) {
        span = `${ds.getDate()}–${de.getDate()} ${MONTHS_SHORT[ds.getMonth()]} ${ds.getFullYear()}`;
      } else {
        span = `${ds.getDate()} ${MONTHS_SHORT[ds.getMonth()]} – ${de.getDate()} ${MONTHS_SHORT[de.getMonth()]} ${de.getFullYear()}`;
      }
      const desc = ev.description ? `<div class="ec-pop-desc">${escapeHtml(ev.description)}</div>` : '';
      return `
        <div class="ec-pop-row" style="--c:${st.color};--bg:${st.bg};--br:${st.border}">
          <div class="ec-pop-row-head">
            <div class="ec-pop-title">${escapeHtml(ev.title || '(untitled event)')}</div>
            <div class="ec-pop-tags">
              <span class="ec-tag" style="background:${st.bg};color:${st.color};border-color:${st.border}">${escapeHtml(ev.department || '—')}</span>
              <span class="ec-tag ec-tag-cat">${escapeHtml(ev.category || '—')}</span>
            </div>
          </div>
          <div class="ec-pop-span">${span}</div>
          ${desc}
        </div>
      `;
    }).join('');
    const headLabel = singleEvent
      ? `Event detail`
      : `${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''} · ${headDate}`;
    return `
      <div class="ec-pop-overlay" data-pop-close="1">
        <div class="ec-pop-card" role="dialog" aria-modal="true" aria-label="Event details">
          <div class="ec-pop-head">
            <div class="ec-pop-head-label">${headLabel}</div>
            <button class="ec-pop-close" data-pop-close="1" aria-label="Close">×</button>
          </div>
          <div class="ec-pop-body">${rows}</div>
        </div>
      </div>
    `;
  }

  function hero() {
    const viewBtns = [
      ['strip', '2-Month'],
      ['month', '1-Month'],
      ['list',  'List'],
      ['all',   'All Events'],
    ].map(([v, label]) => `<button class="ec-view-btn${view === v ? ' is-active' : ''}" data-view="${v}">${label}</button>`).join('');

    const filterChips = ALL_FILTER_KEYS.map(key => {
      const cfg = DEPARTMENTS[key] || CATEGORY_OVERRIDES[key];
      const label = (cfg && cfg.label) || key;
      const active = activeFilters.has(key);
      return `<button class="ec-filter-chip${active ? ' is-active' : ''}" data-filter="${escapeHtml(key)}" style="--c:${cfg.color}">${escapeHtml(label)}</button>`;
    }).join('');

    // Host pages that already ship their own canonical .page-hero (e.g. AH)
    // set window.ACADEMIC_CAL_NO_HERO so the widget skips its own dark banner
    // and instead emits a single-line light toolbar (view switch + filter
    // chips) that sits directly under the page hero. TH keeps the dark hero.
    if (window.ACADEMIC_CAL_NO_HERO) {
      return `
        <div class="ec-toolbar">
          <div class="ec-view-switch ec-view-switch-light">${viewBtns}</div>
          <div class="ec-filter-row ec-filter-row-light">
            <span class="ec-filter-row-label">Filter:</span>
            ${filterChips}
          </div>
        </div>
      `;
    }

    return `
      <div class="ec-hero">
        <div class="ec-hero-top">
          <div class="ec-hero-left">
            <div class="ec-hero-eyebrow">Eduversal Indonesia</div>
            <h1 class="ec-hero-title">Academic Calendar 2025–2026</h1>
          </div>
          <div class="ec-hero-right">
            <div class="ec-view-switch">${viewBtns}</div>
          </div>
        </div>
        <div class="ec-filter-row">
          <span class="ec-filter-row-label">Filter:</span>
          ${filterChips}
        </div>
      </div>
    `;
  }

  function viewBody() {
    if (events.length === 0) {
      return `<div class="ec-empty"><div class="ec-empty-icon">📅</div><div>No events in Firestore yet.</div><div class="ec-empty-hint">CH admin can sync from Sheets at /academic-calendar.</div></div>`;
    }
    if (view === 'strip') return stripView();
    if (view === 'month') return monthView();
    if (view === 'list')  return listView({ upcomingOnly: true });
    if (view === 'all')   return listView({ upcomingOnly: false });
    return '';
  }

  // ── Strip view ───────────────────────────────────────────────────────────
  function stripView() {
    const a = unMonthKey(stripAnchor);
    const b = unMonthKey(stripAnchor + 1);
    return `
      <div class="ec-strip-wrap">
        <div class="ec-strip-nav">
          <button class="ec-nav-btn" data-strip-nav="-2">← Prev 2 months</button>
          <div class="ec-strip-label">${MONTHS_LONG[a.month]} ${a.year} – ${MONTHS_LONG[b.month]} ${b.year}</div>
          <button class="ec-nav-btn" data-strip-nav="2">Next 2 months →</button>
        </div>
        <div class="ec-strip-grid">
          ${stripMonth(a.year, a.month)}
          ${stripMonth(b.year, b.month)}
        </div>
      </div>
    `;
  }

  function stripMonth(year, month) {
    const today = new Date();
    const isCurrent = (today.getFullYear() === year && today.getMonth() === month);
    const firstDow = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Build per-day index — start vs continuation
    const byDay = {}, contByDay = {};
    events.filter(eventMatchesFilters).forEach(ev => {
      const start = parseIso(ev.date_start);
      const end   = parseIso(ev.date_end || ev.date_start) || start;
      if (!start) return;
      let cur = new Date(start);
      let isFirst = true;
      while (cur <= end) {
        const k = isoDate(cur);
        if (cur.getFullYear() === year && cur.getMonth() === month) {
          if (isFirst) (byDay[k] = byDay[k] || []).push(ev);
          else         (contByDay[k] = contByDay[k] || []).push(ev);
        }
        cur.setDate(cur.getDate() + 1);
        isFirst = false;
      }
    });

    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += `<div class="ec-cell ec-cell-empty"></div>`;

    const dayList = [];
    for (let d = 1; d <= lastDate; d++) {
      const k = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const startEvts = byDay[k] || [];
      const contEvts  = contByDay[k] || [];
      const allEvts   = [...startEvts, ...contEvts];
      const isToday   = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d);

      if (allEvts.length === 0) {
        cells += `<div class="ec-cell${isToday ? ' ec-today' : ''}">${d}</div>`;
      } else {
        const dominant = startEvts[0] || contEvts[0];
        const st = getEventStyle(dominant);
        const isContOnly = startEvts.length === 0;
        const cls = ['ec-cell', 'ec-has', isContOnly ? 'ec-cont' : 'ec-start', isToday ? 'ec-today' : ''].filter(Boolean).join(' ');
        const title = allEvts.map(e => e.title).join(' · ');
        const dot = allEvts.length > 1 ? `<span class="ec-multi-dot"></span>` : '';
        cells += `<div class="${cls}" style="--c:${st.color};--bg:${st.bg};--br:${st.border}" title="${escapeHtml(title)}" data-day-key="${year}-${month}-${d}" role="button" tabindex="0">${d}${dot}</div>`;
      }

      if (startEvts.length) startEvts.forEach(ev => dayList.push({ day: d, ev }));
    }

    const dowRow = DOW_LABELS.map(d => `<div class="ec-dow-cell">${d}</div>`).join('');
    const headerClass = isCurrent ? 'ec-month-header-current' : 'ec-month-header-default';

    let footHtml;
    if (dayList.length === 0) {
      footHtml = `<div class="ec-foot-empty">No events this month.</div>`;
    } else {
      footHtml = dayList.map(({ day, ev }) => {
        const st = getEventStyle(ev);
        let dayLabel = String(day);
        // Build the list of in-month days this event covers, so hover can
        // highlight every covered tile (multi-day events span several cells).
        const start = parseIso(ev.date_start);
        const end   = parseIso(ev.date_end || ev.date_start) || start;
        const covered = [];
        if (start && end) {
          const cur = new Date(start);
          while (cur <= end) {
            if (cur.getFullYear() === year && cur.getMonth() === month) covered.push(cur.getDate());
            cur.setDate(cur.getDate() + 1);
          }
        }
        const endParts = String(ev.date_end || ev.date_start).split('-').map(Number);
        if (ev.date_end && ev.date_end !== ev.date_start && endParts[0] === year && endParts[1] === month + 1) {
          dayLabel = `${day}-${endParts[2]}`;
        }
        const dayKeys = covered.map(d => `${year}-${month}-${d}`).join(',');
        return `<div class="ec-foot-row" data-foot-days="${dayKeys}" data-foot-event-id="${escapeHtml(ev.id || '')}" role="button" tabindex="0"><span class="ec-foot-day" style="color:${st.color}">${dayLabel}:</span><span class="ec-foot-title">${escapeHtml(ev.title)}</span></div>`;
      }).join('');
    }

    return `
      <div class="ec-month-card${isCurrent ? ' ec-month-current' : ''}">
        <div class="ec-month-header ${headerClass}">${MONTHS_LONG[month]}</div>
        <div class="ec-grid-wrap">
          <div class="ec-dow">${dowRow}</div>
          <div class="ec-grid">${cells}</div>
        </div>
        <div class="ec-foot">${footHtml}</div>
      </div>
    `;
  }

  // ── 1-Month view ─────────────────────────────────────────────────────────
  function monthView() {
    const { year, month } = unMonthKey(monthAnchor);
    return `
      <div class="ec-month-wrap">
        <div class="ec-strip-nav">
          <button class="ec-nav-btn" data-month-nav="-1">← Prev</button>
          <div class="ec-strip-label ec-strip-label-large">${MONTHS_LONG[month]} ${year}</div>
          <button class="ec-nav-btn" data-month-nav="1">Next →</button>
        </div>
        <div class="ec-strip-grid ec-strip-grid-single">
          ${stripMonth(year, month)}
        </div>
      </div>
    `;
  }

  // ── List view ────────────────────────────────────────────────────────────
  function listView(opts) {
    const upcomingOnly = !!opts.upcomingOnly;
    const todayIso = isoDate(new Date());
    const filtered = events
      .filter(eventMatchesFilters)
      .filter(e => upcomingOnly ? String(e.date_end || e.date_start) >= todayIso : true)
      .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));

    if (filtered.length === 0) {
      return `<div class="ec-empty"><div>${upcomingOnly ? 'No upcoming events with current filters.' : 'No events with current filters.'}</div></div>`;
    }

    const groups = {};
    filtered.forEach(e => {
      const k = String(e.date_start).slice(0, 7);
      (groups[k] = groups[k] || []).push(e);
    });

    const html = Object.entries(groups).map(([ym, evs]) => {
      const [y, m] = ym.split('-').map(Number);
      const rows = evs.map(e => {
        const st = getEventStyle(e);
        const ds = parseIso(e.date_start);
        const de = parseIso(e.date_end || e.date_start);
        let dateLabel;
        if (!de || isoDate(ds) === isoDate(de)) dateLabel = `${ds.getDate()} ${MONTHS_SHORT[ds.getMonth()]}`;
        else if (ds.getMonth() === de.getMonth() && ds.getFullYear() === de.getFullYear()) dateLabel = `${ds.getDate()}–${de.getDate()} ${MONTHS_SHORT[ds.getMonth()]}`;
        else dateLabel = `${ds.getDate()} ${MONTHS_SHORT[ds.getMonth()]} – ${de.getDate()} ${MONTHS_SHORT[de.getMonth()]}`;
        const past = String(e.date_end || e.date_start) < todayIso;
        return `
          <div class="ec-list-row${past ? ' ec-past' : ''}" style="--c:${st.color};--bg:${st.bg};--br:${st.border}" data-event-id="${escapeHtml(e.id || '')}" role="button" tabindex="0">
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

    return `<div class="ec-list-wrap">${html}</div>`;
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

    root.querySelectorAll('[data-strip-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        stripAnchor += parseInt(btn.getAttribute('data-strip-nav'), 10);
        render();
      });
    });

    root.querySelectorAll('[data-month-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        monthAnchor += parseInt(btn.getAttribute('data-month-nav'), 10);
        render();
      });
    });

    root.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-filter');
        if (activeFilters.has(key)) activeFilters.delete(key);
        else activeFilters.add(key);
        persistFilters();
        render();
      });
    });

    // Day-tile click → popover with that day's events (strip + 1-month views)
    root.querySelectorAll('[data-day-key]').forEach(cell => {
      const open = () => {
        const [yStr, mStr, dStr] = cell.getAttribute('data-day-key').split('-');
        const y = parseInt(yStr, 10), m = parseInt(mStr, 10), d = parseInt(dStr, 10);
        const dayEvents = events.filter(eventMatchesFilters).filter(ev => {
          const start = parseIso(ev.date_start);
          const end   = parseIso(ev.date_end || ev.date_start) || start;
          if (!start) return false;
          const target = new Date(y, m, d).getTime();
          return start.getTime() <= target && target <= end.getTime();
        });
        if (dayEvents.length === 0) return;
        popoverDay = { year: y, month: m, day: d, events: dayEvents, singleEvent: false };
        render();
      };
      cell.addEventListener('click', open);
      cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });

    // List-row click → popover with that single event
    root.querySelectorAll('[data-event-id]').forEach(row => {
      const open = () => {
        const id = row.getAttribute('data-event-id');
        const ev = events.find(e => e.id === id);
        if (!ev) return;
        const start = parseIso(ev.date_start);
        if (!start) return;
        popoverDay = {
          year: start.getFullYear(), month: start.getMonth(), day: start.getDate(),
          events: [ev], singleEvent: true,
        };
        render();
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });

    // Foot-row hover → highlight every tile this event covers (within the
    // same month card). Click opens the popover for that single event.
    root.querySelectorAll('[data-foot-days]').forEach(row => {
      const card = row.closest('.ec-month-card');
      if (!card) return;
      const keys = (row.getAttribute('data-foot-days') || '').split(',').filter(Boolean);
      const cells = keys.map(k => card.querySelector(`.ec-cell[data-day-key="${k}"]`)).filter(Boolean);
      const enter = () => { row.classList.add('ec-foot-row-hover'); cells.forEach(c => c.classList.add('ec-cell-foot-hover')); };
      const leave = () => { row.classList.remove('ec-foot-row-hover'); cells.forEach(c => c.classList.remove('ec-cell-foot-hover')); };
      row.addEventListener('mouseenter', enter);
      row.addEventListener('mouseleave', leave);
      row.addEventListener('focus', enter);
      row.addEventListener('blur',  leave);
      const open = () => {
        const id = row.getAttribute('data-foot-event-id');
        const ev = events.find(e => e.id === id);
        if (!ev) return;
        const start = parseIso(ev.date_start);
        if (!start) return;
        popoverDay = {
          year: start.getFullYear(), month: start.getMonth(), day: start.getDate(),
          events: [ev], singleEvent: true,
        };
        render();
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });

    // Popover dismiss (overlay click, × button, Escape)
    root.querySelectorAll('[data-pop-close]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target !== el) return; // click inside the card shouldn't close
        popoverDay = null;
        render();
      });
    });
    if (popoverDay) {
      if (window.__ecPopKeyHandler) document.removeEventListener('keydown', window.__ecPopKeyHandler);
      window.__ecPopKeyHandler = e => {
        if (e.key === 'Escape') {
          popoverDay = null;
          document.removeEventListener('keydown', window.__ecPopKeyHandler);
          window.__ecPopKeyHandler = null;
          render();
        }
      };
      document.addEventListener('keydown', window.__ecPopKeyHandler);
    }
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

  if (window.db) boot();
  else document.addEventListener('authReady', boot, { once: true });

  // ── Styles ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'academic-calendar-readonly-styles';
  style.textContent = `
    #academic-calendar-mount { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; color: #0f172a; }
    .ec-loading { padding: 48px; text-align: center; color: #64748b; font-size: 14px; }
    .ec-empty { padding: 48px 24px; text-align: center; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; margin: 16px 24px; }
    .ec-empty-icon { font-size: 40px; margin-bottom: 12px; }
    .ec-empty-hint { font-size: 12px; margin-top: 6px; color: #94a3b8; }

    /* ── Hero banner — mirrors CH header ── */
    .ec-hero {
      background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1D4ED8 100%);
      color: #fff; padding: 28px 32px 24px;
    }
    .ec-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .ec-hero-left { flex: 1; min-width: 280px; }
    .ec-hero-eyebrow {
      font-size: 11px; font-weight: 700; color: #93C5FD;
      letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 4px;
    }
    .ec-hero-title {
      font-family: 'Lora', 'Times New Roman', serif;
      font-size: 26px; font-weight: 800; letter-spacing: -0.5px;
      margin: 0; color: #fff;
    }
    .ec-hero-right { flex-shrink: 0; }
    .ec-view-switch {
      display: flex; gap: 6px;
      background: rgba(255,255,255,0.1); border-radius: 10px; padding: 4px;
    }
    .ec-view-btn {
      padding: 7px 16px; border: none; cursor: pointer;
      background: transparent; color: rgba(255,255,255,0.7);
      font-weight: 700; font-size: 13px; border-radius: 7px;
      font-family: inherit; transition: all 0.15s;
    }
    .ec-view-btn.is-active { background: #fff; color: #1E3A5F; }
    .ec-view-btn:hover:not(.is-active) { color: #fff; }

    .ec-filter-row {
      display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    }
    .ec-filter-row-label {
      font-size: 12px; color: #CBD5E1; font-weight: 600; margin-right: 4px;
    }
    .ec-filter-chip {
      padding: 6px 14px; border-radius: 999px; border: 1.5px solid transparent;
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.55);
      font-size: 12px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: all 0.15s;
      opacity: 0.65;
    }
    .ec-filter-chip:hover { opacity: 1; }
    .ec-filter-chip.is-active {
      background: var(--c); color: #fff; border-color: var(--c);
      opacity: 1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    }

    /* ── Light toolbar (host supplies its own page hero) ── */
    /* Single line under the page hero: view switch on the left, filter
       chips on the right. Used when window.ACADEMIC_CAL_NO_HERO is set. */
    .ec-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px;
      max-width: 1200px; margin: 0 auto; padding: 16px 24px 4px;
    }
    .ec-view-switch-light {
      background: #EEF2F7; border: 1px solid #E2E8F0;
    }
    .ec-view-switch-light .ec-view-btn { color: #475569; }
    .ec-view-switch-light .ec-view-btn.is-active {
      background: #fff; color: #1E3A5F;
      box-shadow: 0 1px 2px rgba(15,23,42,0.12);
    }
    .ec-view-switch-light .ec-view-btn:hover:not(.is-active) { color: #0F172A; }
    .ec-filter-row-light .ec-filter-row-label { color: #64748B; }
    .ec-filter-row-light .ec-filter-chip {
      background: #fff; border: 1.5px solid #E2E8F0;
      color: #64748B; opacity: 1;
    }
    .ec-filter-row-light .ec-filter-chip:hover {
      border-color: var(--c); color: var(--c);
    }
    .ec-filter-row-light .ec-filter-chip.is-active {
      background: var(--c); color: #fff; border-color: var(--c);
    }
    @media (max-width: 640px) {
      .ec-toolbar { padding: 12px 12px 4px; }
    }

    /* ── Strip view ── */
    .ec-strip-wrap { max-width: 1200px; margin: 0 auto; padding: 20px 24px 32px; }
    .ec-strip-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .ec-strip-label { font-size: 14px; font-weight: 700; color: #0F172A; }
    .ec-strip-label-large { font-size: 22px; font-weight: 800; }
    .ec-nav-btn {
      padding: 7px 14px; background: #fff; border: 1px solid #E2E8F0;
      border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .ec-nav-btn:hover { background: #f8fafc; border-color: #CBD5E1; color: #0F172A; }

    .ec-strip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .ec-strip-grid-single { grid-template-columns: minmax(0, 720px); justify-content: center; }
    @media (max-width: 900px) { .ec-strip-grid { grid-template-columns: 1fr; gap: 18px; } }

    /* ── Month card ── */
    .ec-month-card {
      background: #fff; border: 1px solid #E2E8F0; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;
    }
    .ec-month-current {
      border-color: #2563EB;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15), 0 1px 3px rgba(0,0,0,0.06);
    }
    .ec-month-header {
      color: #fff; text-align: center; padding: 10px 14px;
      font-size: 13px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
    }
    .ec-month-header-current { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); }
    .ec-month-header-default { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }

    .ec-grid-wrap { padding: 10px; background: #F1F5F9; }
    .ec-dow { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
    .ec-dow-cell {
      text-align: center; padding: 6px 0 4px;
      font-size: 10px; font-weight: 700; color: #64748B;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .ec-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
    .ec-cell {
      aspect-ratio: 1 / 1; min-height: 36px;
      background: #fff; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 500; color: #0F172A;
      position: relative; transition: transform 0.1s;
    }
    .ec-cell-empty { background: transparent; }
    .ec-cell.ec-has.ec-start {
      background: var(--c); color: #fff; font-weight: 700; cursor: default;
    }
    .ec-cell.ec-has.ec-cont {
      background: #fff; color: #0F172A;
    }
    .ec-cell.ec-has.ec-cont::before {
      content: ''; position: absolute; inset: 2px;
      border: 2px dashed var(--c); opacity: 0.55; border-radius: 5px; pointer-events: none;
    }
    .ec-cell.ec-today {
      outline: 2px solid #2563EB; outline-offset: -2px;
    }
    .ec-cell.ec-has.ec-start.ec-today {
      outline-color: #fff; box-shadow: 0 0 0 2px #2563EB;
    }
    .ec-cell.ec-has:hover { transform: scale(1.06); z-index: 2; }
    .ec-multi-dot {
      position: absolute; top: 3px; right: 3px;
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(255,255,255,0.85);
    }
    .ec-cell.ec-cont .ec-multi-dot { background: #0F172A; }

    .ec-foot {
      padding: 12px 16px; border-top: 1px solid #E2E8F0;
      max-height: 220px; overflow-y: auto;
    }
    .ec-foot-empty { font-size: 12px; color: #94A3B8; font-style: italic; }
    .ec-foot-row {
      display: flex; gap: 8px; align-items: flex-start;
      font-size: 12.5px; line-height: 1.4; padding: 4px 0;
    }
    .ec-foot-day { font-weight: 700; min-width: 36px; flex-shrink: 0; }
    .ec-foot-title { color: #0F172A; flex: 1; }

    /* ── 1-Month wrapper ── */
    .ec-month-wrap { max-width: 900px; margin: 0 auto; padding: 20px 24px 32px; }

    /* Tile click affordance — only event cells get a pointer */
    .ec-cell[data-day-key] { cursor: pointer; transition: transform 0.08s, box-shadow 0.12s, outline 0.08s; }
    .ec-cell[data-day-key]:hover { transform: scale(1.04); box-shadow: 0 4px 10px rgba(15,23,42,0.18); z-index: 2; }
    .ec-cell[data-day-key]:focus-visible { outline: 2px solid #2563EB; outline-offset: 2px; z-index: 3; }
    /* Reverse hover — foot-row hover scales + outlines every covered tile */
    .ec-cell.ec-cell-foot-hover {
      transform: scale(1.08);
      box-shadow: 0 6px 14px rgba(15,23,42,0.22);
      outline: 2px solid var(--c, #2563EB); outline-offset: 2px;
      z-index: 2;
    }
    /* Foot-row hover affordance */
    .ec-foot-row { cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.1s; }
    .ec-foot-row:hover, .ec-foot-row-hover { background: #F1F5F9; }
    .ec-foot-row:focus-visible { outline: 2px solid #2563EB; outline-offset: -2px; }
    .ec-list-row[data-event-id] { cursor: pointer; }
    .ec-list-row[data-event-id]:hover { background: #F8FAFC; }
    .ec-list-row[data-event-id]:focus-visible { outline: 2px solid #2563EB; outline-offset: -2px; }

    /* ── Popover (event detail) ── */
    .ec-pop-overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,0.55);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; z-index: 1000;
      animation: ecPopFade 0.12s ease-out;
    }
    @keyframes ecPopFade { from { opacity: 0; } to { opacity: 1; } }
    .ec-pop-card {
      background: #fff; border-radius: 14px; max-width: 520px; width: 100%;
      max-height: calc(100vh - 48px); overflow: hidden;
      box-shadow: 0 30px 80px rgba(0,0,0,0.35);
      display: flex; flex-direction: column;
      animation: ecPopIn 0.15s ease-out;
    }
    @keyframes ecPopIn { from { transform: translateY(8px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
    .ec-pop-head {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 18px; border-bottom: 1px solid #E2E8F0;
      background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%); color: #fff;
    }
    .ec-pop-head-label { font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
    .ec-pop-close {
      background: rgba(255,255,255,0.12); color: #fff; border: none;
      width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
      font-size: 20px; line-height: 1; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
    }
    .ec-pop-close:hover { background: rgba(255,255,255,0.22); }
    .ec-pop-body { padding: 16px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .ec-pop-row {
      padding: 12px 14px; border-radius: 10px;
      background: var(--bg); border: 1px solid var(--br); border-left: 4px solid var(--c);
    }
    .ec-pop-row-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .ec-pop-title { font-size: 15px; font-weight: 700; color: #0F172A; flex: 1; min-width: 200px; }
    .ec-pop-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .ec-pop-span { font-size: 12px; font-weight: 600; color: var(--c); margin-top: 6px; }
    .ec-pop-desc { font-size: 13px; color: #334155; margin-top: 8px; line-height: 1.5; white-space: pre-wrap; }

    /* ── List view ── */
    .ec-list-wrap { max-width: 900px; margin: 0 auto; padding: 20px 24px 32px; display: flex; flex-direction: column; gap: 16px; }
    .ec-list-group { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .ec-list-head { padding: 10px 16px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 8px; }
    .ec-list-count { padding: 2px 8px; background: #2563EB; color: #fff; border-radius: 999px; font-size: 10px; }
    .ec-list-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 12px; align-items: center; padding: 10px 16px; border-top: 1px solid #F1F5F9; }
    .ec-list-row:first-child { border-top: none; }
    .ec-list-row.ec-past { opacity: 0.55; }
    .ec-list-date { font-size: 12px; font-weight: 800; color: var(--c); }
    .ec-list-title { font-size: 13px; font-weight: 600; color: #0F172A; }
    .ec-list-meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .ec-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; border: 1px solid; }
    .ec-tag-cat { background: #F1F5F9; color: #64748B; border-color: #E2E8F0; }
    @media (max-width: 640px) {
      .ec-list-row { grid-template-columns: 1fr; gap: 4px; }
      .ec-list-meta { margin-top: 4px; }
      .ec-hero { padding: 20px 18px; }
      .ec-hero-title { font-size: 20px; }
      .ec-strip-wrap, .ec-month-wrap, .ec-list-wrap { padding: 16px 12px 24px; }
    }
  `;
  document.head.appendChild(style);
})();
