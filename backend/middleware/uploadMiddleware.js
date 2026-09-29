const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isCloudinaryConfigured } = require('../config/cloudinary');

// Ensure local directories exist as fallback
const projectsDir = path.join(__dirname, '..', 'uploads', 'projects');
const submissionsDir = path.join(__dirname, '..', 'uploads', 'submissions');

if (!fs.existsSync(projectsDir)) {
  fs.mkdirSync(projectsDir, { recursive: true });
}
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true });
}

// Local Storage Engine
const localProjectStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, projectsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'project-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const localSubmissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, submissionsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'submission-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Memory storage engine when uploading to Cloudinary
const memoryStorage = multer.memoryStorage();
const zipOnly = (req, file, cb) => {
  if (path.extname(file.originalname).toLowerCase() !== '.zip') {
    return cb(new Error('Only ZIP archives are accepted'));
  }
  cb(null, true);
};

const uploadProject = multer({
  storage: isCloudinaryConfigured() ? memoryStorage : localProjectStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: zipOnly
});

const uploadSubmission = multer({
  storage: isCloudinaryConfigured() ? memoryStorage : localSubmissionStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: zipOnly
});

module.exports = { uploadProject, uploadSubmission };
