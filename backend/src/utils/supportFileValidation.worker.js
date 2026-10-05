const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');
const { PDFDocument, PDFDict, PDFArray, PDFName, PDFStream } = require('pdf-lib');
// Never forward parser warnings or uploaded document contents into service logs.
console.warn = () => {};
console.error = () => {};
const forbidden = new Set(['JS', 'JavaScript', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'OpenAction', 'AA', 'RichMedia', 'XFA', 'SubmitForm', 'ImportData', 'GoToR', 'Rendition', 'Movie', 'Sound']);
function passive(object, visited) {
  if (!object || visited.has(object)) return true;
  visited.add(object);
  if (visited.size > 100000) return false;
  if (object instanceof PDFName) return !forbidden.has(object.decodeText());
  if (object instanceof PDFStream) return passive(object.dict, visited);
  if (object instanceof PDFDict) return object.entries().every(([name, value]) => passive(name, visited) && passive(value, visited));
  if (object instanceof PDFArray) return object.asArray().every(value => passive(value, visited));
  return true;
}
async function validate() {
  const bytes = Buffer.from(workerData.bytes);
  if (!['image/jpeg', 'image/png', 'application/pdf'].includes(workerData.mime)) return false;
  if (workerData.mime === 'application/pdf') {
    if (!/^%PDF-(1\.[0-7]|2\.0)/.test(bytes.subarray(0, 8).toString('ascii')) || !/%%EOF\s*$/.test(bytes.subarray(-1024).toString('latin1'))) return false;
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true, updateMetadata: false });
    return pdf.getPageCount() > 0 && pdf.context.enumerateIndirectObjects().every(([, object]) => passive(object, new Set()));
  }
  const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 16000000, sequentialRead: true });
  const metadata = await image.metadata();
  if (metadata.format !== (workerData.mime === 'image/png' ? 'png' : 'jpeg')) return false;
  // stats decodes the pixels; a plausible header alone is insufficient.
  await image.stats();
  return true;
}
validate().then(valid => parentPort.postMessage(valid)).catch(() => parentPort.postMessage(false));
