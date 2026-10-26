const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Project = require('../models/Project');
const Round = require('../models/Round');
const Branch = require('../models/Branch');
const RoundTeam = require('../models/RoundTeam');
const DownloadLog = require('../models/DownloadLog');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProject } = require('../middleware/uploadMiddleware');
const { isCloudinaryConfigured, uploadToCloudinary, createRawDownloadUrl } = require('../config/cloudinary');
const { roundsVisibleToBranch } = require('../utils/roundVisibility');

async function validateProjectBranchIds(values, round) {
  const ids = [...new Set(values.map(value => String(value)))];
  if (ids.some(id => !/^[a-f\d]{24}$/i.test(id))) {
    throw Object.assign(new Error('Choose valid branches for this project'), { statusCode: 400 });
  }
  if (ids.length && await Branch.countDocuments({ _id: { $in: ids } }) !== ids.length) {
    throw Object.assign(new Error('One or more selected branches do not exist'), { statusCode: 400 });
  }
  const allowedBranchIds = round
    ? (round.branchId ? [String(round.branchId)] : (round.assignedBranchIds || []).map(String))
    : null;
  if (allowedBranchIds && ids.some(id => !allowedBranchIds.includes(id))) {
    throw Object.assign(new Error('Assign this round to each selected branch before assigning its project'), { statusCode: 400 });
  }
  return ids;
}

// @route GET /api/projects/:id/download
// Accessible by logged in student or admin
router.get('/:id/download', protect, async (req, res) => {
  try {
    if (!['ADMIN', 'BRANCH_ADMIN', 'TEAM', 'STUDENT'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Project downloads are unavailable to this account' });
    }

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
    if (req.user.role === 'BRANCH_ADMIN') {
      const branchProject = await Project.exists({
        _id: project._id,
        $or: [{ branchId: req.user._id }, { assignedBranchIds: req.user._id }]
      });
      const branchRound = await Round.exists({
        roundNumber: project.roundNumber,
        ...roundsVisibleToBranch(req.user._id)
      });
      if (!branchProject || !branchRound) {
        return res.status(403).json({ message: 'This project is not available to your branch' });
      }
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
    let assignedBranchIds;

    try {
      const submittedIds = req.body.assignedBranchIds
        ? JSON.parse(req.body.assignedBranchIds)
        : [];
      if (!Array.isArray(submittedIds)) throw new Error('Branch assignments must be an array');
      const round = await Round.findOne({ roundNumber: parseInt(roundNumber, 10) });
      if (!round) return res.status(400).json({ message: 'Choose an existing round for the project' });
      assignedBranchIds = await validateProjectBranchIds(submittedIds, round);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ message: error.message || 'Invalid branch assignments' });
    }

    if (!name || !roundNumber) {
      return res.status(400).json({ message: 'Project name and round number are required' });
    }
    let repositoryUrl = '';
    if (githubUrl) {
      try {
        const parsedUrl = new URL(githubUrl);
        if (parsedUrl.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(parsedUrl.hostname)) {
          throw new Error('Invalid GitHub URL');
        }
        repositoryUrl = parsedUrl.toString();
      } catch {
        return res.status(400).json({ message: 'Enter a valid HTTPS GitHub repository URL' });
      }
    }

    if (Boolean(req.file) === Boolean(repositoryUrl)) {
      return res.status(400).json({ message: 'Choose exactly one project source: upload a ZIP or provide a GitHub repository URL' });
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
      assignedBranchIds,
      description: description || '',
      filePath,
      originalFileName,
      fileSize,
      githubUrl: repositoryUrl,
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

router.put('/:id/branches', async (req, res) => {
  try {
    if (!Array.isArray(req.body.assignedBranchIds)) {
      return res.status(400).json({ message: 'Branch assignments must be an array' });
    }
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const round = await Round.findOne({ roundNumber: project.roundNumber });
    if (!round) return res.status(409).json({ message: 'The project round no longer exists' });
    project.branchId = null;
    project.assignedBranchIds = await validateProjectBranchIds(req.body.assignedBranchIds, round);
    await project.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'PROJECT_BRANCHES_UPDATED',
      roundNumber: project.roundNumber,
      details: `Updated branch assignments for project '${project.name}'`
    });
    res.json(project);
  } catch (error) {
    console.error('Update Project Branch Assignments Error:', error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to update project branch assignments'
    });
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
