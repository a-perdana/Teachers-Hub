const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Environment variables to replace
const envVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

// Map: source filename -> clean URL path (relative to dist root)
// index.html stays at root; everything else gets a named subfolder
const ROUTES = {
  'index.html': '',
  'login.html': 'login',
  'igcse-math-pacing.html': 'igcse-math',
  'igcse-physics-pacing.html': 'igcse-physics',
  'igcse-chemistry-pacing.html': 'igcse-chemistry',
  'igcse-biology-pacing.html': 'igcse-biology',
  'checkpoint-math-pacing.html': 'checkpoint-math',
  'checkpoint-english-pacing.html': 'checkpoint-english',
  'checkpoint-science-pacing.html': 'checkpoint-science',
  'as-alevel-math-pacing.html': 'as-alevel-math',
  'as-alevel-biology-pacing.html': 'as-alevel-biology',
  'as-alevel-chemistry-pacing.html': 'as-alevel-chemistry',
  'as-alevel-physics-pacing.html': 'as-alevel-physics',
  'announcements.html': 'announcements',
  'surveys.html': 'surveys',
  'messageboard.html': 'messageboard',
  'library.html': 'library',
  'weekly-checklist.html': 'weekly-checklist',
  'waiting.html': 'waiting',
  'teacher-self-assessment.html': 'teacher-self-assessment',
  'teacher-kpi-results.html': 'teacher-kpi-results',
  'teacher-appraisal-results.html': 'teacher-appraisal-results',
  'teacher-self-appraisal.html': 'teacher-self-appraisal',
  'cambridge-calendar.html': 'cambridge-calendar',
  'cambridge-standards.html': 'cambridge-standards',
  'competency-framework.html': 'competency-framework',
  'learning-path.html': 'learning-path',
  'my-portfolio.html': 'my-portfolio',
  'my-certificates.html': 'my-certificates',
  'certificate-verify.html': 'certificate-verify',
  'orientation.html': 'orientation',
  // Subject Leader Tracker pages (generated from tracker-template.html)
  'igcse-math-tracker.html':        'igcse-math-tracker',
  'igcse-biology-tracker.html':     'igcse-biology-tracker',
  'igcse-chemistry-tracker.html':   'igcse-chemistry-tracker',
  'igcse-physics-tracker.html':     'igcse-physics-tracker',
  'checkpoint-math-tracker.html':   'checkpoint-math-tracker',
  'checkpoint-english-tracker.html':'checkpoint-english-tracker',
  'checkpoint-science-tracker.html':'checkpoint-science-tracker',
  'as-alevel-math-tracker.html':     'as-alevel-math-tracker',
  'as-alevel-biology-tracker.html':  'as-alevel-biology-tracker',
  'as-alevel-chemistry-tracker.html':'as-alevel-chemistry-tracker',
  'as-alevel-physics-tracker.html':  'as-alevel-physics-tracker',
  'settings.html': 'settings',
};

// Internal href replacements: old link -> clean URL
const LINK_REWRITES = [
  [/href="index\.html"/g, 'href="/"'],
  [/href="login\.html"/g, 'href="/login"'],
  [/href="igcse-math-pacing\.html"/g, 'href="/igcse-math"'],
  [/href="igcse-physics-pacing\.html"/g, 'href="/igcse-physics"'],
  [/href="igcse-chemistry-pacing\.html"/g, 'href="/igcse-chemistry"'],
  [/href="igcse-biology-pacing\.html"/g, 'href="/igcse-biology"'],
  [/href="checkpoint-math-pacing\.html"/g, 'href="/checkpoint-math"'],
  [/href="checkpoint-english-pacing\.html"/g, 'href="/checkpoint-english"'],
  [/href="checkpoint-science-pacing\.html"/g, 'href="/checkpoint-science"'],
  [/href="as-alevel-math-pacing\.html"/g, 'href="/as-alevel-math"'],
  [/href="as-alevel-biology-pacing\.html"/g, 'href="/as-alevel-biology"'],
  [/href="as-alevel-chemistry-pacing\.html"/g, 'href="/as-alevel-chemistry"'],
  [/href="as-alevel-physics-pacing\.html"/g, 'href="/as-alevel-physics"'],
  [/href="announcements\.html"/g, 'href="/announcements"'],
  [/href="surveys\.html"/g, 'href="/surveys"'],
  [/href="messageboard\.html"/g, 'href="/messageboard"'],
  [/href="library\.html"/g, 'href="/library"'],
  [/href="teacher-self-assessment\.html"/g, 'href="/teacher-self-assessment"'],
  [/href="teacher-kpi-results\.html"/g,    'href="/teacher-kpi-results"'],
  [/href="teacher-appraisal-results\.html"/g, 'href="/teacher-appraisal-results"'],
  [/href="teacher-self-appraisal\.html"/g,   'href="/teacher-self-appraisal"'],
  [/href="cambridge-calendar\.html"/g,     'href="/cambridge-calendar"'],
  [/href="cambridge-standards\.html"/g,    'href="/cambridge-standards"'],
  [/href="competency-framework\.html"/g,   'href="/competency-framework"'],
  [/href="learning-path\.html"/g,          'href="/learning-path"'],
  [/href="my-portfolio\.html"/g,           'href="/my-portfolio"'],
  [/href="my-certificates\.html"/g,        'href="/my-certificates"'],
  [/href="certificate-verify\.html(\?[^"]*)?"/g, (m, q) => `href="/certificate-verify${q || ''}"`],
  // Subject Leader Tracker pages
  [/href="orientation\.html"/g,                  'href="/orientation"'],
  [/href="igcse-math-tracker\.html"/g,          'href="/igcse-math-tracker"'],
  [/href="igcse-biology-tracker\.html"/g,       'href="/igcse-biology-tracker"'],
  [/href="igcse-chemistry-tracker\.html"/g,     'href="/igcse-chemistry-tracker"'],
  [/href="igcse-physics-tracker\.html"/g,       'href="/igcse-physics-tracker"'],
  [/href="checkpoint-math-tracker\.html"/g,     'href="/checkpoint-math-tracker"'],
  [/href="checkpoint-english-tracker\.html"/g,  'href="/checkpoint-english-tracker"'],
  [/href="checkpoint-science-tracker\.html"/g,  'href="/checkpoint-science-tracker"'],
  [/href="as-alevel-math-tracker\.html"/g,       'href="/as-alevel-math-tracker"'],
  [/href="as-alevel-biology-tracker\.html"/g,    'href="/as-alevel-biology-tracker"'],
  [/href="as-alevel-chemistry-tracker\.html"/g,  'href="/as-alevel-chemistry-tracker"'],
  [/href="as-alevel-physics-tracker\.html"/g,    'href="/as-alevel-physics-tracker"'],
  [/href="settings\.html"/g,                    'href="/settings"'],
];

