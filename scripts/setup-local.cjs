// Local development only: generate credentials without printing or replacing existing secrets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function read(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line)).map(line => {
    const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2')];
  }));
}
const serverFile = path.join(root, 'server/.env');
const composeFile = path.join(root, '.env');
const existing = read(serverFile), compose = read(composeFile);
if (existing.NODE_ENV === 'production') throw new Error('Local setup cannot modify a production environment');
const random = () => crypto.randomBytes(32).toString('hex');
const db = existing.DATABASE_URL ? new URL(existing.DATABASE_URL) : null;
const cache = existing.REDIS_URL ? new URL(existing.REDIS_URL) : null;
if ((db?.port && db.port !== '5432') || (cache?.port && cache.port !== '6379')) throw new Error('Custom service ports require manual Compose configuration; no files changed');
for (const url of [db, cache]) if (url && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local setup requires localhost database/cache URLs');
const settings = {
  POSTGRES_DB: compose.POSTGRES_DB || (db ? db.pathname.slice(1) : 'examdb'),
  POSTGRES_USER: compose.POSTGRES_USER || (db ? decodeURIComponent(db.username) : 'examuser'),
  POSTGRES_PASSWORD: compose.POSTGRES_PASSWORD || (db ? decodeURIComponent(db.password) : random()),
  REDIS_PASSWORD: compose.REDIS_PASSWORD || (cache?.password ? decodeURIComponent(cache.password) : random()),
  MINIO_ROOT_USER: compose.MINIO_ROOT_USER || existing.S3_ACCESS_KEY_ID || 'examstorage',
  MINIO_ROOT_PASSWORD: compose.MINIO_ROOT_PASSWORD || existing.S3_SECRET_ACCESS_KEY || random(),
  S3_BUCKET: compose.S3_BUCKET || existing.S3_BUCKET || 'exam-platform-uploads',
};
for (const value of Object.values(settings)) if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Existing credentials require manual Compose configuration; no files changed');
if (db && (decodeURIComponent(db.password) !== settings.POSTGRES_PASSWORD || decodeURIComponent(db.username) !== settings.POSTGRES_USER || db.pathname.slice(1) !== settings.POSTGRES_DB)) throw new Error('Existing database settings disagree; no files changed');
if (existing.S3_ACCESS_KEY_ID && existing.S3_ACCESS_KEY_ID !== settings.MINIO_ROOT_USER) throw new Error('Existing storage user disagrees; no files changed');
if (existing.S3_SECRET_ACCESS_KEY && existing.S3_SECRET_ACCESS_KEY !== settings.MINIO_ROOT_PASSWORD) throw new Error('Existing storage settings disagree; no files changed');
const encode = encodeURIComponent;
const replacements = {
 DATABASE_URL: existing.DATABASE_URL || `postgresql://${encode(settings.POSTGRES_USER)}:${encode(settings.POSTGRES_PASSWORD)}@127.0.0.1:5432/${settings.POSTGRES_DB}?schema=public`,
 REDIS_URL: `redis://:${encode(settings.REDIS_PASSWORD)}@127.0.0.1:${cache?.port || 6379}${cache?.pathname || ''}`,
 S3_ACCESS_KEY_ID: settings.MINIO_ROOT_USER, S3_SECRET_ACCESS_KEY: settings.MINIO_ROOT_PASSWORD,
 S3_BUCKET: settings.S3_BUCKET,
 JWT_ACCESS_SECRET: existing.JWT_ACCESS_SECRET || random(), JWT_REFRESH_SECRET: existing.JWT_REFRESH_SECRET || random(),
};
let server = fs.existsSync(serverFile) ? fs.readFileSync(serverFile, 'utf8') : fs.readFileSync(path.join(root, 'server/.env.example'), 'utf8');
for (const [key,value] of Object.entries(replacements)) {
 const regex = new RegExp(`^${key}=.*$`, 'm'); server = regex.test(server) ? server.replace(regex, `${key}=${value}`) : server + `\n${key}=${value}\n`;
}
if (fs.existsSync(serverFile) && server !== fs.readFileSync(serverFile,'utf8') && !fs.existsSync(serverFile+'.bak')) fs.copyFileSync(serverFile, serverFile+'.bak');
fs.writeFileSync(serverFile, server, {mode:0o600}); fs.chmodSync(serverFile,0o600);
if (fs.existsSync(serverFile+'.bak')) fs.chmodSync(serverFile+'.bak',0o600);
if (!fs.existsSync(composeFile)) fs.writeFileSync(composeFile, Object.entries(settings).map(([k,v])=>`${k}=${v}`).join('\n')+'\n', {mode:0o600});
else for (const [key,value] of Object.entries(settings)) if (!compose[key]) fs.appendFileSync(composeFile, `\n${key}=${value}\n`);
fs.chmodSync(composeFile,0o600);
const clientFile=path.join(root,'client/.env'); if(!fs.existsSync(clientFile)) fs.copyFileSync(path.join(root,'client/.env.example'),clientFile);
console.log('Local configuration ready. Existing database/storage credentials preserved; keep all forwarded service ports private.');
if (db) console.log('Existing volumes detected by configuration: rotate old database/storage passwords separately; setup does not rotate persisted credentials.');
