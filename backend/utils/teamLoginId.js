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

function sequentialTeamLoginIds(teamName, startingNumber, count) {
  const prefix = String(teamName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const start = Number(startingNumber);
  const quantity = Number(count);

  if (!prefix || prefix.length > 40) {
    throw new Error('Team name must contain 1-40 letters or numbers');
  }
  if (!Number.isSafeInteger(start) || start < 1 || start > 999999999) {
    throw new Error('Starting number must be an integer between 1 and 999999999');
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200 || start + quantity - 1 > 999999999) {
    throw new Error('Team count must be between 1 and 200 and fit within the supported number range');
  }

  return Array.from({ length: quantity }, (_, index) => `${prefix}${start + index}`);
}

module.exports = { nextAarohanTeamLoginId, sequentialTeamLoginIds };