// ============================================================
// IGCSE pacing pages — generated from igcse-pacing-template.html
// ============================================================
const IGCSE_SUBJECTS = {
  'igcse-math-pacing.html': {
    accentVars: '--accent: #c0392b;\n  --accent-2: #fdf0ef;\n  --accent-dark: #a93224;',
    trackerHref: 'igcse-math-tracker.html',
    combo: 'igcse_math',
    classesField: 'igcse_math_classes',
    notAssignedCall: "_showNotAssigned('IGCSE Mathematics', 'igcse')",
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:      'math_pacing',
  docId:           'year9-10',
  syllabusPrefix:  '0580',
  subjectKey:      'math',
  label:           'Mathematics',
  code:            '0580',
  qualifier:       'Core & Extended',
  years:           'Year 9\u201310',
  accentColor:     'var(--accent)',
  examLocalKey:    'igcse_math_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
  ],
  hasSyllabusFilter: true,
  crossSubjects: [
    { key: 'biology',   col: 'biology_pacing',  doc: 'year9-10', label: 'Biology',   color: '#1a5fa8' },
    { key: 'chemistry', col: 'chemistry_pacing', doc: 'year9-10', label: 'Chemistry', color: '#6c3fa0' },
  ],
};`,
  },
  'igcse-biology-pacing.html': {
    accentVars: '--accent: #27ae60;\n  --accent-2: #e9f7ef;\n  --accent-dark: #1e8449;',
    trackerHref: 'igcse-biology-tracker.html',
    combo: 'igcse_biology',
    classesField: 'igcse_biology_classes',
    notAssignedCall: "_showNotAssigned('IGCSE Biology', 'igcse')",
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:      'biology_pacing',
  docId:           'year9-10',
  syllabusPrefix:  '0610',
  subjectKey:      'biology',
  label:           'Biology',
  code:            '0610',
  qualifier:       'Core & Extended',
  years:           'Year 9\u201310',
  accentColor:     'var(--accent)',
  examLocalKey:    'igcse_biology_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
  ],
  hasSyllabusFilter: true,
  crossSubjects: [
    { key: 'math',      col: 'math_pacing',      doc: 'year9-10', label: 'Mathematics', color: '#c0392b' },
    { key: 'chemistry', col: 'chemistry_pacing',  doc: 'year9-10', label: 'Chemistry',   color: '#e67e22' },
  ],
};`,
  },
  'igcse-chemistry-pacing.html': {
    accentVars: '--accent: #e67e22;\n  --accent-2: #fef5e7;\n  --accent-dark: #ca6f1e;',
    trackerHref: 'igcse-chemistry-tracker.html',
    combo: 'igcse_chemistry',
    classesField: 'igcse_chemistry_classes',
    notAssignedCall: "_showNotAssigned('IGCSE Chemistry', 'igcse')",
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:      'chemistry_pacing',
  docId:           'year9-10',
  syllabusPrefix:  '0970',
  subjectKey:      'chemistry',
  label:           'Chemistry',
  code:            '0970',
  qualifier:       'Core & Extended',
  years:           'Year 9\u201310',
  accentColor:     'var(--accent)',
  examLocalKey:    'igcse_chemistry_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
    { key: 'paper6', label: 'Paper 6 (Practical)', cls: 'paper6' },
  ],
  hasSyllabusFilter: true,
  crossSubjects: [
    { key: 'math',    col: 'math_pacing',    doc: 'year9-10', label: 'Mathematics', color: '#c0392b' },
    { key: 'biology', col: 'biology_pacing', doc: 'year9-10', label: 'Biology',     color: '#27ae60' },
  ],
};`,
  },
  'igcse-physics-pacing.html': {
    accentVars: '--accent: #2980b9;\n  --accent-2: #e8f4fd;\n  --accent-dark: #1f6fa3;',
    trackerHref: 'igcse-physics-tracker.html',
    combo: 'igcse_physics',
    classesField: 'igcse_physics_classes',
    notAssignedCall: "_showNotAssigned('IGCSE Physics', 'igcse')",
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:      'physics_pacing',
  docId:           'year9-10',
  syllabusPrefix:  '0625',
  subjectKey:      'physics',
  label:           'Physics',
  code:            '0625',
  qualifier:       'Core & Extended',
  years:           'Year 9\u201310',
  accentColor:     'var(--accent)',
  examLocalKey:    'igcse_physics_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
    { key: 'paper6', label: 'Paper 6 (Practical)', cls: 'paper6' },
  ],
  hasSyllabusFilter: true,
  crossSubjects: [
    { key: 'math',    col: 'math_pacing',    doc: 'year9-10', label: 'Mathematics', color: '#c0392b' },
    { key: 'biology', col: 'biology_pacing', doc: 'year9-10', label: 'Biology',     color: '#27ae60' },
  ],
};`,
  },
};

