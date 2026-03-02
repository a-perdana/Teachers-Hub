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

// Map: source filename → clean URL path (relative to dist root)
// index.html stays at root; everything else gets a named subfolder
const ROUTES = {
  'index.html':                 '',               // dist/index.html         → /
  'pacing-hub.html':            'pacing',         // dist/pacing/index.html  → /pacing
  'igcse-math-pacing.html':     'math',           // dist/math/index.html    → /math
  'igcse-physics-pacing.html':  'physics',        // dist/physics/index.html → /physics
  'igcse-chemistry-pacing.html':'chemistry',      // dist/chemistry/index.html → /chemistry
  'igcse-biology-pacing.html':  'biology',        // dist/biology/index.html → /biology
  'announcements.html':         'announcements',  // dist/announcements/index.html → /announcements
  'messageboard.html':          'messageboard',   // dist/messageboard/index.html → /messageboard
  'library.html':               'library',        // dist/library/index.html → /library
};

// Internal href replacements: old link → clean URL
const LINK_REWRITES = [
  [/href="index\.html"/g,                   'href="/"'],
  [/href="pacing-hub\.html"/g,              'href="/pacing"'],
  [/href="igcse-math-pacing\.html"/g,       'href="/math"'],
  [/href="igcse-physics-pacing\.html"/g,    'href="/physics"'],
  [/href="igcse-chemistry-pacing\.html"/g,  'href="/chemistry"'],
  [/href="igcse-biology-pacing\.html"/g,    'href="/biology"'],
  [/href="announcements\.html"/g,           'href="/announcements"'],
  [/href="messageboard\.html"/g,            'href="/messageboard"'],
  [/href="library\.html"/g,                 'href="/library"'],
];

function processFile(filename) {
  let html = fs.readFileSync(path.join(__dirname, filename), 'utf8');

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

  // Rewrite internal .html links to clean URLs
  LINK_REWRITES.forEach(([pattern, replacement]) => {
    html = html.replace(pattern, replacement);
  });

  // Determine output path
  const slug = ROUTES[filename];
  let outPath;
  if (slug === '') {
    // Root page
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

console.log('Build completed successfully!');
