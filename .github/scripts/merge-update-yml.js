// electron-builder writes a separate update-metadata yml per build invocation.
// When the same platform is built across multiple runners/invocations (e.g. mac
// arm64 on one runner, mac x64 on another) each writes its own complete yml that
// only lists its own artifact. electron-updater needs a single yml listing every
// artifact so it can pick the one matching the running app's architecture.
//
// Usage: node merge-update-yml.js <output.yml> <input1.yml> <input2.yml> [...]
const fs = require('fs');
const yaml = require('js-yaml');

const [, , outputPath, ...inputPaths] = process.argv;

if (!outputPath || inputPaths.length === 0) {
  console.error('Usage: node merge-update-yml.js <output.yml> <input1.yml> [input2.yml ...]');
  process.exit(1);
}

const docs = inputPaths.map(p => yaml.load(fs.readFileSync(p, 'utf8')));

const merged = { ...docs[0] };
const seenUrls = new Set();
merged.files = [];
for (const doc of docs) {
  for (const file of doc.files) {
    if (!seenUrls.has(file.url)) {
      seenUrls.add(file.url);
      merged.files.push(file);
    }
  }
}

fs.writeFileSync(outputPath, yaml.dump(merged, { lineWidth: -1 }));
console.log(`Wrote ${outputPath} with ${merged.files.length} file(s):`, merged.files.map(f => f.url).join(', '));