// Generate IGCSE subject pages from template into a temp in-memory map
const igcseTemplate = fs.readFileSync(path.join(__dirname, 'igcse-pacing-template.html'), 'utf8');
const generatedIgcse = {}; // filename -> html string
Object.entries(IGCSE_SUBJECTS).forEach(([filename, cfg]) => {
  let html = igcseTemplate
    .replace('{{ACCENT_VARS}}', cfg.accentVars)
    .replace('{{TRACKER_HREF}}', cfg.trackerHref)
    .replace('{{SUBJECT_CONFIG}}', cfg.subjectConfig)
    .replace("'{{COMBO}}'", `'${cfg.combo}'`)
    .replace('{{NOT_ASSIGNED_CALL}}', cfg.notAssignedCall)
    .replace(/p\?\.\{\{CLASSES_FIELD\}\}/g, `p?.${cfg.classesField}`)
    .replace(/p\.{{CLASSES_FIELD}}/g, `p.${cfg.classesField}`);
  generatedIgcse[filename] = html;
});

// ============================================================
// Checkpoint pacing pages — from checkpoint-pacing-template.html
// ============================================================
const CHECKPOINT_SUBJECTS = {
  'checkpoint-math-pacing.html': {
    pageTitle: 'Cambridge Secondary Checkpoint Mathematics — Pacing Guide',
    accentVars: '--accent: #c0392b;\n  --accent-2: #fdf0ef;\n  --accent-dark: #a93224;',
    brandMark: 'CP', brandTitle: 'Cambridge Checkpoint Mathematics',
    brandSub: '0862 \u00b7 Year 7\u20138', breadcrumbLevel: 'Checkpoint', breadcrumbCurrent: 'Mathematics',
    trackerHref: 'checkpoint-math-tracker.html',
    yearA: 'Year 7', yearB: 'Year 8',
    combo: 'checkpoint_math', classesField: 'checkpoint_math_classes',
    notAssignedCall: "_showNotAssigned('Checkpoint Mathematics', 'checkpoint')",
    progressKey: 'checkpoint_math_statuses',
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:   'checkpoint_math_pacing',
  docId:        'year7-8',
  subjectKey:   'math',
  label:        'Mathematics',
  accentColor:  'var(--accent)',
  yearA:        'Year 7',
  yearB:        'Year 8',
  syllabusPrefix: '0862',
  examLocalKey: 'checkpoint_math_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
  ],
  crossSubjects: [
    { key: 'english', col: 'checkpoint_english_pacing', doc: 'year7-8', label: 'English', color: '#2980b9' },
    { key: 'science', col: 'checkpoint_science_pacing',  doc: 'year7-8', label: 'Science', color: '#27ae60' },
  ],
};`,
  },
  'checkpoint-english-pacing.html': {
    pageTitle: 'Cambridge Secondary Checkpoint English — Pacing Guide',
    accentVars: '--accent: #2980b9;\n  --accent-2: #e8f4fd;\n  --accent-dark: #1f6fa3;',
    brandMark: 'CP', brandTitle: 'Cambridge Checkpoint English',
    brandSub: '1111 \u00b7 Year 7\u20138', breadcrumbLevel: 'Checkpoint', breadcrumbCurrent: 'English',
    trackerHref: 'checkpoint-english-tracker.html',
    yearA: 'Year 7', yearB: 'Year 8',
    combo: 'checkpoint_english', classesField: 'checkpoint_english_classes',
    notAssignedCall: "_showNotAssigned('Checkpoint English', 'checkpoint')",
    progressKey: 'checkpoint_english_statuses',
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:   'checkpoint_english_pacing',
  docId:        'year7-8',
  subjectKey:   'english',
  label:        'English',
  accentColor:  'var(--accent)',
  yearA:        'Year 7',
  yearB:        'Year 8',
  examLocalKey: 'checkpoint_english_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
  ],
  crossSubjects: [
    { key: 'math',    col: 'checkpoint_math_pacing',    doc: 'year7-8', label: 'Mathematics', color: '#c0392b' },
    { key: 'science', col: 'checkpoint_science_pacing', doc: 'year7-8', label: 'Science',     color: '#27ae60' },
  ],
};`,
  },
  'checkpoint-science-pacing.html': {
    pageTitle: 'Cambridge Secondary Checkpoint Science — Pacing Guide',
    accentVars: '--accent: #27ae60;\n  --accent-2: #e9f7ef;\n  --accent-dark: #1e8449;',
    brandMark: 'CP', brandTitle: 'Cambridge Checkpoint Science',
    brandSub: '0893 \u00b7 Year 7\u20138', breadcrumbLevel: 'Checkpoint', breadcrumbCurrent: 'Science',
    trackerHref: 'checkpoint-science-tracker.html',
    yearA: 'Year 7', yearB: 'Year 8',
    combo: 'checkpoint_science', classesField: 'checkpoint_science_classes',
    notAssignedCall: "_showNotAssigned('Checkpoint Science', 'checkpoint')",
    progressKey: 'checkpoint_science_statuses',
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:   'checkpoint_science_pacing',
  docId:        'year7-8',
  subjectKey:   'science',
  label:        'Science',
  accentColor:  'var(--accent)',
  yearA:        'Year 7',
  yearB:        'Year 8',
  examLocalKey: 'checkpoint_science_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
  ],
  crossSubjects: [
    { key: 'math',    col: 'checkpoint_math_pacing',    doc: 'year7-8', label: 'Mathematics', color: '#c0392b' },
    { key: 'english', col: 'checkpoint_english_pacing', doc: 'year7-8', label: 'English',     color: '#2980b9' },
  ],
};`,
  },
};

// ============================================================
// AS/A-Level pacing pages — from as-alevel-pacing-template.html
// ============================================================
const ASALEVEL_SUBJECTS = {
  'as-alevel-math-pacing.html': {
    pageTitle: 'Cambridge AS & A Level Mathematics — Pacing Guide',
    accentVars: '--accent: #c0392b;\n  --accent-2: #fdf0ef;\n  --accent-dark: #a93224;',
    brandMark: 'AS', brandTitle: 'Cambridge AS & A Level Mathematics',
    brandSub: '9709 \u00b7 Year 11\u201312', breadcrumbLevel: 'AS & A Level', breadcrumbCurrent: 'Mathematics',
    trackerHref: 'as-alevel-math-tracker.html',
    yearA: 'Year 11', yearB: 'Year 12',
    combo: 'asalevel_math', classesField: 'asalevel_math_classes',
    notAssignedCall: "_showNotAssigned('AS & A Level Mathematics', 'asalevel')",
    progressKey: 'asmath_statuses',
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:   'asalevel_math_pacing',
  docId:        'year11-12',
  syllabusPrefix: '9709',
  subjectKey:   'math',
  label:        'Mathematics',
  accentColor:  'var(--accent)',
  yearA:        'Year 11',
  yearB:        'Year 12',
  examLocalKey: 'asalevel_math_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper3' },
  ],
  crossSubjects: [
    { key: 'biology',   col: 'asalevel_biology_pacing',   doc: 'year11-12', label: 'Biology',   color: '#27ae60' },
    { key: 'chemistry', col: 'asalevel_chemistry_pacing', doc: 'year11-12', label: 'Chemistry', color: '#e67e22' },
  ],
};`,
  },
  'as-alevel-biology-pacing.html': {
    pageTitle: 'Cambridge AS & A Level Biology — Pacing Guide',
    accentVars: '--accent: #27ae60;\n  --accent-2: #e9f7ef;\n  --accent-dark: #1e8449;',
    brandMark: 'AS', brandTitle: 'Cambridge AS & A Level Biology',
    brandSub: '9700 \u00b7 Year 11\u201312', breadcrumbLevel: 'AS & A Level', breadcrumbCurrent: 'Biology',
    trackerHref: 'as-alevel-biology-tracker.html',
    yearA: 'Year 11', yearB: 'Year 12',
    combo: 'asalevel_biology', classesField: 'asalevel_biology_classes',
    notAssignedCall: "_showNotAssigned('AS & A Level Biology', 'asalevel')",
    progressKey: 'asbio_statuses',
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:   'asalevel_biology_pacing',
  docId:        'year11-12',
  subjectKey:   'biology',
  label:        'Biology',
  accentColor:  'var(--accent)',
  yearA:        'Year 11',
  yearB:        'Year 12',
  examLocalKey: 'asalevel_biology_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper3' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
  ],
  crossSubjects: [
    { key: 'math',      col: 'asalevel_math_pacing',      doc: 'year11-12', label: 'Mathematics', color: '#c0392b' },
    { key: 'chemistry', col: 'asalevel_chemistry_pacing', doc: 'year11-12', label: 'Chemistry',   color: '#e67e22' },
  ],
};`,
  },
  'as-alevel-chemistry-pacing.html': {
    pageTitle: 'Cambridge AS & A Level Chemistry — Pacing Guide',
    accentVars: '--accent: #e67e22;\n  --accent-2: #fef5e7;\n  --accent-dark: #ca6f1e;',
    brandMark: 'AS', brandTitle: 'Cambridge AS & A Level Chemistry',
    brandSub: '9701 \u00b7 Year 11\u201312', breadcrumbLevel: 'AS & A Level', breadcrumbCurrent: 'Chemistry',
    trackerHref: 'as-alevel-chemistry-tracker.html',
    yearA: 'Year 11', yearB: 'Year 12',
    combo: 'asalevel_chemistry', classesField: 'asalevel_chemistry_classes',
    notAssignedCall: "_showNotAssigned('AS & A Level Chemistry', 'asalevel')",
    progressKey: 'aschem_statuses',
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:   'asalevel_chemistry_pacing',
  docId:        'year11-12',
  subjectKey:   'chemistry',
  label:        'Chemistry',
  accentColor:  'var(--accent)',
  yearA:        'Year 11',
  yearB:        'Year 12',
  examLocalKey: 'asalevel_chemistry_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper3' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
  ],
  crossSubjects: [
    { key: 'math',    col: 'asalevel_math_pacing',    doc: 'year11-12', label: 'Mathematics', color: '#c0392b' },
    { key: 'biology', col: 'asalevel_biology_pacing', doc: 'year11-12', label: 'Biology',     color: '#27ae60' },
  ],
};`,
  },
  'as-alevel-physics-pacing.html': {
    pageTitle: 'Cambridge AS & A Level Physics — Pacing Guide',
    accentVars: '--accent: #2980b9;\n  --accent-2: #e8f4fd;\n  --accent-dark: #1f6fa3;',
    brandMark: 'AS', brandTitle: 'Cambridge AS & A Level Physics',
    brandSub: '9702 \u00b7 Year 11\u201312', breadcrumbLevel: 'AS & A Level', breadcrumbCurrent: 'Physics',
    trackerHref: 'as-alevel-physics-tracker.html',
    yearA: 'Year 11', yearB: 'Year 12',
    combo: 'asalevel_physics', classesField: 'asalevel_physics_classes',
    notAssignedCall: "_showNotAssigned('AS & A Level Physics', 'asalevel')",
    progressKey: 'asphys_statuses',
    subjectConfig: `const SUBJECT_CONFIG = {
  collection:   'asalevel_physics_pacing',
  docId:        'year11-12',
  subjectKey:   'physics',
  label:        'Physics',
  accentColor:  'var(--accent)',
  yearA:        'Year 11',
  yearB:        'Year 12',
  examLocalKey: 'asalevel_physics_exam_dates',
  examPapers: [
    { key: 'paper1', label: 'Paper 1', cls: 'paper1' },
    { key: 'paper2', label: 'Paper 2', cls: 'paper2' },
    { key: 'paper3', label: 'Paper 3', cls: 'paper3' },
    { key: 'paper4', label: 'Paper 4', cls: 'paper4' },
  ],
  crossSubjects: [
    { key: 'math',    col: 'asalevel_math_pacing',    doc: 'year11-12', label: 'Mathematics', color: '#c0392b' },
    { key: 'biology', col: 'asalevel_biology_pacing', doc: 'year11-12', label: 'Biology',     color: '#27ae60' },
  ],
};`,
  },
};

