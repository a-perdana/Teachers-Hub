#!/usr/bin/env python3
"""
migrate_pacing3.py
Third-pass fix: add renderPaceBadge and note-btn to topic row templates,
fix remaining coord references.
"""

import re
import os

BASE = os.path.dirname(os.path.abspath(__file__))

FILES = [
    'checkpoint-english-pacing.html',
    'checkpoint-science-pacing.html',
    'igcse-math-pacing.html',
    'igcse-biology-pacing.html',
    'igcse-chemistry-pacing.html',
    'igcse-physics-pacing.html',
    'asalevel-math-pacing.html',
    'asalevel-biology-pacing.html',
    'asalevel-chemistry-pacing.html',
    'asalevel-physics-pacing.html',
]

NOTE_BTN = """<button class="note-btn${t.note ? ' has-note' : ''}" onclick="toggleNote(${ci},${ti})" title="${t.note ? 'Edit note' : 'Add teacher note'}">&#9998; ${t.note ? 'Note' : 'Add note'}</button>
"""

def fix_file(fname):
    path = os.path.join(BASE, fname)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()

    orig = src
    changes = []

    # ── 1. Add renderPaceBadge(t) before <div class="status-pill">
    if 'renderPaceBadge(t)' not in src:
        # Two patterns: meta-pill style (igcse/asalevel) and inline style (checkpoint)
        # Both have the week span then status-pill. We find the week template span.

        # Meta-pill style: `...meta-pill-week...</span>` : ''}
        # then newline(s) then <div class="status-pill">
        p = re.compile(
            r"(\$\{t\.week \? `<span[^`]+</span>` : ''\})"
            r"(\s*\n\s*)"
            r"(<div class=\"status-pill\">)",
            re.MULTILINE | re.DOTALL
        )
        m = p.search(src)
        if m:
            insert = m.group(1) + '\n                      ${renderPaceBadge(t)}' + m.group(2) + m.group(3)
            src = src[:m.start()] + insert + src[m.end():]
            changes.append('Added renderPaceBadge(t)')
        else:
            # Try simple week span pattern
            p2 = re.compile(
                r"(\$\{t\.week \? `<span[^\`]+Week \$\{t\.week\}</span>` : ''\})"
                r"(\s*\n\s*)"
                r"(<div class=\"status-pill\">)",
                re.MULTILINE
            )
            m2 = p2.search(src)
            if m2:
                insert2 = m2.group(1) + '\n                      ${renderPaceBadge(t)}' + m2.group(2) + m2.group(3)
                src = src[:m2.start()] + insert2 + src[m2.end():]
                changes.append('Added renderPaceBadge(t) [simple week]')

    # ── 2. Add note-btn after the status-pill </div>, before the outer wrapper </div>
    if 'toggleNote' not in src or 'note-btn${t.note' not in src:
        # Find the status-pill closing </div> inside the topic row flex container
        # The pattern we look for:
        #   </div>\n (end of status-pill)
        #   INDENT </div>\n (end of outer div that wraps hours+week+status)
        #   </td>
        # We want to insert note-btn BEFORE the outer </div>

        # Pattern for igcse/asalevel: closing of status-pill then closing of topic-meta-line
        p3 = re.compile(
            r"(                      </div>\n)"
            r"(                    </div>\n)"
            r"(                  </td>\n)"
            r"(                  <td class=\"col-obj\">)",
            re.MULTILINE
        )
        m3 = p3.search(src)
        if m3:
            replacement = (
                m3.group(1) +
                '                      ' + NOTE_BTN.strip() + '\n' +
                m3.group(2) +
                m3.group(3) +
                m3.group(4)
            )
            src = src[:m3.start()] + replacement + src[m3.end():]
            changes.append('Added note-btn (igcse/asalevel style)')
        else:
            # Pattern for checkpoint: closing of status-pill then outer flex div
            p4 = re.compile(
                r"(                      </div>\n)"   # end of status-pill
                r"(                    </div>\n)"     # end of outer flex
                r"(                  </td>\n)"        # end of td
                r"(                  <td></td>)",     # next td
                re.MULTILINE
            )
            m4 = p4.search(src)
            if m4:
                replacement = (
                    m4.group(1) +
                    '                      ' + NOTE_BTN.strip() + '\n' +
                    m4.group(2) +
                    m4.group(3) +
                    m4.group(4)
                )
                src = src[:m4.start()] + replacement + src[m4.end():]
                changes.append('Added note-btn (checkpoint style)')

    # ── 3. Fix any remaining coord references in JS (belt-and-suspenders)
    coord_count_before = src.count("'coord'")
    src = src.replace("role === 'coord'", "role === 'admin'")
    src = src.replace("role !== 'coord'", "role !== 'admin'")
    src = src.replace("appRole = 'coord'", "appRole = 'admin'")
    src = src.replace("currentRole === 'coord'", "currentRole === 'admin'")
    src = src.replace("r === 'coord'", "r === 'admin'")
    src = src.replace("appRole === 'coord'", "appRole === 'admin'")
    src = src.replace("isCoord  = role === 'admin'", "isAdmin  = role === 'admin'")
    src = src.replace("isCoord = role === 'admin'", "isAdmin = role === 'admin'")
    src = src.replace('contenteditable="${isCoord}"', 'contenteditable="${isAdmin}"')
    coord_count_after = src.count("'coord'")
    if coord_count_before != coord_count_after:
        changes.append(f'Fixed coord refs ({coord_count_before - coord_count_after} replaced)')

    # ── 4. Fix: _progressKey helper missing in some files
    # For files where _progressKey was NOT added by pass1 (bio/chem/phys/checkpoint files)
    if 'function _progressKey()' not in src:
        # These files should have a direct statuses key read; the _progressKey was only added
        # to igcse-math and asalevel-math by pass1. But the snapshot already uses _progressKey()
        # via pass2. Let me check: if _progressKey() call exists but definition doesn't, add it.
        if '_progressKey()' in src:
            # Find the _startSnapshot or onAuthStateChanged block and add _progressKey helper before
            # the unsubUserProg snapshot
            unsub_up = re.search(
                r'(  unsubUserProg = onSnapshot\(userProgRef)',
                src
            )
            if unsub_up:
                # Get statuses_key from the snapshot line itself
                snap_line = re.search(
                    r"snap\.data\(\)\[_progressKey\(\)\]",
                    src
                )
                if snap_line:
                    # We need to find what the base key is - look for progressKey variable
                    pk_match = re.search(
                        r"const progressKey = currentClass[^\n]+\n\s+\? `([^_`]+_[^`]+)`\n\s+: '([^']+)'",
                        src
                    )
                    if pk_match:
                        base_key = pk_match.group(2)
                        prog_key_fn = (
                            f"\n  // Per-user progress listener - key is class-scoped\n"
                            f"  function _progressKey() {{\n"
                            f"    return currentClass && currentClass !== 'default'\n"
                            f"      ? `{base_key}_${{currentClass.replace(/\\s/g,'_')}}`\n"
                            f"      : '{base_key}';\n"
                            f"  }}\n\n"
                        )
                        src = src[:unsub_up.start()] + prog_key_fn + src[unsub_up.start():]
                        changes.append(f'Added _progressKey() helper (key: {base_key})')

    new_lines = src.count('\n')
    changed = src != orig
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(src)
    return changed, changes


if __name__ == '__main__':
    print('Pacing Migration Pass 3 - Final fixes')
    print('=' * 60)
    total = 0
    for fname in FILES:
        path = os.path.join(BASE, fname)
        if not os.path.exists(path):
            print(f'  SKIP {fname}')
            continue
        try:
            changed, changes = fix_file(fname)
            print(f'\n{fname}')
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
