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

function processFile(filename) {
  let html = fs.readFileSync(path.join(__dirname, filename), 'utf8');

  envVars.forEach(varName => {
    const placeholder = `__${varName}__`;
    const value = process.env[varName] || '';

    if (!value) {
      console.warn(`Warning: ${varName} environment variable is not set`);
    }

    html = html.replace(new RegExp(placeholder, 'g'), value);
  });

  fs.writeFileSync(path.join(distDir, filename), html);
  console.log(`Output: dist/${filename}`);
}

processFile('index.html');
processFile('messageboard.html');
processFile('igcse-math-pacing.html');
processFile('pacing-hub.html');
processFile('igcse-physics-pacing.html');
processFile('igcse-chemistry-pacing.html');
processFile('igcse-biology-pacing.html');
processFile('announcements.html');
processFile('library.html');

console.log('Build completed successfully!');