// Generate Checkpoint pages from checkpoint-pacing-template.html
const cpTemplate = fs.readFileSync(path.join(__dirname, 'checkpoint-pacing-template.html'), 'utf8');
const generatedCheckpoint = {};
Object.entries(CHECKPOINT_SUBJECTS).forEach(([filename, cfg]) => {
  let html = cpTemplate
    .replace('{{PAGE_TITLE}}', cfg.pageTitle)
    .replace('{{ACCENT_VARS}}', cfg.accentVars)
    .replace('{{BRAND_MARK}}', cfg.brandMark)
    .replace('{{BRAND_TITLE}}', cfg.brandTitle)
    .replace('{{BRAND_SUB}}', cfg.brandSub)
    .replace('{{BREADCRUMB_LEVEL}}', cfg.breadcrumbLevel)
    .replace('{{BREADCRUMB_CURRENT}}', cfg.breadcrumbCurrent)
    .replace('{{TRACKER_HREF}}', cfg.trackerHref)
    .replace(/\{\{YEAR_A\}\}/g, cfg.yearA)
    .replace(/\{\{YEAR_B\}\}/g, cfg.yearB)
    .replace('{{SUBJECT_CONFIG}}', cfg.subjectConfig)
    .replace("'{{COMBO}}'", `'${cfg.combo}'`)
    .replace('{{NOT_ASSIGNED_CALL}}', cfg.notAssignedCall)
    .replace(/p\?\.\{\{CLASSES_FIELD\}\}/g, `p?.${cfg.classesField}`)
    .replace(/p\.{{CLASSES_FIELD}}/g, `p.${cfg.classesField}`)
    .replace(/\{\{PROGRESS_KEY\}\}/g, cfg.progressKey);
  generatedCheckpoint[filename] = html;
});

