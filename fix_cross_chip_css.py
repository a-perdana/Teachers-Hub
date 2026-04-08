import os

# The CSS block to inject (from checkpoint-math-pacing.html lines 326-395)
CSS_BLOCK = """
/* ─── WEEKLY VIEW ──────────────────────────────*/
/* Cross-subject toggle bar */
.cross-subj-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px 10px 0; margin-bottom: 4px;
}
.cross-subj-label { font-size: .65rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); }
.cross-chip {
  font-size: .68rem; font-weight: 500;
  padding: 3px 10px; border-radius: 100px;
  border: 1px solid var(--border); background: var(--paper); color: var(--ink-2);
  cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 5px;
}
.cross-chip:hover { border-color: var(--ink-2); color: var(--ink); }
.cross-chip.on { background: var(--ink); border-color: var(--ink); color: white; }
.cross-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* Other-subject topic row colours in week card */
.wt-dot.subj-english  { background: #6c3fa0; }
.wt-dot.subj-science  { background: #1a5fa8; }
.wt-dot.subj-math     { background: var(--accent); }
.wt-dot.subj-biology  { background: #27ae60; }
.wt-dot.subj-chemistry { background: #e67e22; }
.wt-dot.subj-physics  { background: #2980b9; }

.week-card-subj-sep {
  font-size: .58rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: var(--ink-3); padding: 5px 14px 2px; border-top: 1px solid var(--border);
}

/* Workload indicator */
.week-load-bar { height: 3px; background: var(--border); margin: 0; position: relative; }
.week-load-fill { height: 100%; border-radius: 0; transition: width .4s; }
.week-load-fill.load-ok      { background: var(--green); }
.week-load-fill.load-medium  { background: var(--amber, #d97706); }
.week-load-fill.load-heavy   { background: var(--accent); }
"""

TARGET_FILES = [
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

base_dir = os.path.dirname(os.path.abspath(__file__))

for fname in TARGET_FILES:
    fpath = os.path.join(base_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already has cross-chip CSS
    if '.cross-chip {' in content:
        print(f'SKIP (already has): {fname}')
        continue

    # Inject before the first </style> tag
    if '</style>' not in content:
        print(f'SKIP (no </style>): {fname}')
        continue

    content = content.replace('</style>', CSS_BLOCK + '\n</style>', 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'FIXED: {fname}')

print('Done.')
