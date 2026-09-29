const express = require('express');
const router = express.Router();
const RoundTeam = require('../models/RoundTeam');
const Participant = require('../models/Participant');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

// @route GET /api/admin/teams/round/:roundNumber
router.get('/round/:roundNumber', async (req, res) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    const teams = await RoundTeam.find({ roundNumber: roundNum })
      .populate('projectId')
      .sort({ teamCode: 1 });
    
    res.json(teams);
  } catch (error) {
    console.error('Fetch Teams Error:', error);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

// @route POST /api/admin/teams
router.post('/', async (req, res) => {
  try {
    const { roundNumber, participantIds, projectId, customTeamCode } = req.body;

    if (!roundNumber || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: 'Round number and participant IDs array are required' });
    }

    const cleanIds = participantIds.map(id => id.trim().toUpperCase());

    // Prevent double assignment in the same round
    const existingAssignments = await RoundTeam.find({
      roundNumber: parseInt(roundNumber, 10),
      participantIds: { $in: cleanIds }
    });

    if (existingAssignments.length > 0) {
      const busyIds = [];
      existingAssignments.forEach(t => {
        t.participantIds.forEach(pid => {
          if (cleanIds.includes(pid)) busyIds.push(`${pid} in ${t.teamCode}`);
        });
      });
      return res.status(400).json({
        message: `Participants already assigned in Round ${roundNumber}: ${busyIds.join(', ')}`
      });
    }

    // Auto-generate team code if not custom
    let teamCode = customTeamCode;
    if (!teamCode) {
      const count = await RoundTeam.countDocuments({ roundNumber: parseInt(roundNumber, 10) });
      const nextNum = String(count + 1).padStart(3, '0');
      teamCode = `ROUND${roundNumber}-T${nextNum}`;
    }

    const team = new RoundTeam({
      roundNumber: parseInt(roundNumber, 10),
      teamCode,
      participantIds: cleanIds,
      projectId: projectId || null
    });

    await team.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'TEAM_CREATED',
      roundNumber: parseInt(roundNumber, 10),
      teamId: team.teamCode,
      details: `Created team ${teamCode} with participants: ${cleanIds.join(', ')}`
    });

    res.status(201).json(team);
  } catch (error) {
    console.error('Create Team Error:', error);
    res.status(500).json({ message: 'Failed to create team' });
  }
});

// @route PUT /api/admin/teams/:id
router.put('/:id', async (req, res) => {
  try {
    const { participantIds, projectId } = req.body;
    const team = await RoundTeam.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (participantIds && Array.isArray(participantIds)) {
      const cleanIds = participantIds.map(id => id.trim().toUpperCase());
      
      // Check collision with other teams in same round
      const conflicts = await RoundTeam.find({
        roundNumber: team.roundNumber,
        _id: { $ne: team._id },
        participantIds: { $in: cleanIds }
      });

      if (conflicts.length > 0) {
        return res.status(400).json({ message: 'One or more participants are already in another team in this round' });
      }

      team.participantIds = cleanIds;
    }

    if (projectId !== undefined) team.projectId = projectId || null;

    await team.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'TEAM_UPDATED',
      roundNumber: team.roundNumber,
      teamId: team.teamCode,
      details: `Updated team ${team.teamCode}`
    });

    res.json(team);
  } catch (error) {
    console.error('Update Team Error:', error);
    res.status(500).json({ message: 'Failed to update team' });
  }
});

// @route DELETE /api/admin/teams/:id
router.delete('/:id', async (req, res) => {
  try {
    const team = await RoundTeam.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    await RoundTeam.findByIdAndDelete(req.params.id);

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'TEAM_DISSOLVED',
      roundNumber: team.roundNumber,
      teamId: team.teamCode,
      details: `Dissolved team ${team.teamCode}`
    });

    res.json({ message: `Team ${team.teamCode} dissolved` });
  } catch (error) {
    console.error('Delete Team Error:', error);
    res.status(500).json({ message: 'Failed to delete team' });
  }
});

module.exports = router;
