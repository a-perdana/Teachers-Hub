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
  'asalevel-math-pacing.html': 'asalevel-math',
  'asalevel-biology-pacing.html': 'asalevel-biology',
  'asalevel-chemistry-pacing.html': 'asalevel-chemistry',
  'asalevel-physics-pacing.html': 'asalevel-physics',
  'announcements.html': 'announcements',
  'surveys.html': 'surveys',
  'messageboard.html': 'messageboard',
  'library.html': 'library',
  'weekly-checklist.html': 'weekly-checklist',
  'waiting.html': 'waiting',
  'teacher-self-assessment.html': 'teacher-self-assessment',
  'teacher-kpi-results.html': 'teacher-kpi-results',
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
  [/href="asalevel-math-pacing\.html"/g, 'href="/asalevel-math"'],
  [/href="asalevel-biology-pacing\.html"/g, 'href="/asalevel-biology"'],
  [/href="asalevel-chemistry-pacing\.html"/g, 'href="/asalevel-chemistry"'],
  [/href="asalevel-physics-pacing\.html"/g, 'href="/asalevel-physics"'],
  [/href="announcements\.html"/g, 'href="/announcements"'],
  [/href="surveys\.html"/g, 'href="/surveys"'],
  [/href="messageboard\.html"/g, 'href="/messageboard"'],
  [/href="library\.html"/g, 'href="/library"'],
  [/href="teacher-self-assessment\.html"/g, 'href="/teacher-self-assessment"'],
  [/href="teacher-kpi-results\.html"/g,    'href="/teacher-kpi-results"'],
];

// Read firebase-env partial once (used for placeholder injection)
const firebaseEnvPartial = fs.readFileSync(path.join(__dirname, 'partials', 'firebase-env.html'), 'utf8');

// Read pacing shared partials (CSS + JS) — injected into every pacing page
const pacingSharedCss = '<style>\n' + fs.readFileSync(path.join(__dirname, 'partials', 'pacing-shared.css'), 'utf8') + '\n</style>';
const pacingSharedJs  = '<script src="/partials/pacing-shared.js"></script>';

function processFile(filename) {
  let html = fs.readFileSync(path.join(__dirname, filename), 'utf8');

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
  html = html.replace(/fetch\('partials\/navbar\.html'\)/g, "fetch('/partials/navbar.html')");

  // Rewrite internal .html links to clean URLs
  LINK_REWRITES.forEach(([pattern, replacement]) => {
    html = html.replace(pattern, replacement);
  });

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

console.log('Build completed successfully!');
