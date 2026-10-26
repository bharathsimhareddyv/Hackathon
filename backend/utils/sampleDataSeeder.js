const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Terms = require('../models/Terms');
const Settings = require('../models/Settings');

async function seedInitialData() {
  try {
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      admin = new Admin({
        username: 'admin',
        email: process.env.ADMIN_PASSWORD_OTP_EMAIL || 'bharathsimhareddyv19@gmail.com',
        name: 'Aarohan Hackathon Director',
        passwordHash
      });
      await admin.save();
      console.log('Default Admin created: username=admin, ******');
    }
    if (admin.username === 'admin' && admin.email === 'admin@aarohan.org') {
      admin.email = process.env.ADMIN_PASSWORD_OTP_EMAIL || 'bharathsimhareddyv19@gmail.com';
      await admin.save();
    }

    let terms = await Terms.findOne({ isCurrent: true });
    if (!terms) {
      terms = new Terms({
        version: '1.0',
        content: `### AAROHAN PROGRAM HACKATHON — TERMS & CONDITIONS

1. **Schedule Compliance**: Students must participate strictly according to the assigned hackathon schedule.
2. **Project Workspace**: Students must use the assigned project/repository files provided by the AAROHAN platform.
3. **Local Development**: Work must be completed on participant machines. Submissions must be uploaded prior to round deadlines.
4. **Originality & Fair Play**: Plagiarism, unauthorized code sharing between teams, or tampering with evaluation metrics is strictly prohibited.
5. **Organizers Right**: AAROHAN organizers reserve the right to disqualify any participant or team failing to adhere to rules.
6. **Data Usage**: Progress, debug metrics, and submissions will be manually evaluated by assigned mentors and admins.`,
        isCurrent: true
      });
      await terms.save();
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({
        hackathonName: 'AAROHAN PROGRAM HACKATHON',
        programName: 'Tribal Student Youth Empowerment Platform',
        logoUrl: '',
        description: 'Learn • Debug • Build • Innovate',
        contactInfo: 'support@aarohan-hackathon.org',
        leaderboardPublic: true
      });
      await settings.save();
    }
  } catch (error) {
    console.error('Data Seeding Error:', error);
  }
}

module.exports = { seedInitialData };
