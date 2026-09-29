const TeamAccount = require('../models/TeamAccount');

async function nextAarohanTeamLoginId() {
  const count = await TeamAccount.countDocuments();
  let n = count + 1;
  let loginId = `aarohan-team${n}`;
  while (await TeamAccount.findOne({ loginId })) {
    n += 1;
    loginId = `aarohan-team${n}`;
  }
  return loginId;
}

module.exports = { nextAarohanTeamLoginId };
