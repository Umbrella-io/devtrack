const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');

if (fs.existsSync(standaloneDir)) {
  console.log('Copying static files to standalone directory...');
  copyDir(
    path.join(__dirname, '..', 'public'),
    path.join(standaloneDir, 'public')
  );
  copyDir(
    path.join(__dirname, '..', '.next', 'static'),
    path.join(standaloneDir, '.next', 'static')
  );
  console.log('Done.');
}
