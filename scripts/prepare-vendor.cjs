const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vendor = path.resolve(__dirname, '../vendor');
const parts = path.join(vendor, 'xlsx-0.20.3.parts');
const names = fs.readdirSync(parts).sort();
if (names.length !== 54 || names.some((name, i) => name !== `${String(i).padStart(3, '0')}.b64`)) {
  throw new Error('Incomplete SheetJS vendor archive');
}
const archive = Buffer.concat(names.map(name => Buffer.from(fs.readFileSync(path.join(parts, name), 'utf8'), 'base64')));
const expected = 'oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==';
if (crypto.createHash('sha512').update(archive).digest('base64') !== expected) {
  throw new Error('SheetJS vendor integrity mismatch');
}
fs.writeFileSync(path.join(vendor, 'xlsx-0.20.3.tgz'), archive);
console.log('Verified and prepared SheetJS 0.20.3');