// Generate AS/A-Level pages from as-alevel-pacing-template.html
const asTemplate = fs.readFileSync(path.join(__dirname, 'as-alevel-pacing-template.html'), 'utf8');
const generatedAsALevel = {};
Object.entries(ASALEVEL_SUBJECTS).forEach(([filename, cfg]) => {
  let html = asTemplate
    .replace('{{PAGE_TITLE}}', cfg.pageTitle)
    .replace('{{ACCENT_VARS}}', cfg.accentVars)
    .replace('{{BRAND_MARK}}', cfg.brandMark)
    .replace('{{BRAND_TITLE}}', cfg.brandTitle)
    .replace('{{BRAND_SUB}}', cfg.brandSub)
    .replace('{{BREADCRUMB_LEVEL}}', cfg.breadcrumbLevel)
    .replace('{{BREADCRUMB_CURRENT}}', cfg.breadcrumbCurrent)
    .replace('{{TRACKER_HREF}}', cfg.trackerHref)
    .replace(/\{\{YEAR_A\}\}/g, cfg.yearA)
    .replace(/\{\{YEAR_B\}\}/g, cfg.yearB)
    .replace('{{SUBJECT_CONFIG}}', cfg.subjectConfig)
    .replace("'{{COMBO}}'", `'${cfg.combo}'`)
    .replace('{{NOT_ASSIGNED_CALL}}', cfg.notAssignedCall)
    .replace(/p\?\.\{\{CLASSES_FIELD\}\}/g, `p?.${cfg.classesField}`)
    .replace(/p\.{{CLASSES_FIELD}}/g, `p.${cfg.classesField}`)
    .replace(/\{\{PROGRESS_KEY\}\}/g, cfg.progressKey);
  generatedAsALevel[filename] = html;
});

