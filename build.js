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
  'pacing-hub.html': 'pacing',
  'igcse-math-pacing.html': 'math',
  'igcse-physics-pacing.html': 'physics',
  'igcse-chemistry-pacing.html': 'chemistry',
  'igcse-biology-pacing.html': 'biology',
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
};

// Internal href replacements: old link -> clean URL
const LINK_REWRITES = [
  [/href="index\.html"/g, 'href="/"'],
  [/href="pacing-hub\.html"/g, 'href="/pacing"'],
  [/href="igcse-math-pacing\.html"/g, 'href="/math"'],
  [/href="igcse-physics-pacing\.html"/g, 'href="/physics"'],
  [/href="igcse-chemistry-pacing\.html"/g, 'href="/chemistry"'],
  [/href="igcse-biology-pacing\.html"/g, 'href="/biology"'],
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

  // Use absolute path for auth-guard.js so subdirectory pages resolve it correctly
  html = html.replace(/src="auth-guard\.js"/g, 'src="/auth-guard.js"');

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

// Copy partials folder to dist root
const partialsSrcDir = path.join(__dirname, 'partials');
const partialsDistDir = path.join(distDir, 'partials');
if (fs.existsSync(partialsSrcDir)) {
  if (!fs.existsSync(partialsDistDir)) {
    fs.mkdirSync(partialsDistDir, { recursive: true });
  }
  fs.readdirSync(partialsSrcDir).forEach(file => {
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
