const fs = require('fs');
const path = require('path');

const root = __dirname;
const qbankDir = path.join(root, 'data', 'qbank');
const outputFile = path.join(qbankDir, 'index.json');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!entry.isFile()) return [];
    if (!entry.name.toLowerCase().endsWith('.json')) return [];
    if (entry.name.toLowerCase() === 'index.json') return [];
    const rel = path.relative(qbankDir, full).split(path.sep);
    // Required shape: data/qbank/<course>/<topic>/<lecture>.json only.
    if (rel.length !== 3) return [];
    return [full];
  });
}

const files = walk(qbankDir)
  .map(file => path.relative(root, file).split(path.sep).join('/'))
  .sort((a, b) => a.localeCompare(b));

fs.mkdirSync(qbankDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify({ files }, null, 2));
console.log(`Generated data/qbank/index.json with ${files.length} QBank file(s).`);
