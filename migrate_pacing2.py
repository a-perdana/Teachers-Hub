#!/usr/bin/env python3
"""
migrate_pacing2.py
Second-pass fix: handles items the first script couldn't apply.
Targets the 10 pacing files that already went through migrate_pacing.py.
"""

import re
import os

BASE = os.path.dirname(os.path.abspath(__file__))

FILE_CONFIGS = {
    'checkpoint-english-pacing.html': {
        'col': 'checkpoint_english_pacing', 'doc': 'year7-8',
        'statuses_key': 'checkpoint_english_statuses',
    },
    'checkpoint-science-pacing.html': {
        'col': 'checkpoint_science_pacing', 'doc': 'year7-8',
        'statuses_key': 'checkpoint_science_statuses',
    },
    'igcse-math-pacing.html': {
        'col': 'math_pacing', 'doc': 'year9-10',
        'statuses_key': 'statuses',
    },
    'igcse-biology-pacing.html': {
        'col': 'biology_pacing', 'doc': 'year9-10',
        'statuses_key': 'bio_statuses',
    },
    'igcse-chemistry-pacing.html': {
        'col': 'chemistry_pacing', 'doc': 'year9-10',
        'statuses_key': 'chem_statuses',
    },
    'igcse-physics-pacing.html': {
        'col': 'physics_pacing', 'doc': 'year9-10',
        'statuses_key': 'phys_statuses',
    },
    'asalevel-math-pacing.html': {
        'col': 'asalevel_math_pacing', 'doc': 'year11-12',
        'statuses_key': 'asmath_statuses',
    },
    'asalevel-biology-pacing.html': {
        'col': 'asalevel_biology_pacing', 'doc': 'year11-12',
        'statuses_key': 'asbio_statuses',
    },
    'asalevel-chemistry-pacing.html': {
        'col': 'asalevel_chemistry_pacing', 'doc': 'year11-12',
        'statuses_key': 'aschem_statuses',
    },
    'asalevel-physics-pacing.html': {
        'col': 'asalevel_physics_pacing', 'doc': 'year11-12',
        'statuses_key': 'asphys_statuses',
    },
}


