const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const { AppError, badRequest } = require('./AppError');
const MAX_FILES = 3, MAX_BYTES = 5 * 1024 * 1024;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' };
let active = 0;
const waiting = [];
async function acquire() {
  if (active < 2) { active++; return; }
  if (waiting.length >= 16) throw new AppError('File checks are busy. Keep your files and retry shortly.', 503);
  await new Promise(resolve => waiting.push(resolve));
}
function release() { const next = waiting.shift(); if (next) next(); else active--; }
async function validateContent(bytes, mime) {
  await acquire();
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'supportFileValidation.worker.js'), {
        workerData: { bytes, mime }, execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
      });
      let done = false;
      const finish = (valid) => {
        if (done) return;
        done = true; clearTimeout(deadline);
        worker.terminate().finally(() => {
          if (valid) resolve();
          else reject(badRequest('Choose a valid JPEG, PNG or PDF without active content or embedded files.'));
        });
      };
      const deadline = setTimeout(() => finish(false), 5000);
      worker.once('message', valid => finish(valid === true));
      worker.once('error', () => finish(false));
      worker.once('exit', () => finish(false));
    });
  } finally { release(); }
}
async function validateFiles(files = [], { maxBytes=MAX_BYTES } = {}) {
  if (!Array.isArray(files) || files.length > MAX_FILES) throw badRequest('Attach at most 3 files per message.');
  for (const file of files) {
    const name = file.originalname;
    if (!file.size || file.size > maxBytes || typeof name !== 'string' || !name.trim() || name.length > 255 || /[\x00-\x1f\x7f]/.test(name)
      || MIME[path.extname(name).toLowerCase()] !== file.mimetype) {
      throw badRequest(`Each file must be a named JPEG, PNG or PDF of at most ${maxBytes/1024/1024} MB.`);
    }
    const stat = await fs.stat(file.path);
    if (!stat.isFile() || stat.size !== file.size) throw badRequest('The upload is incomplete. Select the file again.');
    const bytes = await fs.readFile(file.path);
    await validateContent(bytes, file.mimetype);
    file.content_hash = crypto.createHash('sha256').update(bytes).digest('hex');
  }
  return files;
}
async function cleanup(files = []) { await Promise.allSettled(files.map(file => file.path && fs.unlink(file.path))); }
module.exports = { MAX_FILES, MAX_BYTES, MIME, validateContent, validateFiles, cleanup };
