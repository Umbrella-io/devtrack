const fs = require('fs');
let content = fs.readFileSync('test/github-accounts-api.test.ts', 'utf8');

// replace all `params: { githubId: <anything> }` with `params: Promise.resolve({ githubId: <anything> })`
content = content.replace(/params:\s*{\s*githubId:\s*([^}]+)\s*}/g, (match, p1) => {
  return `params: Promise.resolve({ githubId: ${p1} })`;
});

// Since multi_replace_file_content partially messed up one line in the test file earlier:
// let's just make sure there are no duplicate test lines.
// "const res = await DELETE(req, { params: { githubId: "" } });\n      const res = await DELETE(req, { params: Promise.resolve({ githubId: "" }) });"
content = content.replace('const res = await DELETE(req, { params: { githubId: "" } });\n      const res = await DELETE(req, { params: Promise.resolve({ githubId: "" }) });', 'const res = await DELETE(req, { params: Promise.resolve({ githubId: "" }) });');

fs.writeFileSync('test/github-accounts-api.test.ts', content, 'utf8');
console.log('Fixed test file');