// ============================================================
// Tracker pages — generated from tracker-template.html
// ============================================================
const TRACKER_SUBJECTS = {
  'igcse-math-tracker.html': {
    pageTitle:   'IGCSE Mathematics — Subject Leader Tracker',
    accentVars:  '--accent: #c0392b; --accent-2: #fce8e6;',
    collection:  'math_pacing',
    docId:       'year9-10',
    subjectKey:  'math',
    label:       'Mathematics',
    code:        '0580',
    qualifier:   'Core & Extended',
    years:       'Year 9–10',
    curriculum:  'igcse',
    heading:     'IGCSE Mathematics — Tracker',
    breadcrumb:  'IGCSE Mathematics',
  },
  'igcse-biology-tracker.html': {
    pageTitle:   'IGCSE Biology — Subject Leader Tracker',
    accentVars:  '--accent: #27ae60; --accent-2: #e9f7ef;',
    collection:  'biology_pacing',
    docId:       'year9-10',
    subjectKey:  'biology',
    label:       'Biology',
    code:        '0610',
    qualifier:   'Core & Extended',
    years:       'Year 9–10',
    curriculum:  'igcse',
    heading:     'IGCSE Biology — Tracker',
    breadcrumb:  'IGCSE Biology',
  },
  'igcse-chemistry-tracker.html': {
    pageTitle:   'IGCSE Chemistry — Subject Leader Tracker',
    accentVars:  '--accent: #e67e22; --accent-2: #fef3e2;',
    collection:  'chemistry_pacing',
    docId:       'year9-10',
    subjectKey:  'chemistry',
    label:       'Chemistry',
    code:        '0620',
    qualifier:   'Core & Extended',
    years:       'Year 9–10',
    curriculum:  'igcse',
    heading:     'IGCSE Chemistry — Tracker',
    breadcrumb:  'IGCSE Chemistry',
  },
  'igcse-physics-tracker.html': {
    pageTitle:   'IGCSE Physics — Subject Leader Tracker',
    accentVars:  '--accent: #2980b9; --accent-2: #e8f4fd;',
    collection:  'physics_pacing',
    docId:       'year9-10',
    subjectKey:  'physics',
    label:       'Physics',
    code:        '0625',
    qualifier:   'Core & Extended',
    years:       'Year 9–10',
    curriculum:  'igcse',
    heading:     'IGCSE Physics — Tracker',
    breadcrumb:  'IGCSE Physics',
  },
  'checkpoint-math-tracker.html': {
    pageTitle:   'Checkpoint Mathematics — Subject Leader Tracker',
    accentVars:  '--accent: #c0392b; --accent-2: #fce8e6;',
    collection:  'checkpoint_math_pacing',
    docId:       'year7-8',
    subjectKey:  'math',
    label:       'Mathematics',
    code:        '0862',
    qualifier:   'Checkpoint',
    years:       'Year 7–8',
    curriculum:  'checkpoint',
    heading:     'Checkpoint Mathematics — Tracker',
    breadcrumb:  'Checkpoint Mathematics',
  },
  'checkpoint-english-tracker.html': {
    pageTitle:   'Checkpoint English — Subject Leader Tracker',
    accentVars:  '--accent: #8e44ad; --accent-2: #f5eef8;',
    collection:  'checkpoint_english_pacing',
    docId:       'year7-8',
    subjectKey:  'english',
    label:       'English',
    code:        '0861',
    qualifier:   'Checkpoint',
    years:       'Year 7–8',
    curriculum:  'checkpoint',
    heading:     'Checkpoint English — Tracker',
    breadcrumb:  'Checkpoint English',
  },
  'checkpoint-science-tracker.html': {
    pageTitle:   'Checkpoint Science — Subject Leader Tracker',
    accentVars:  '--accent: #16a085; --accent-2: #e8f8f5;',
    collection:  'checkpoint_science_pacing',
    docId:       'year7-8',
    subjectKey:  'science',
    label:       'Science',
    code:        '0893',
    qualifier:   'Checkpoint',
    years:       'Year 7–8',
    curriculum:  'checkpoint',
    heading:     'Checkpoint Science — Tracker',
    breadcrumb:  'Checkpoint Science',
  },
  'as-alevel-math-tracker.html': {
    pageTitle:   'AS/A Level Mathematics — Subject Leader Tracker',
    accentVars:  '--accent: #c0392b; --accent-2: #fce8e6;',
    collection:  'asalevel_math_pacing',
    docId:       'year11-12',
    subjectKey:  'math',
    label:       'Mathematics',
    code:        '9709',
    qualifier:   'AS & A Level',
    years:       'Year 11–12',
    curriculum:  'asalevel',
    heading:     'AS/A Level Mathematics — Tracker',
    breadcrumb:  'AS/A Level Mathematics',
  },
  'as-alevel-biology-tracker.html': {
    pageTitle:   'AS/A Level Biology — Subject Leader Tracker',
    accentVars:  '--accent: #27ae60; --accent-2: #e9f7ef;',
    collection:  'asalevel_biology_pacing',
    docId:       'year11-12',
    subjectKey:  'biology',
    label:       'Biology',
    code:        '9700',
    qualifier:   'AS & A Level',
    years:       'Year 11–12',
    curriculum:  'asalevel',
    heading:     'AS/A Level Biology — Tracker',
    breadcrumb:  'AS/A Level Biology',
  },
  'as-alevel-chemistry-tracker.html': {
    pageTitle:   'AS/A Level Chemistry — Subject Leader Tracker',
    accentVars:  '--accent: #e67e22; --accent-2: #fef3e2;',
    collection:  'asalevel_chemistry_pacing',
    docId:       'year11-12',
    subjectKey:  'chemistry',
    label:       'Chemistry',
    code:        '9701',
    qualifier:   'AS & A Level',
    years:       'Year 11–12',
    curriculum:  'asalevel',
    heading:     'AS/A Level Chemistry — Tracker',
    breadcrumb:  'AS/A Level Chemistry',
  },
  'as-alevel-physics-tracker.html': {
    pageTitle:   'AS/A Level Physics — Subject Leader Tracker',
    accentVars:  '--accent: #2980b9; --accent-2: #e8f4fd;',
    collection:  'asalevel_physics_pacing',
    docId:       'year11-12',
    subjectKey:  'physics',
    label:       'Physics',
    code:        '9702',
    qualifier:   'AS & A Level',
    years:       'Year 11–12',
    curriculum:  'asalevel',
    heading:     'AS/A Level Physics — Tracker',
    breadcrumb:  'AS/A Level Physics',
  },
};

