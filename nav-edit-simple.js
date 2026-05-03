/* ================================================================
   nav-edit-simple.js — Simple in-place navbar editor
   Source of truth: monorepo /shared-design/nav-edit-simple.js
   ----------------------------------------------------------------
   Used by Academic Hub and Teachers Hub. Each hub's build.js copies
   this file into dist/. Central Hub has its own richer editor (with
   columns + nested submenu groups) embedded in its navbar partial —
   that one is NOT replaced by this module.

   What this gives a hub admin:
   - Toggle edit mode via #btnNavEdit (rendered by the hub's navbar
     partial, shown only to admins).
   - Inline label rename (contentEditable on .nav-item-label).
   - Hide / show item (eye-toggle button in edit mode; saved as
     `hidden: true`; runtime hides via `display: none`).
   - Drag-reorder within the same dropdown panel (cross-dropdown moves
     are blocked — admin must rename / hide instead).
   - Save → batched setDoc to nav_config/{platform}.
   - Discard → restore the snapshot taken on enterEditMode.

   Doc shape (AH/TH):
     nav_config/{platform}: {
       platform,
       items: [{ key, label, hidden }],   // ordered, no group
       updatedAt
     }

   The host page provides:
     - window.db, window.userProfile  (already set by auth-guard.js)
     - DOM elements with `[data-nav-key]` (one per item; live in
       dropdown panels with the hub's own class names).
     - Buttons #btnNavEdit, #btnNavSave, #btnNavDiscard, #navEditBar.
     - A function `getDropdownPanels()` (or default selector list) so
       this module knows where the items live for drag-reorder.

   Usage:
     import('/nav-edit-simple.js').then(({ initNavEditor }) => {
       initNavEditor({
         platform: 'academichub',
         itemSelector: '.nav-dropdown-item[data-nav-key]',
         panelSelector: '.nav-dropdown-content',  // sibling that contains items
         isAdmin: window.userProfile?.role_academichub === 'academic_admin',
       });
     });
   ================================================================ */

