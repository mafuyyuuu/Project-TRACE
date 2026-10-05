const multer = require('multer');
const { badRequest } = require('../utils/AppError');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Created eagerly: in the repo this directory only ever existed because
// .gitkeep held it open, so a fresh container (or a freshly mounted volume)
// has no uploads/ at all and multer fails the *first* upload with ENOENT.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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

/**
 * Storage for account profile pictures. Prefixed 'avatar-' so files.service
 * can tell them apart from request uploads and ID proofs at a glance.
 */
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const proofOptions = {
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.pdf'];
    const valid = extensions.includes(path.extname(file.originalname).toLowerCase()) &&
      (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf');
    cb(valid ? null : badRequest('ID proof must be an image or PDF, at most 10 MB.'), valid);
  },
};
const idProofUpload = multer({ storage: idProofStorage, ...proofOptions });
const temporaryIdStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, 'ocr-temp-' + crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
});
const signupOcrUpload = multer({ storage: temporaryIdStorage, ...proofOptions });

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

/**
 * Avatars are display-only images, so the allowance is deliberately narrower
 * than documentUpload's: images alone, and 2 MB rather than 10.
 */
const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extMatch = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeMatch = allowedTypes.test(file.mimetype);
    if (extMatch && mimeMatch) {
      cb(null, true);
    } else {
      // A carried status makes errorHandler answer 400 with this message,
      // rather than falling through to a bare 500.
      cb(badRequest('Profile pictures must be a JPG, PNG, or WebP image.'));
    }
  },
});

const pertinentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const types = {
      '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'],
      '.pdf': ['application/pdf'],
    };
    const allowed = types[path.extname(file.originalname).toLowerCase()]?.includes(file.mimetype);
    cb(allowed ? null : badRequest('Choose a JPG, PNG or PDF document, at most 10 MB.'), Boolean(allowed));
  },
});
const supportLimits = require('../utils/supportUpload');
const supportStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, 'support-' + crypto.randomBytes(24).toString('hex') + path.extname(file.originalname).toLowerCase()),
});
const supportUpload = multer({
  storage: supportStorage,
  limits: { files: supportLimits.MAX_FILES, fileSize: supportLimits.MAX_BYTES, fields: 3, fieldSize: 10000, parts: 6 },
  fileFilter: (req, file, cb) => {
    const mime = supportLimits.MIME[path.extname(file.originalname).toLowerCase()];
    const valid = Boolean(mime && mime === file.mimetype);
    cb(valid ? null : badRequest('Chat accepts JPEG, PNG or PDF files only, at most 5 MB each.'), valid);
  },
});
const parseSupportFiles = supportUpload.array('files', supportLimits.MAX_FILES);
function supportMessageUpload(req, res, next) {
  parseSupportFiles(req, res, async error => {
    if (!error) return next();
    await supportLimits.cleanup(req.files || []);
    next(error.code?.startsWith('LIMIT_')
      ? badRequest('Attach at most 3 JPEG, PNG or PDF files, 5 MB each, with your message.') : error);
  });
}
module.exports = { supportMessageUpload, supportUpload, idProofUpload, signupOcrUpload, documentUpload, pertinentUpload, profilePictureUpload, UPLOAD_DIR };