const trackerTemplate = fs.readFileSync(path.join(__dirname, 'tracker-template.html'), 'utf8');
const generatedTrackers = {};
Object.entries(TRACKER_SUBJECTS).forEach(([filename, cfg]) => {
  generatedTrackers[filename] = trackerTemplate
    .replace('{{PAGE_TITLE}}',   cfg.pageTitle)
    .replace('{{ACCENT_VARS}}',  cfg.accentVars)
    .replace('{{COLLECTION}}',   cfg.collection)
    .replace('{{DOC_ID}}',       cfg.docId)
    .replace('{{SUBJECT_KEY}}',  cfg.subjectKey)
    .replace('{{LABEL}}',        cfg.label)
    .replace('{{CODE}}',         cfg.code)
    .replace('{{QUALIFIER}}',    cfg.qualifier)
    .replace('{{YEARS}}',        cfg.years)
    .replace('{{CURRICULUM}}',   cfg.curriculum)
    .replace('{{HEADING}}',      cfg.heading)
    .replace('{{BREADCRUMB}}',   cfg.breadcrumb);
});

// Read firebase-env partial once (used for placeholder injection)
const firebaseEnvPartial = fs.readFileSync(path.join(__dirname, 'partials', 'firebase-env.html'), 'utf8');

// Read pacing shared partials (CSS + JS) — injected into every pacing page
const pacingSharedCss = '<style>\n' + fs.readFileSync(path.join(__dirname, 'partials', 'pacing-shared.css'), 'utf8') + '\n</style>';
const pacingSharedJs  = '<script src="/partials/pacing-shared.js"></script>';

