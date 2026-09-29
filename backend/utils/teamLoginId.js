const TeamAccount = require('../models/TeamAccount');

async function nextAarohanTeamLoginId(roundNumber = 1) {
  const round = Math.max(1, parseInt(roundNumber, 10) || 1);
  const prefix = round === 1 ? 'aarohan-team' : `aarohan-r${round}team`;
  const matchingAccounts = await TeamAccount.find({
    loginId: new RegExp(`^${prefix}[0-9]+$`)
  }).select('loginId').lean();
  const nextNumber = matchingAccounts.reduce((highest, account) => {
    const suffix = Number(account.loginId.slice(prefix.length));
    return Number.isInteger(suffix) ? Math.max(highest, suffix) : highest;
  }, 0) + 1;
  return `${prefix}${nextNumber}`;
}

module.exports = { nextAarohanTeamLoginId };