def make_fb_helpers(col, doc_id, sk):
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
      doc(db, '{col}', '{doc_id}'),
      {{ classes: list, updatedAt: serverTimestamp() }},
      {{ merge: true }}
    );
  }} catch(e) {{ console.error('Class list save error:', e); }}
}};
"""


def fix_file(filename, cfg):
    path = os.path.join(BASE, filename)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()

    original_lines = src.count('\n')
    changes = []

    col = cfg['col']
    doc_id = cfg['doc']
    sk = cfg['statuses_key']

    # ── Fix 1: render() — add renderPaceSummary() and renderCoverage()
    # Find the exact render() function
    render_body_match = re.search(
        r'(function render\(\) \{(?:[^}]|\n)*?\})',
        src,
        re.MULTILINE
    )
    if render_body_match:
        rb = render_body_match.group(1)
        rb_new = rb
        if 'renderPaceSummary()' not in rb_new:
            rb_new = rb_new.replace(
                '  renderProgress();\n',
                '  renderProgress();\n  renderPaceSummary();\n'
            )
            changes.append('render(): add renderPaceSummary()')
        if 'renderCoverage()' not in rb_new:
            # Add before closing brace
            rb_new = rb_new[:-1] + '  renderCoverage();\n}'
            changes.append('render(): add renderCoverage()')
        if rb_new != rb:
            src = src[:render_body_match.start()] + rb_new + src[render_body_match.end():]

    # ── Fix 2: applyRole — add buildClassSelector() before render()
    apply_role_match = re.search(r'function applyRole\(r\) \{', src)
    if apply_role_match:
        # Find end of function
        depth = 0
        i = apply_role_match.start()
        fn_end = len(src)
        while i < len(src):
            if src[i] == '{': depth += 1
            elif src[i] == '}':
                depth -= 1
                if depth == 0:
                    fn_end = i + 1
                    break
            i += 1
        fn_body = src[apply_role_match.start():fn_end]
        if 'buildClassSelector()' not in fn_body:
            # Find "  render();" inside the function
            render_call = re.search(r'(\n  render\(\);)', fn_body)
            if render_call:
                abs_pos = apply_role_match.start() + render_call.start()
                src = src[:abs_pos] + '\n  buildClassSelector();' + src[abs_pos:]
                changes.append('applyRole(): add buildClassSelector()')

    # ── Fix 3: Firebase module: add window.__fbGetDoc, __fbSwitchClass, __fbSaveClassList
    if 'window.__fbGetDoc = async function' not in src:
        # Insert before authReady listener
        auth_ready_pat = re.search(
            r'(// -- auth-guard[^\n]*dispatches authReady[^\n]*\n)',
            src
        )
        if not auth_ready_pat:
            auth_ready_pat = re.search(
                r"(document\.addEventListener\('authReady')",
                src
            )
        if auth_ready_pat:
            helpers = make_fb_helpers(col, doc_id, sk)
            src = src[:auth_ready_pat.start()] + helpers + '\n' + src[auth_ready_pat.start():]
            changes.append('Firebase: add __fbGetDoc, __fbSwitchClass, __fbSaveClassList')

    # ── Fix 4: currentRole === 'coord' → 'admin' in Firebase module
    # The Firebase module is after <!-- FIREBASE MODULE -->
    fb_mod_start = src.find('<!-- -- FIREBASE MODULE')
    if fb_mod_start == -1:
        fb_mod_start = src.find('<script type="module">')
    if fb_mod_start != -1:
        fb_section = src[fb_mod_start:]
        fb_section_fixed = fb_section.replace("currentRole === 'coord'", "currentRole === 'admin'")
        if fb_section_fixed != fb_section:
            src = src[:fb_mod_start] + fb_section_fixed
            changes.append('Firebase: currentRole coord -> admin')

    # ── Fix 5: class-scoped save in __fbSaveState
    # Find the __fbSaveState function body
    save_state_match = re.search(r'window\.__fbSaveState = async function\(data\) \{', src)
    if save_state_match:
        depth = 0
        i = save_state_match.start()
        fn_end = len(src)
        while i < len(src):
            if src[i] == '{': depth += 1
            elif src[i] == '}':
                depth -= 1
                if depth == 0:
                    fn_end = i + 1
                    break
            i += 1
        fn_body = src[save_state_match.start():fn_end]

        # 5a. Add note save
        if f'note-${{ci}}-${{ti}}' not in fn_body and "`note-${ci}-${ti}`" not in fn_body:
            new_fn = fn_body.replace(
                "      if (t.status && t.status !== 'pending') {\n        newStatuses[`${ci}-${ti}`] = t.status;\n      }",
                "      if (t.status && t.status !== 'pending') {\n        newStatuses[`${ci}-${ti}`] = t.status;\n      }\n      if (t.note && t.note.trim()) {\n        newStatuses[`note-${ci}-${ti}`] = t.note.trim();\n      }"
            )
            if new_fn != fn_body:
                src = src[:save_state_match.start()] + new_fn + src[fn_end:]
                fn_body = new_fn
                changes.append('Firebase __fbSaveState: save notes')

        # Refresh fn_end after possible change
        i = save_state_match.start()
        depth = 0
        fn_end = len(src)
        while i < len(src):
            if src[i] == '{': depth += 1
            elif src[i] == '}':
                depth -= 1
                if depth == 0:
                    fn_end = i + 1
                    break
            i += 1
        fn_body = src[save_state_match.start():fn_end]

        # 5b. Class-scoped save key
        if f'progressKey' not in fn_body:
            # Replace: { SK: newStatuses, updatedAt: serverTimestamp() }
            # with class-scoped version
            old_setdoc = re.search(
                rf"(\{{ {re.escape(sk)}: newStatuses, updatedAt: serverTimestamp\(\) \}})",
                fn_body
            )
            if old_setdoc:
                # Add progressKey variable before the try block
                try_match = re.search(r'  // 2\. Save user.*own progress[^\n]*\n', fn_body)
                if not try_match:
                    try_match = re.search(r'  try \{', fn_body)
                if try_match:
                    prog_key_code = (
                        f"  // 2. Save user's own progress (class-scoped key)\n"
                        f"  const progressKey = currentClass && currentClass !== 'default'\n"
                        f"    ? `{sk}_${{currentClass.replace(/\\s/g,'_')}}`\n"
                        f"    : '{sk}';\n"
                    )
                    # Replace comment or add before try
                    comment_match = re.search(r'  // 2\. Save user.*own progress[^\n]*\n', fn_body)
                    if comment_match:
                        new_fn = fn_body[:comment_match.start()] + prog_key_code + fn_body[comment_match.end():]
                    else:
                        new_fn = fn_body[:try_match.start()] + prog_key_code + fn_body[try_match.start():]
                    # Now replace the statuses key
                    new_fn = re.sub(
                        rf'\{{ {re.escape(sk)}: newStatuses',
                        '{ [progressKey]: newStatuses',
                        new_fn
                    )
                    if new_fn != fn_body:
                        src = src[:save_state_match.start()] + new_fn + src[fn_end:]
                        fn_body = new_fn
                        changes.append('Firebase: class-scoped save key')

    # ── Fix 6: strip note from coord structure save (if not already { status, note, ...rest })
    struct_strip_simple = re.compile(
        r'topics: ch\.topics\.map\(\(\{ status, \.\.\.rest \}\) => rest\)'
    )
    if struct_strip_simple.search(src):
        src = struct_strip_simple.sub(
            'topics: ch.topics.map(({ status, note, ...rest }) => rest)',
            src
        )
        changes.append('Firebase: strip note from structure save')

    # ── Fix 7: note-row textarea has double '' artifact → fix
    src = src.replace(
        ">${escHtml(t.note||''||''  )}</textarea>",
        ">${escHtml(t.note||'')}</textarea>"
    )
    if "t.note||''||''" not in src:
        pass  # already clean or fixed
    else:
        changes.append('Fix: note textarea double-empty-string artifact')

    new_lines = src.count('\n')
    diff = new_lines - original_lines

    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)

    return original_lines, new_lines, diff, changes


if __name__ == '__main__':
    print('Pacing Migration Pass 2 - Remaining fixes')
    print('=' * 60)
    total = 0
    for filename, cfg in FILE_CONFIGS.items():
        path = os.path.join(BASE, filename)
        if not os.path.exists(path):
            print(f'  SKIP {filename}')
            continue
        try:
            orig, new, diff, changes = fix_file(filename, cfg)
            sign = '+' if diff >= 0 else ''
            print(f'\n{filename}')
            print(f'  Lines: {orig} -> {new} ({sign}{diff})')
            if changes:
                for c in changes:
                    print(f'  + {c}')
            else:
                print('  (nothing to fix)')
            total += len(changes)
        except Exception as e:
            import traceback
            print(f'  ERROR: {e}')
            traceback.print_exc()
    print('\n' + '=' * 60)
    print(f'Total fixes: {total}')
    print('Done.')
