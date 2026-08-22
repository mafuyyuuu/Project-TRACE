const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

/**
 * Storage for account-verification proof (Student ID / Diploma) uploaded
 * during registration. Filenames are prefixed 'proof-' to distinguish
 * them from document-request uploads.
 */
const idProofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  },
});

/**
 * Storage for document-request uploads (intake scans, GCash receipts,
 * official receipts). Restricted to images, PDFs, and Word docs, 10 MB max.
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const idProofUpload = multer({ storage: idProofStorage });

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extMatch = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeMatch = allowedTypes.test(file.mimetype);
    if (extMatch || mimeMatch) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Word documents are allowed.'));
    }
  },
});

module.exports = { idProofUpload, documentUpload, UPLOAD_DIR };