import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export function initNavEditor({ platform, itemSelector, panelSelector, isAdmin }) {
  if (!platform || !itemSelector || !panelSelector) {
    console.warn('[nav-edit-simple] missing config', { platform, itemSelector, panelSelector });
    return;
  }

  const DOC_PATH = `nav_config/${platform}`;
  let editMode = false;
  let snapshot = null; // { items, hiddenKeys, parentMap, indexMap } — for discard

  // ── Load + apply config on auth-ready ────────────────────────────
  loadAndApply();

  async function loadAndApply() {
    const db = window.db;
    if (!db) {
      // auth-guard hasn't initialised yet — wait for authReady
      document.addEventListener('authReady', loadAndApply, { once: true });
      return;
    }
    try {
      const snap = await getDoc(doc(db, DOC_PATH));
      if (snap.exists()) applyConfig(snap.data());
    } catch (e) {
      console.warn('[nav-edit-simple] load error', e);
    }

    // Show edit button (admin only). Button itself is rendered by the
    // navbar partial with the `hidden` HTML attribute; remove it for admins
    // and add `.visible` so the CSS-based show/hide also matches.
    if (isAdmin) {
      const editBtn = document.getElementById('btnNavEdit');
      if (editBtn) {
        editBtn.removeAttribute('hidden');
        editBtn.classList.add('visible');
      }
    }

    wireButtons();
  }

  // ── Apply saved config to the DOM ────────────────────────────────
  // We don't reorder DOM nodes across panels — only within the panel
  // we found the item in. This matches the (α) policy: in-panel reorder.
  function applyConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.items)) return;
    const labelByKey = {};
    const hiddenByKey = {};
    const orderByKey = {};
    cfg.items.forEach((it, idx) => {
      if (!it || !it.key) return;
      if (typeof it.label === 'string') labelByKey[it.key] = it.label;
      if (it.hidden === true)           hiddenByKey[it.key] = true;
      orderByKey[it.key] = idx;
    });

    // Group items by their parent panel so we can reorder per-panel.
    const items = Array.from(document.querySelectorAll(itemSelector));
    const byPanel = new Map();
    items.forEach(item => {
      const key = item.dataset.navKey;
      // Apply label
      const lbl = item.querySelector('.nav-item-label, .submenu-label')
                 || (item.firstElementChild?.classList?.contains('nav-item-label') ? item.firstElementChild : null);
      if (labelByKey[key] !== undefined && lbl) lbl.textContent = labelByKey[key];
      else if (labelByKey[key] !== undefined && !lbl) {
        // Fall back: rewrite the last text node in the anchor.
        setLastTextNode(item, labelByKey[key]);
      }
      // Apply hidden
      if (hiddenByKey[key]) item.dataset.navHidden = '1';
      else                  delete item.dataset.navHidden;

      // Group for reordering
      const panel = item.closest(panelSelector);
      if (!panel) return;
      if (!byPanel.has(panel)) byPanel.set(panel, []);
      byPanel.get(panel).push(item);
    });

    // Reorder per panel (only items whose key is in orderByKey are
    // touched; items not yet in cfg keep their source order at the end).
    byPanel.forEach((panelItems, panel) => {
      const ordered = [...panelItems].sort((a, b) => {
        const aKey = a.dataset.navKey, bKey = b.dataset.navKey;
        const aHas = aKey in orderByKey, bHas = bKey in orderByKey;
        if (aHas && bHas) return orderByKey[aKey] - orderByKey[bKey];
        if (aHas) return -1;
        if (bHas) return 1;
        return panelItems.indexOf(a) - panelItems.indexOf(b);
      });
      ordered.forEach(it => panel.appendChild(it));
    });

    ensureHiddenStyles();
  }

  // ── Persist current DOM state back to Firestore ──────────────────
  function getCurrentConfig() {
    // Walk the items in DOM order; `hidden` comes from data-nav-hidden.
    const items = Array.from(document.querySelectorAll(itemSelector));
    return {
      platform,
      items: items.map(item => ({
        key:    item.dataset.navKey,
        label:  readLabel(item),
        hidden: item.dataset.navHidden === '1',
      })),
      updatedAt: serverTimestamp(),
    };
  }

  function readLabel(item) {
    const lbl = item.querySelector('.nav-item-label, .submenu-label');
    if (lbl) return lbl.textContent.trim();
    return getLastTextNode(item)?.trim() || '';
  }

  function getLastTextNode(node) {
    let txt = '';
    node.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) txt = n.textContent.trim();
    });
    return txt;
  }

  function setLastTextNode(node, value) {
    let last = null;
    node.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) last = n;
    });
    if (last) last.textContent = ' ' + value;
    else      node.appendChild(document.createTextNode(value));
  }

  // ── Edit mode toggle ─────────────────────────────────────────────
  function wireButtons() {
    document.getElementById('btnNavEdit')?.addEventListener('click', () => {
      if (!isAdmin) return;
      editMode ? exitEditMode(false) : enterEditMode();
    });
    document.getElementById('btnNavSave')?.addEventListener('click', () => exitEditMode(true));
    document.getElementById('btnNavDiscard')?.addEventListener('click', () => exitEditMode(false));
  }

  function enterEditMode() {
    editMode = true;
    snapshot = getCurrentConfig();

    document.body.classList.add('nav-edit-mode');
    document.getElementById('btnNavEdit')?.classList.add('active');
    const bar = document.getElementById('navEditBar');
    if (bar) {
      bar.removeAttribute('hidden');
      bar.classList.add('open');
    }

    document.querySelectorAll(itemSelector).forEach(initEditableItem);
  }

  async function exitEditMode(save) {
    editMode = false;

    document.querySelectorAll(itemSelector).forEach(teardownEditableItem);
    document.body.classList.remove('nav-edit-mode');
    document.getElementById('btnNavEdit')?.classList.remove('active');
    const bar = document.getElementById('navEditBar');
    if (bar) {
      bar.classList.remove('open');
      bar.setAttribute('hidden', '');
    }

    if (!save && snapshot) {
      // Re-apply snapshot (label rollback + reorder rollback + hidden rollback).
      applyConfig(snapshot);
      snapshot = null;
      return;
    }

    if (save && window.db) {
      try {
        await setDoc(doc(window.db, DOC_PATH), getCurrentConfig());
      } catch (e) {
        console.error('[nav-edit-simple] save error', e);
      }
    }
    snapshot = null;
  }

  // ── Per-item edit affordances ───────────────────────────────────
  function initEditableItem(item) {
    if (item._navEditInit) return;
    item._navEditInit = true;

    // Stash and remove href so the <a> cannot navigate while editing.
    if (item.hasAttribute('href')) {
      item.dataset.navHref = item.getAttribute('href');
      item.removeAttribute('href');
    }
    item.setAttribute('draggable', 'true');
    item.addEventListener('click',     blockNav, true);
    item.addEventListener('dragstart', onDragStart);
    item.addEventListener('dragover',  onDragOver);
    item.addEventListener('dragleave', onDragLeave);
    item.addEventListener('drop',      onDrop);
    item.addEventListener('dragend',   onDragEnd);

    // Inline editable label
    const lbl = item.querySelector('.nav-item-label, .submenu-label');
    if (lbl) {
      lbl.contentEditable = 'true';
      lbl.addEventListener('keydown', onLabelKeyDown);
      lbl.addEventListener('mousedown', e => {
        e.stopPropagation();
        item.draggable = false;
      });
      lbl.addEventListener('blur',  () => { item.draggable = true; });
      lbl.addEventListener('focus', () => { item.draggable = false; });
    }

    // Hide / show toggle button (rendered into the item; removed on teardown)
    if (!item.querySelector('.nav-edit-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-edit-toggle';
      btn.title = item.dataset.navHidden === '1' ? 'Show this item' : 'Hide this item';
      btn.innerHTML = item.dataset.navHidden === '1' ? eyeOffSvg() : eyeOnSvg();
      btn.addEventListener('mousedown', e => e.stopPropagation()); // don't start drag
      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const nowHidden = item.dataset.navHidden !== '1';
        if (nowHidden) item.dataset.navHidden = '1';
        else           delete item.dataset.navHidden;
        btn.title = nowHidden ? 'Show this item' : 'Hide this item';
        btn.innerHTML = nowHidden ? eyeOffSvg() : eyeOnSvg();
      });
      item.appendChild(btn);
    }
  }

  function teardownEditableItem(item) {
    item._navEditInit = false;
    item.removeAttribute('draggable');
    item.removeEventListener('click',     blockNav, true);
    item.removeEventListener('dragstart', onDragStart);
    item.removeEventListener('dragover',  onDragOver);
    item.removeEventListener('dragleave', onDragLeave);
    item.removeEventListener('drop',      onDrop);
    item.removeEventListener('dragend',   onDragEnd);
    if (item.dataset.navHref) {
      item.setAttribute('href', item.dataset.navHref);
      delete item.dataset.navHref;
    }
    item.classList.remove('dragging', 'drag-over');
    const lbl = item.querySelector('.nav-item-label, .submenu-label');
    if (lbl) {
      lbl.contentEditable = 'false';
      lbl.removeEventListener('keydown', onLabelKeyDown);
    }
    item.querySelector('.nav-edit-toggle')?.remove();
  }

  function blockNav(e) { e.preventDefault(); e.stopPropagation(); }
  function onLabelKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  }

  // ── Drag handlers (in-panel only) ────────────────────────────────
  let dragSrc = null;
  function samePanel(a, b) {
    return a && b && a.closest(panelSelector) && a.closest(panelSelector) === b.closest(panelSelector);
  }
  function onDragStart(e) {
    dragSrc = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.navKey);
  }
  function onDragOver(e) {
    if (!dragSrc || dragSrc === this) return;
    if (!samePanel(dragSrc, this))    return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
  }
  function onDragLeave() { this.classList.remove('drag-over'); }
  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
    if (!dragSrc || dragSrc === this) return;
    if (!samePanel(dragSrc, this))    return;
    const tgtParent = this.parentNode;
    const srcParent = dragSrc.parentNode;
    const tgtItems  = Array.from(tgtParent.querySelectorAll(itemSelector));
    const srcItems  = Array.from(srcParent.querySelectorAll(itemSelector));
    const srcIdx    = srcItems.indexOf(dragSrc);
    const tgtIdx    = tgtItems.indexOf(this);
    if (tgtParent === srcParent && srcIdx < tgtIdx) this.after(dragSrc);
    else                                            tgtParent.insertBefore(dragSrc, this);
  }
  function onDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragSrc = null;
  }

  // ── Inject one-time style block (hidden items + edit affordances) ─
  function ensureHiddenStyles() {
    if (document.getElementById('navEditSimpleStyles')) return;
    const s = document.createElement('style');
    s.id = 'navEditSimpleStyles';
    s.textContent = `
      [data-nav-hidden="1"] { display: none !important; }
      body.nav-edit-mode [data-nav-hidden="1"] { display: flex !important; opacity: .45; }
      body.nav-edit-mode [data-nav-key] { position: relative; cursor: grab; }
      body.nav-edit-mode [data-nav-key].dragging  { opacity: 0.4; }
      body.nav-edit-mode [data-nav-key].drag-over { outline: 2px dashed var(--accent, #6c5ce7); outline-offset: 2px; border-radius: 6px; }
      body.nav-edit-mode .nav-edit-toggle {
        position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
        width: 22px; height: 22px; padding: 0;
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
        border-radius: 4px; color: rgba(255,255,255,0.7);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; z-index: 10;
      }
      body.nav-edit-mode .nav-edit-toggle:hover { color: #fff; background: rgba(255,255,255,0.18); }
      body.nav-edit-mode .nav-edit-toggle svg { width: 12px; height: 12px; }
      /* For light navbars (TH), invert the eye-toggle palette. */
      .nav-light body.nav-edit-mode .nav-edit-toggle,
      body.nav-light.nav-edit-mode .nav-edit-toggle {
        background: rgba(28,28,46,0.05); border-color: rgba(28,28,46,0.12); color: rgba(28,28,46,0.55);
      }
      .nav-light body.nav-edit-mode .nav-edit-toggle:hover,
      body.nav-light.nav-edit-mode .nav-edit-toggle:hover {
        background: rgba(28,28,46,0.10); color: var(--ink, #1c1c2e);
      }
      #btnNavEdit, #btnNavSave, #btnNavDiscard {
        display: none;
      }
      #btnNavEdit.visible { display: inline-flex; }
      #navEditBar {
        position: fixed; bottom: 22px; right: 22px;
        background: var(--ink, #1c1c2e); color: #fff;
        padding: 10px 14px; border-radius: 10px;
        box-shadow: 0 10px 40px rgba(0,0,0,.35);
        display: none; gap: 8px; align-items: center;
        z-index: 9999;
      }
      #navEditBar.open { display: flex; }
      #navEditBar button { display: inline-flex; }
      #navEditBar #btnNavSave {
        background: linear-gradient(135deg,#7c3aed,#0891b2); color:#fff; border:none;
        padding: 7px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;
        cursor: pointer; font-family: inherit;
      }
      #navEditBar #btnNavDiscard {
        background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.18);
        padding: 7px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;
        cursor: pointer; font-family: inherit;
      }
      #navEditBar #btnNavDiscard:hover { color: #fff; border-color: rgba(255,255,255,0.4); }
      #navEditBar .nav-edit-hint { font-size: 0.78rem; color: rgba(255,255,255,0.6); margin-right: 4px; }
    `;
    document.head.appendChild(s);
  }
  ensureHiddenStyles();

  // ── Tiny SVG helpers ─────────────────────────────────────────────
  function eyeOnSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
  function eyeOffSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  }
}
