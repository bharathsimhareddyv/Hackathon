const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const RoundTeam = require('../models/RoundTeam');
const DownloadLog = require('../models/DownloadLog');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProject } = require('../middleware/uploadMiddleware');
const { isCloudinaryConfigured, uploadToCloudinary, createRawDownloadUrl } = require('../config/cloudinary');

// @route GET /api/projects/:id/download
// Accessible by logged in student or admin
router.get('/:id/download', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role === 'TEAM') {
      const assignedTeam = await RoundTeam.exists({
        roundNumber: project.roundNumber,
        teamAccountId: req.user._id,
        projectId: project._id
      });
      if (!assignedTeam) return res.status(403).json({ message: 'This project is not assigned to your team' });
    }

    // Record download log if requested by student
    if (req.user.role === 'STUDENT') {
      const assignedTeam = await RoundTeam.exists({
        roundNumber: project.roundNumber,
        participantIds: req.user.arohanId,
        projectId: project._id
      });
      if (!assignedTeam) return res.status(403).json({ message: 'This project is not assigned to you' });
      await DownloadLog.create({
        participantId: req.user.arohanId,
        roundNumber: project.roundNumber,
        projectId: project._id,
        projectName: project.name
      });
    }

    const downloadName = path.basename(project.originalFileName || `${project.name}.zip`);

    if (project.filePath && (project.filePath.startsWith('http://') || project.filePath.startsWith('https://'))) {
      return res.json({
        downloadUrl: createRawDownloadUrl(project.filePath),
        fileName: downloadName
      });
    }

    if (!project.filePath || !fs.existsSync(project.filePath)) {
      return res.status(404).json({ message: 'Project file not found on server' });
    }

    res.download(project.filePath, downloadName);
  } catch (error) {
    console.error('Download Project Error:', error);
    res.status(500).json({ message: 'Failed to download project' });
  }
});

// Admin-only endpoints below
router.use(protect, adminOnly);

// @route GET /api/admin/projects
router.get('/', async (req, res) => {
  try {
    const { roundNumber } = req.query;
    let query = {};
    if (roundNumber) query.roundNumber = parseInt(roundNumber, 10);

    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Fetch Projects Error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// @route POST /api/admin/projects/upload
router.post('/upload', uploadProject.single('projectZip'), async (req, res) => {
  try {
    const {
      name,
      roundNumber,
      description,
      githubUrl,
      instructions,
      totalErrors,
      htmlErrors,
      cssErrors,
      jsErrors,
      reactErrors
    } = req.body;

    if (!name || !roundNumber) {
      return res.status(400).json({ message: 'Project name and round number are required' });
    }

    let filePath = null;
    let originalFileName = null;
    let fileSize = 0;

    if (req.file) {
      originalFileName = req.file.originalname;
      fileSize = req.file.size;

      if (!isCloudinaryConfigured()) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(503).json({ message: 'Configure Cloudinary before uploading project archives' });
      }
      const cResult = await uploadToCloudinary(req.file.buffer, originalFileName, 'aarohan_projects');
      filePath = cResult.secure_url;
    }

    const project = new Project({
      name,
      roundNumber: parseInt(roundNumber, 10),
      description: description || '',
      filePath,
      originalFileName,
      fileSize,
      githubUrl: githubUrl || '',
      instructions: instructions || '',
      totalErrors: totalErrors ? parseInt(totalErrors, 10) : 200,
      htmlErrors: htmlErrors ? parseInt(htmlErrors, 10) : 50,
      cssErrors: cssErrors ? parseInt(cssErrors, 10) : 50,
      jsErrors: jsErrors ? parseInt(jsErrors, 10) : 50,
      reactErrors: reactErrors ? parseInt(reactErrors, 10) : 50
    });

    await project.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'PROJECT_UPLOADED',
      roundNumber: parseInt(roundNumber, 10),
      details: `Uploaded project '${name}' for Round ${roundNumber} (${isCloudinaryConfigured() ? 'Cloudinary Storage' : 'Local Storage'})`
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Upload Project Error:', error);
    res.status(500).json({ message: 'Failed to upload project: ' + error.message });
  }
});

// @route DELETE /api/admin/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.filePath && !project.filePath.startsWith('http') && fs.existsSync(project.filePath)) {
      try {
        fs.unlinkSync(project.filePath);
      } catch (err) {
        console.error('File unlink error:', err);
      }
    }

    await Project.findByIdAndDelete(req.params.id);

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'PROJECT_DELETED',
      roundNumber: project.roundNumber,
      details: `Deleted project '${project.name}'`
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete Project Error:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
