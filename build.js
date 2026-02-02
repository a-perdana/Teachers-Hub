const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read index.html
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Environment variables to replace
const envVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

// Replace placeholders with environment variables
envVars.forEach(varName => {
  const placeholder = `__${varName}__`;
  const value = process.env[varName] || '';

  if (!value) {
    console.warn(`Warning: ${varName} environment variable is not set`);
  }

  html = html.replace(new RegExp(placeholder, 'g'), value);
});

// Write to dist/index.html
fs.writeFileSync(path.join(distDir, 'index.html'), html);

console.log('Build completed successfully!');
console.log('Output: dist/index.html');