function processFile(filename) {
  let html = generatedIgcse[filename] || generatedCheckpoint[filename] || generatedAsALevel[filename] || generatedTrackers[filename] || fs.readFileSync(path.join(__dirname, filename), 'utf8');

  // Inject firebase-env partial where placeholder comment exists
  html = html.replace(/<!-- FIREBASE_ENV -->/g, firebaseEnvPartial);

  // Inject pacing shared CSS/JS where placeholder comments exist
  html = html.replace(/<!-- PACING_SHARED_CSS -->/g, pacingSharedCss);
  html = html.replace(/<!-- PACING_SHARED_JS -->/g, pacingSharedJs);

  // Replace Firebase config placeholders
  envVars.forEach(varName => {
    const placeholder = `__${varName}__`;
    const value = process.env[varName] || '';
    if (!value) {
      console.warn(`Warning: ${varName} environment variable is not set`);
    }
    html = html.replace(new RegExp(placeholder, 'g'), value);
  });

  // Remove local-dev-only firebase-config.js script tag
  html = html.replace(/<script src="firebase-config\.js"><\/script>\n?/g, '');

  // Use absolute path for auth-guard.js so subdirectory pages resolve it correctly
  html = html.replace(/src="auth-guard\.js"/g, 'src="/auth-guard.js"');

  // Use absolute path for base.css so subdirectory pages resolve it correctly
  html = html.replace(/href="base\.css"/g, 'href="/base.css"');

  // Use absolute paths for partials so subdirectory pages resolve them correctly
  html = html.replace(/src="partials\/navbar\.js"/g, 'src="/partials/navbar.js"');
  html = html.replace(/src="partials\/pacing-tracker-core\.js"/g, 'src="/partials/pacing-tracker-core.js"');
  html = html.replace(/src="partials\/pacing-schedule\.js"/g, 'src="/partials/pacing-schedule.js"');
  html = html.replace(/src="partials\/pacing-week-timeline\.js"/g, 'src="/partials/pacing-week-timeline.js"');
  html = html.replace(/href="partials\/pacing-tracker-core\.css"/g, 'href="/partials/pacing-tracker-core.css"');
  html = html.replace(/href="partials\/pacing-page\.css"/g, 'href="/partials/pacing-page.css"');
  html = html.replace(/fetch\('partials\/navbar\.html'\)/g, "fetch('/partials/navbar.html')");

  // Rewrite internal .html links to clean URLs
  LINK_REWRITES.forEach(([pattern, replacement]) => {
    html = html.replace(pattern, replacement);
  });

  // Phase 4 — inject /cambridge-crossref.js once per page (defer; auto-
  // bootstraps from DOM scan, so CTS chips become clickable cross-ref
  // popovers without per-page wiring). Skipped for login.html which
  // doesn't render CTS chips and doesn't need the runtime, and for
  // orientation.html which runs pre-login (no window.db, has its own
  // inline CTS detail panel).
  // Use lastIndexOf so we target the actual document </body> and not a
  // </body> sitting inside an inline JS template literal.
  if (filename !== 'login.html' && filename !== 'index.html' &&
      filename !== 'orientation.html' &&
      !html.includes('/cambridge-crossref.js')) {
    const closeIdx = html.lastIndexOf('</body>');
    if (closeIdx >= 0) {
      html = html.slice(0, closeIdx)
        + '<script src="/cambridge-crossref.js" defer></script>\n'
        + html.slice(closeIdx);
    }
  }

  // Determine output path
  const slug = ROUTES[filename];
  let outPath;
  if (slug === '') {
    outPath = path.join(distDir, 'index.html');
  } else {
    const dir = path.join(distDir, slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    outPath = path.join(dir, 'index.html');
  }

  fs.writeFileSync(outPath, html);
  const displayPath = slug === '' ? 'dist/index.html' : `dist/${slug}/index.html`;
  console.log(`Output: ${displayPath}  (/${slug || ''})`);
}

Object.keys(ROUTES).forEach(processFile);

// Copy auth-guard.js to dist root (referenced as relative URL from clean URL pages)
fs.copyFileSync(path.join(__dirname, 'auth-guard.js'), path.join(distDir, 'auth-guard.js'));
console.log('Copied: dist/auth-guard.js');

// Copy base.css to dist root
fs.copyFileSync(path.join(__dirname, 'base.css'), path.join(distDir, 'base.css'));
console.log('Copied: dist/base.css');

// Phase 4 — Cambridge cross-reference popover. Auto-bootstraps from DOM
// scan so pages with CTS chips get cross-ref click-to-expand for free.
if (fs.existsSync(path.join(__dirname, 'cambridge-crossref.js'))) {
  fs.copyFileSync(path.join(__dirname, 'cambridge-crossref.js'), path.join(distDir, 'cambridge-crossref.js'));
  console.log('Copied: dist/cambridge-crossref.js');
}

// Copy tokens.css to dist root
if (fs.existsSync(path.join(__dirname, 'tokens.css'))) {
  fs.copyFileSync(path.join(__dirname, 'tokens.css'), path.join(distDir, 'tokens.css'));
  console.log('Copied: dist/tokens.css');
}

// Simple nav editor module — local copy lives in this repo (committed) so
// Vercel builds don't depend on the monorepo-root /shared-design/ folder.
// Source of truth is monorepo-root /shared-design/nav-edit-simple.js;
// keep in sync via `node scripts/design/sync-tokens.js --apply`.
const localNavEdit  = path.join(__dirname, 'nav-edit-simple.js');
const sharedNavEdit = path.join(__dirname, '..', 'shared-design', 'nav-edit-simple.js');
const navEditSrc    = fs.existsSync(localNavEdit) ? localNavEdit
                    : (fs.existsSync(sharedNavEdit) ? sharedNavEdit : null);
if (navEditSrc) {
  fs.copyFileSync(navEditSrc, path.join(distDir, 'nav-edit-simple.js'));
  console.log(`Copied: ${path.relative(__dirname, navEditSrc)} -> dist/nav-edit-simple.js`);
} else {
  console.warn('WARNING: nav-edit-simple.js not found locally or in shared-design/');
}

// Copy partials folder to dist root
const partialsSrcDir = path.join(__dirname, 'partials');
const partialsDistDir = path.join(distDir, 'partials');
if (fs.existsSync(partialsSrcDir)) {
  if (!fs.existsSync(partialsDistDir)) {
    fs.mkdirSync(partialsDistDir, { recursive: true });
  }
  fs.readdirSync(partialsSrcDir).forEach(file => {
    // firebase-env.html is injected inline via <!-- FIREBASE_ENV --> — no need to serve it
    if (file === 'firebase-env.html') return;

    const srcFile = path.join(partialsSrcDir, file);
    const destFile = path.join(partialsDistDir, file);
    if (file.endsWith('.html')) {
      // Apply the same internal link rewrites so navbar links work in production
      let content = fs.readFileSync(srcFile, 'utf8');
      LINK_REWRITES.forEach(([pattern, replacement]) => {
        content = content.replace(pattern, replacement);
      });
      fs.writeFileSync(destFile, content);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
    console.log(`Copied: dist/partials/${file}`);
  });
} else {
  console.warn('Warning: partials directory not found');
}

// Copy resources/ folder to dist root (JSON data files: appraisal framework, walkthrough rubric, etc.)
const resourcesSrcDir = path.join(__dirname, 'resources');
const resourcesDistDir = path.join(distDir, 'resources');
if (fs.existsSync(resourcesSrcDir)) {
  if (!fs.existsSync(resourcesDistDir)) {
    fs.mkdirSync(resourcesDistDir, { recursive: true });
  }
  fs.readdirSync(resourcesSrcDir).forEach(file => {
    fs.copyFileSync(path.join(resourcesSrcDir, file), path.join(resourcesDistDir, file));
    console.log(`Copied: dist/resources/${file}`);
  });
}

// Copy interactive/ folder to dist (standalone HTML tools, no auth)
const interactiveSrcDir = path.join(__dirname, 'interactive');
const interactiveDistDir = path.join(distDir, 'interactive');
if (fs.existsSync(interactiveSrcDir)) {
  if (!fs.existsSync(interactiveDistDir)) {
    fs.mkdirSync(interactiveDistDir, { recursive: true });
  }
  fs.readdirSync(interactiveSrcDir).forEach(file => {
    fs.copyFileSync(path.join(interactiveSrcDir, file), path.join(interactiveDistDir, file));
    console.log(`Copied: dist/interactive/${file}`);
  });
}

console.log('Build completed successfully!');
