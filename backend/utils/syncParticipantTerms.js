const Participant = require('../models/Participant');

async function syncParticipantTerms(participantIds) {
  if (!participantIds.length) return;

  await Participant.updateMany(
    { arohanId: { $in: participantIds }, status: { $in: ['REGISTERED', 'TERMS_PENDING'] } },
    { $set: { status: 'READY' } }
  );
}

module.exports = syncParticipantTerms;
