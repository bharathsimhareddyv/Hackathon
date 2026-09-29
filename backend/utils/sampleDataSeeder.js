const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const Participant = require('../models/Participant');
const Round = require('../models/Round');
const RoundTeam = require('../models/RoundTeam');
const Project = require('../models/Project');
const Evaluation = require('../models/Evaluation');
const Submission = require('../models/Submission');
const Terms = require('../models/Terms');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const { generateRandomPassword } = require('./passwordGenerator');

async function createSampleZip(fileName, contentMap) {
  // Simple uncompressed ZIP creator helper using node standard buffers
  // Or create text placeholder files if zip library isn't present
  // To make it a valid ZIP without external deps, we can use a basic zip buffer generator or lightweight zip format
  const projectsDir = path.join(__dirname, '..', 'uploads', 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }

  const filePath = path.join(projectsDir, fileName);

  // We write a simple ZIP file header structure or text file fallback
  // Simple Zip structure buffer generator
  const zipBuffer = createZipBuffer(contentMap);
  fs.writeFileSync(filePath, zipBuffer);
  return filePath;
}

// Minimal zip file builder in pure Node JS
function createZipBuffer(filesMap) {
  // filesMap = { 'index.html': 'content...', 'style.css': 'content...' }
  const localHeaders = [];
  const cdHeaders = [];
  let offset = 0;

  for (const [name, content] of Object.entries(filesMap)) {
    const nameBuf = Buffer.from(name);
    const contentBuf = Buffer.from(content);
    const crc = crc32(contentBuf);

    // Local Header
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // General bit flag
    localHeader.writeUInt16LE(0, 8); // Compression method (0 = Store)
    localHeader.writeUInt16LE(0, 10); // Last mod time
    localHeader.writeUInt16LE(0, 12); // Last mod date
    localHeader.writeUInt32LE(crc, 14); // CRC32
    localHeader.writeUInt32LE(contentBuf.length, 18); // Compressed size
    localHeader.writeUInt32LE(contentBuf.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(localHeader, 30);

    // Central Directory Header
    const cdHeader = Buffer.alloc(46 + nameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // CD header signature
    cdHeader.writeUInt16LE(20, 4); // Version made by
    cdHeader.writeUInt16LE(20, 6); // Version needed
    cdHeader.writeUInt16LE(0, 8); // General bit flag
    cdHeader.writeUInt16LE(0, 10); // Compression method
    cdHeader.writeUInt16LE(0, 12); // Last mod time
    cdHeader.writeUInt16LE(0, 14); // Last mod date
    cdHeader.writeUInt32LE(crc, 16); // CRC32
    cdHeader.writeUInt32LE(contentBuf.length, 20); // Compressed size
    cdHeader.writeUInt32LE(contentBuf.length, 24); // Uncompressed size
    cdHeader.writeUInt16LE(nameBuf.length, 28); // Filename length
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // File comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal file attributes
    cdHeader.writeUInt32LE(0, 38); // External file attributes
    cdHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(cdHeader, 46);

    localHeaders.push(localHeader, contentBuf);
    cdHeaders.push(cdHeader);

    offset += localHeader.length + contentBuf.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  cdHeaders.forEach(h => { cdSize += h.length; });

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Disk with start of CD
  eocd.writeUInt16LE(cdHeaders.length, 8); // Entries on disk
  eocd.writeUInt16LE(cdHeaders.length, 10); // Total entries
  eocd.writeUInt32LE(cdSize, 12); // Size of central directory
  eocd.writeUInt32LE(cdOffset, 16); // Offset of start of CD
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...cdHeaders, eocd]);
}

// Simple CRC32 helper
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    for (let j = 0; j < 8; j++) {
      const bit = (byte ^ crc) & 1;
      crc = (crc >>> 1) ^ (bit ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

async function seedInitialData() {
  try {
    // 1. Admin account
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      admin = new Admin({
        username: 'admin',
        email: process.env.ADMIN_PASSWORD_OTP_EMAIL || 'bharathsimhareddyv19@gmail.com',
        name: 'Aarohan Hackathon Director',
        passwordHash
      });
      await admin.save();
      console.log('Default Admin created: username=admin, password=admin123');
    }
    if (admin.username === 'admin' && admin.email === 'admin@aarohan.org') {
      admin.email = process.env.ADMIN_PASSWORD_OTP_EMAIL || 'bharathsimhareddyv19@gmail.com';
      await admin.save();
    }

    // 2. Default Terms
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

    // 3. Default Settings
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

    // 4. Default Rounds
    const countRounds = await Round.countDocuments();
    if (countRounds === 0) {
      const now = new Date();
      const round1 = new Round({
        roundNumber: 1,
        name: 'ROUND 1: DEBUGGING CHALLENGE',
        type: 'DEBUGGING',
        description: 'Fix bugs across HTML, CSS, JavaScript, and React projects locally on your computer.',
        instructions: 'Download the project ZIP file. Extract it to your local workspace. Inspect the code, identify syntax/logic bugs, fix them, and submit your progress for manual evaluation.',
        startAt: now,
        endAt: new Date(now.getTime() + 7200000), // 2 hours
        status: 'ACTIVE',
        maxMarks: 100,
        qualificationCriteria: { minErrorsSolved: 120, minPercentage: 60, minMarks: 60, ruleType: 'OR' },
        active: true
      });

      const round2 = new Round({
        roundNumber: 2,
        name: 'ROUND 2: REACT / GITHUB CHALLENGE',
        type: 'REACT_GITHUB',
        description: 'Build core features and clean architecture in a React repository hosted on GitHub.',
        instructions: 'Clone the assigned GitHub repository or download the source ZIP. Implement required components, handle state, and push your commits or submit repository link.',
        startAt: new Date(now.getTime() + 7200000),
        endAt: new Date(now.getTime() + 14400000),
        status: 'SCHEDULED',
        maxMarks: 100,
        qualificationCriteria: { minErrorsSolved: 0, minPercentage: 70, minMarks: 70, ruleType: 'OR' },
        githubRepoUrl: '',
        active: false
      });

      const round3 = new Round({
        roundNumber: 3,
        name: 'ROUND 3: APPLICATION CHALLENGE',
        type: 'APPLICATION',
        description: 'Design and deploy a full-stack real-world application tackling tribal welfare solutions.',
        instructions: 'Work with your assigned Round 3 team. Build the frontend, backend, and database integration. Submit GitHub link, demo URL, and project summary.',
        startAt: new Date(now.getTime() + 14400000),
        endAt: new Date(now.getTime() + 28800000),
        status: 'SCHEDULED',
        maxMarks: 100,
        qualificationCriteria: { minErrorsSolved: 0, minPercentage: 75, minMarks: 75, ruleType: 'OR' },
        active: false
      });

      await round1.save();
      await round2.save();
      await round3.save();
      console.log('Rounds 1, 2, and 3 initialized.');
    }

    const placeholderRepo = 'https://github.com/aarohan-hackathon/round2-react-starter';
    await Round.updateMany({ githubRepoUrl: placeholderRepo }, { $set: { githubRepoUrl: '' } });
    await Project.updateMany({ githubUrl: placeholderRepo }, { $set: { githubUrl: '' } });

  } catch (error) {
    console.error('Data Seeding Error:', error);
  }
}

async function seedDemoData() {
  // Clear existing and re-seed 5 demo participants, teams, project zip, evaluations
  await Participant.deleteMany({ arohanId: { $regex: /^AIF2600/ } });
  await RoundTeam.deleteMany({});
  await Project.deleteMany({});
  await Evaluation.deleteMany({});
  await Submission.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const demoParticipants = [
    { arohanId: 'AIF260001', pass: 'Ar@26K7p' },
    { arohanId: 'AIF260002', pass: 'Tr#81Lm2' },
    { arohanId: 'AIF260003', pass: 'Ax@92Qw8' },
    { arohanId: 'AIF260004', pass: 'Nx$45Zp1' },
    { arohanId: 'AIF260005', pass: 'Px!67Mw9' }
  ];

  for (const p of demoParticipants) {
    const hash = await bcrypt.hash(p.pass, salt);
    await Participant.create({
      arohanId: p.arohanId,
      passwordHash: hash,
      temporaryPasswordPlain: p.pass,
      status: 'READY',
      termsAccepted: true,
      currentRound: 1
    });
  }

  // Create sample project ZIP file
  const projectZipPath = await createSampleZip('Round1_Debugging_Project.zip', {
    'HTML/index.html': `<!DOCTYPE html><html><head><title>Aarohan Bug Challenge</title></head><body><h1>Welcome Tribal Hackers</h1><p>Bug #1: Fix unclosed tag</p></body></html>`,
    'CSS/style.css': `/* Fix syntax error */ body { font-family: sans-serif; color: #333; }`,
    'JavaScript/app.js': `// Fix calculation bug\nfunction calculateScore(a, b) { return a + b; }\nconsole.log("Aarohan Debugging Challenge Ready");`,
    'React/App.jsx': `import React from 'react'; export default function App() { return <div><h1>React Bug Challenge</h1></div>; }`
  });

  // Save Project model
  const project1 = await Project.create({
    name: 'Round 1 Master Debugging Suite',
    roundNumber: 1,
    description: 'Comprehensive project containing 200 debugging tasks across HTML, CSS, JavaScript, and React.',
    filePath: projectZipPath,
    originalFileName: 'Round1_Debugging_Project.zip',
    fileSize: fs.statSync(projectZipPath).size,
    instructions: '1. Unzip the project.\n2. Open VS Code.\n3. Fix errors in HTML, CSS, JS, React folders.\n4. Save your work locally.',
    totalErrors: 200,
    htmlErrors: 50,
    cssErrors: 50,
    jsErrors: 50,
    reactErrors: 50
  });

  // Create Round 1 Teams
  const team1 = await RoundTeam.create({
    roundNumber: 1,
    teamCode: 'ROUND1-T001',
    participantIds: ['AIF260001', 'AIF260002'],
    projectId: project1._id
  });

  const team2 = await RoundTeam.create({
    roundNumber: 1,
    teamCode: 'ROUND1-T002',
    participantIds: ['AIF260003', 'AIF260004'],
    projectId: project1._id
  });

  const team3 = await RoundTeam.create({
    roundNumber: 1,
    teamCode: 'ROUND1-T003',
    participantIds: ['AIF260005'],
    projectId: project1._id
  });

  // Sample Evaluation for Team 1 (Qualified)
  await Evaluation.create({
    roundNumber: 1,
    teamId: team1._id,
    teamCode: team1.teamCode,
    participantIds: team1.participantIds,
    totalErrors: 200,
    errorsSolved: 137,
    htmlSolved: 35,
    cssSolved: 32,
    jsSolved: 38,
    reactSolved: 32,
    marks: 82,
    maxMarks: 100,
    remarks: 'Excellent performance in JavaScript and HTML debugging!',
    status: 'QUALIFIED',
    evaluatedBy: 'Admin'
  });

  // Update AIF260001 and AIF260002 status to QUALIFIED
  await Participant.updateMany(
    { arohanId: { $in: ['AIF260001', 'AIF260002'] } },
    { status: 'ROUND1_QUALIFIED', currentRound: 2 }
  );

  // Round 2 Project
  const project2ZipPath = await createSampleZip('Round2_React_Starter.zip', {
    'src/App.jsx': `import React from 'react'; export default function App() { return <h2>Round 2 React GitHub Challenge</h2>; }`,
    'package.json': `{"name":"round2-react","version":"1.0.0"}`
  });

  const project2 = await Project.create({
    name: 'Round 2 React E-Governance Portal',
    roundNumber: 2,
    description: 'React state management and API integration challenge.',
    filePath: project2ZipPath,
    originalFileName: 'Round2_React_Starter.zip',
    githubUrl: '',
    instructions: 'Clone repo or download ZIP. Build student registration components.',
    maxTasks: 10
  });

  // Create Round 2 Team with qualified AIF260001 + AIF260005 (Notice team re-shuffling!)
  const team2_1 = await RoundTeam.create({
    roundNumber: 2,
    teamCode: 'ROUND2-T001',
    participantIds: ['AIF260001', 'AIF260005'],
    projectId: project2._id
  });

  await ActivityLog.create({
    actor: 'Admin',
    action: 'DEMO_DATA_SEED',
    details: 'Seeded 5 demo participants, sample rounds, project ZIPs, teams, and evaluations.'
  });

  return {
    participants: demoParticipants,
    round1Teams: [team1.teamCode, team2.teamCode, team3.teamCode],
    round2Team: team2_1.teamCode
  };
}

module.exports = { seedInitialData, seedDemoData };
